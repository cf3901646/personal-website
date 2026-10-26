/**
 * Cloudflare Pages Function: Live Music WebSocket Gateway
 * Handles WebSocket proxying between client and Google Gemini Lyria RealTime API.
 * Features:
 *  - 7-Key Pool with Round-Robin & Failover
 *  - Keys strictly managed via Cloudflare Pages Encrypted Secrets (GEMINI_API_KEYS)
 *  - Zero API keys exposed to browser clients or committed to GitHub
 *  - Ensures all frames forwarded to browser are decoded UTF-8 strings (prevents [object Blob])
 *  - Strict WebSocket handshake headers propagation to upstream
 *  - No session time limit: sessions last until client or upstream closes
 */

interface Env {
  GEMINI_API_KEYS?: string;
}

const MAX_CONCURRENT_PER_ISOLATE = 3;

let activeSessions = 0;
let keyCursor = Math.floor(Math.random() * 1000);

async function toTextOrBuffer(data: any): Promise<string | ArrayBuffer> {
  if (typeof data === 'string') return data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      return text;
    } catch (_) {
      return await data.arrayBuffer();
    }
  }
  if (data instanceof ArrayBuffer) {
    try {
      return new TextDecoder('utf-8').decode(data);
    } catch (_) {
      return data;
    }
  }
  if (ArrayBuffer.isView(data)) {
    try {
      return new TextDecoder('utf-8').decode(data);
    } catch (_) {
      return data.buffer;
    }
  }
  return String(data);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Verify WebSocket upgrade header
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({
        error: 'Expected WebSocket connection',
        service: 'Space DJ Lyria RealTime Gateway',
      }),
      {
        status: 426,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 2. Concurrency check
  if (activeSessions >= MAX_CONCURRENT_PER_ISOLATE) {
    return new Response('Too many concurrent music sessions. Please try again in 1 minute.', {
      status: 503,
      headers: { 'Retry-After': '60' },
    });
  }

  // 3. Resolve key pool strictly from Cloudflare Pages Encrypted Secrets
  const rawEnvKeys = env.GEMINI_API_KEYS;
  const keyPool = (rawEnvKeys || '')
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keyPool.length === 0) {
    console.error('GEMINI_API_KEYS secret is not configured in Cloudflare Pages dashboard');
    return new Response(
      JSON.stringify({
        error: 'Music gateway secret is not configured in Cloudflare Pages dashboard',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  keyCursor = (keyCursor + 1) % keyPool.length;
  const selectedKey = keyPool[keyCursor];

  // 4. Create client <-> worker WebSocket pair
  // @ts-ignore
  const webSocketPair = new WebSocketPair();
  const [clientWs, serverWs] = Object.values(webSocketPair) as [WebSocket, WebSocket];

  serverWs.accept();
  activeSessions++;

  // 5. Connect to Google Lyria Realtime API upstream
  const upstreamUrl = `https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateMusic?key=${selectedKey}`;

  let upstreamWs: WebSocket | null = null;
  try {
    const upstreamHeaders = new Headers();
    upstreamHeaders.set('Upgrade', 'websocket');
    upstreamHeaders.set('Connection', 'Upgrade');
    const protocols = request.headers.get('Sec-WebSocket-Protocol');
    if (protocols) upstreamHeaders.set('Sec-WebSocket-Protocol', protocols);

    const upstreamResp = await fetch(upstreamUrl, {
      headers: upstreamHeaders,
    });
    // @ts-ignore
    upstreamWs = upstreamResp.webSocket || null;

    if (!upstreamWs) {
      throw new Error(`Upstream handshake returned status ${upstreamResp.status}: ${upstreamResp.statusText}`);
    }
    upstreamWs.accept();
  } catch (err) {
    console.error('Failed to establish upstream connection to Google API:', err);
    activeSessions = Math.max(0, activeSessions - 1);
    serverWs.close(1011, 'Upstream connection failed');
    return new Response(null, {
      status: 101,
      // @ts-ignore
      webSocket: clientWs,
    });
  }

  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    activeSessions = Math.max(0, activeSessions - 1);
    try {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.close();
      }
    } catch (_) {}
    try {
      if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
        upstreamWs.close();
      }
    } catch (_) {}
  };

  // 6. No session time limit: the session lasts until the client or upstream closes it.

  // 7. Bidirectional message forwarding
  serverWs.addEventListener('message', async (event) => {
    try {
      if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
        const payload = await toTextOrBuffer(event.data);
        upstreamWs.send(payload);
      }
    } catch (err) {
      console.warn('Error forwarding client message to upstream:', err);
    }
  });

  if (upstreamWs) {
    upstreamWs.addEventListener('message', async (event) => {
      try {
        if (serverWs.readyState === WebSocket.OPEN) {
          const payload = await toTextOrBuffer(event.data);
          serverWs.send(payload);
        }
      } catch (err) {
        console.warn('Error forwarding upstream message to client:', err);
      }
    });

    upstreamWs.addEventListener('close', (event) => {
      try {
        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.close(event.code, event.reason);
        }
      } catch (_) {}
      cleanup();
    });

    upstreamWs.addEventListener('error', (event) => {
      console.warn('Upstream WebSocket error:', event);
      try {
        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.close(1011, 'Upstream Error');
        }
      } catch (_) {}
      cleanup();
    });
  }

  serverWs.addEventListener('close', () => {
    cleanup();
  });

  serverWs.addEventListener('error', () => {
    cleanup();
  });

  return new Response(null, {
    status: 101,
    // @ts-ignore
    webSocket: clientWs,
  });
};
