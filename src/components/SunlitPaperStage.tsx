import React, { useEffect, useRef } from 'react';
import { clamp, getSolarConditions, smoothStep } from '../utils/demos';

interface SunlitPaperStageProps {
  onNavVisibilityChange: (visible: boolean) => void;
}

const W = 1376;
const H = 768;

// Inline Worker code for off-main-thread paper texture & 32,000 micro-fibers generation
const PAPER_WORKER_SOURCE = `
function random(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

function noiseField(W, H, cell, rng) {
  const columns = Math.ceil(W / cell) + 2;
  const rows = Math.ceil(H / cell) + 2;
  const values = Float32Array.from({ length: columns * rows }, () => rng() * 2 - 1);
  const invCell = 1 / cell;
  return (x, y) => {
    const gx = x * invCell, gy = y * invCell;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    let u = gx - ix, v = gy - iy;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const i = iy * columns + ix;
    return (values[i] * (1 - u) + values[i + 1] * u) * (1 - v)
      + (values[i + columns] * (1 - u) + values[i + columns + 1] * u) * v;
  };
}

self.onmessage = (e) => {
  const { W, H, paperScale, isMobile } = e.data;
  const pw = Math.round(W * paperScale);
  const ph = Math.round(H * paperScale);
  const offscreen = new OffscreenCanvas(pw, ph);
  const p = offscreen.getContext('2d');
  const pixels = p.createImageData(pw, ph);
  const rng = random(3901646);
  const cloud = noiseField(W, H, 125, rng);
  const pulp = noiseField(W, H, 22, rng);
  const fiber = noiseField(W, H, 3, rng);
  const fineGrain = noiseField(W, H, 1.2, random(802));
  const surfaceRng = random(9046);

  const expLUT = new Float32Array(3000);
  for (let i = 0; i < 3000; i++) {
    const c = i * 0.5;
    expLUT[i] = Math.exp(-Math.pow((c - 650) / 230, 2));
  }

  const invScale = 1 / paperScale;
  for (let py = 0; py < ph; py++) {
    const y = py * invScale;
    const y083 = y * 0.83;
    for (let px = 0; px < pw; px++) {
      const x = px * invScale;
      const cross = x * 0.56 + y083;
      const beam = expLUT[Math.min(2999, Math.max(0, (cross * 2) | 0))];
      const ribbons = Math.sin(cross / 21 + cloud(x, y) * 0.8 + x / 650) * 5.5
        + Math.sin(cross / 43 + x / 300) * 4;
      const light = beam * (28 + ribbons);
      const relief = (fiber(x, y) - fiber(x + 0.45, y + 0.35)) * 4.8
        + (fineGrain(x, y) - fineGrain(x + 0.24, y + 0.18)) * 4.2;
      const tooth = (surfaceRng() + surfaceRng() + surfaceRng() - 1.5) * 2.2;
      const shadeVal = relief + tooth + pulp(x, y) * 0.7;
      const i = (py * pw + px) * 4;
      pixels.data[i] = 219 + light + shadeVal;
      pixels.data[i + 1] = 213 + light + shadeVal;
      pixels.data[i + 2] = 196 + light * 0.94 + shadeVal;
      pixels.data[i + 3] = 255;
    }
  }
  p.putImageData(pixels, 0, 0);

  p.setTransform(paperScale, 0, 0, paperScale, 0, 0);
  p.lineCap = 'round';
  const fleckRng = random(160);
  const fleckCount = isMobile ? 18000 : 34000;
  for (let i = 0; i < fleckCount; i++) {
    const x = fleckRng() * W, y = fleckRng() * H;
    const length = 0.45 + fleckRng() * 1.7;
    const angle = (fleckRng() - 0.5) * Math.PI;
    const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
    const bend = (fleckRng() - 0.5) * 0.35;
    p.lineWidth = 0.16 + fleckRng() * 0.2;
    p.strokeStyle = 'rgba(164,149,119,.028)';
    p.beginPath(); p.moveTo(x, y);
    p.quadraticCurveTo(x + dx * 0.5, y + dy * 0.5 + bend, x + dx, y + dy); p.stroke();
    p.strokeStyle = 'rgba(255,253,239,.17)';
    p.beginPath(); p.moveTo(x, y - 0.22);
    p.quadraticCurveTo(x + dx * 0.5, y + dy * 0.5 + bend - 0.22, x + dx, y + dy - 0.22); p.stroke();
  }

  const bitmap = offscreen.transferToImageBitmap();
  self.postMessage({ bitmap }, [bitmap]);
};
`;

function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function createLayer(w = W, h = H): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export const SunlitPaperStage: React.FC<SunlitPaperStageProps> = ({ onNavVisibilityChange }) => {
  const openingRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const surfaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const shadowCanvasRef = useRef<HTMLCanvasElement>(null);
  const dustCanvasRef = useRef<HTMLCanvasElement>(null);
  const lightBloomRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const invitationRef = useRef<HTMLAnchorElement>(null);
  const navCallbackRef = useRef(onNavVisibilityChange);
  navCallbackRef.current = onNavVisibilityChange;

  useEffect(() => {
    const opening = openingRef.current;
    const paperEl = paperRef.current;
    const canvas = surfaceCanvasRef.current;
    const shadowCanvas = shadowCanvasRef.current;
    const dustCanvas = dustCanvasRef.current;
    const lightBloom = lightBloomRef.current;
    const titleEl = titleRef.current;
    const invitationEl = invitationRef.current;
    if (!opening || !paperEl || !canvas || !shadowCanvas || !dustCanvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const shadowContext = shadowCanvas.getContext('2d');
    const dustContext = dustCanvas.getContext('2d');
    if (!ctx || !shadowContext || !dustContext) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let solar = getSolarConditions();
    let shadowAlphaSetting = solar.shadowAlpha;

    function applySolarTheme(s: ReturnType<typeof getSolarConditions>) {
      if (lightBloom) lightBloom.style.background = s.bloomColor;
      if (paperEl) paperEl.style.backgroundColor = s.paperTone;
      shadowAlphaSetting = s.shadowAlpha;
    }
    applySolarTheme(solar);

    let paperSource: CanvasImageSource | null = null;
    let sceneComposite: HTMLCanvasElement | null = null;
    let clusterA: HTMLCanvasElement | null = null;
    let clusterB: HTMLCanvasElement | null = null;
    let clusterC: HTMLCanvasElement | null = null;
    let distantTrunks: HTMLCanvasElement | null = null;
    let dustCanvasLayer: HTMLCanvasElement | null = null;
    let dustContextLayer: CanvasRenderingContext2D | null = null;
    let moteSprite: HTMLCanvasElement | null = null;
    let motesList: {
      x: number;
      y: number;
      r: number;
      speedY: number;
      driftPhase: number;
      driftFreq: number;
      driftAmp: number;
      alpha: number;
    }[] = [];

    let renderMetrics = { dpr: 1, scale: 1, left: 0, top: 0, width: 0, height: 0 };

    function fastInitialPaint() {
      const bounds = paperEl!.getBoundingClientRect();
      const width = bounds.width || window.innerWidth;
      const height = bounds.height || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx!.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, '#f2ece0');
      g.addColorStop(0.48, '#f7f4ea');
      g.addColorStop(1, '#eee7da');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, width, height);
    }
    fastInitialPaint();

    function updateCanvasMetrics() {
      const bounds = paperEl!.getBoundingClientRect();
      const width = bounds.width || window.innerWidth;
      const height = bounds.height || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.max(width / W, height / H);
      const left = (width - W * scale) / 2;
      const top = (height - H * scale) / 2;
      renderMetrics = { dpr, scale, left, top, width, height };

      [canvas!, shadowCanvas!, dustCanvas!].forEach((c) => {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      });
      [ctx!, shadowContext!, dustContext!].forEach((c) => {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      });

      if (paperSource) {
        ctx!.drawImage(paperSource, left, top, W * scale, H * scale);
      } else {
        const g = ctx!.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#f2ece0');
        g.addColorStop(0.48, '#f7f4ea');
        g.addColorStop(1, '#eee7da');
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, width, height);
      }
    }

    // Pre-bake tree shadow clusters & glowing mote sprite
    function initShadowAndMoteLayers() {
      const branches: [number, number, number, number, number][] = [
        [1410, -80, 860, 520, 22],
        [1230, -105, 720, 490, 22],
        [1110, -120, 520, 485, 20],
        [1520, 40, 1060, 500, 19],
        [1310, -120, 890, 410, 20],
        [1480, -60, 990, 430, 19],
      ];

      function renderCluster(branchIndices: number[], seed: number) {
        const raw = createLayer();
        const s = raw.getContext('2d')!;
        const leavesRng = random(seed);

        function leaf(x: number, y: number, length: number, width: number, angle: number, opacity: number) {
          s.save();
          s.translate(x, y);
          s.rotate(angle);
          s.fillStyle = `rgba(66,68,48,${opacity})`;
          s.beginPath();
          s.moveTo(0, 0);
          s.bezierCurveTo(length * 0.28, -width * 0.7, length * 0.72, -width * 0.65, length, 0);
          s.bezierCurveTo(length * 0.68, width * 0.42, length * 0.22, width * 0.7, 0, 0);
          s.fill();
          s.restore();
        }

        branchIndices.forEach((idx) => {
          const [x0, y0, x1, y1, count] = branches[idx];
          s.beginPath();
          s.moveTo(x0, y0);
          s.quadraticCurveTo(x0 - 150, y1 * 0.56, x1, y1);
          s.strokeStyle = 'rgba(64,66,47,.22)';
          s.lineWidth = 9;
          s.lineCap = 'round';
          s.stroke();
          for (let i = 0; i < count; i++) {
            const t = (i + 0.3 + leavesRng() * 0.6) / count;
            const q = 1 - t;
            const x = q * q * x0 + 2 * q * t * (x0 - 150) + t * t * x1;
            const y = q * q * y0 + 2 * q * t * (y1 * 0.56) + t * t * y1;
            const side = i % 2 === 0 ? 1 : -1;
            const angle = side > 0 ? -0.92 + leavesRng() * 0.5 : 2.28 + leavesRng() * 0.45;
            leaf(
              x + (leavesRng() - 0.5) * 40,
              y,
              65 + leavesRng() * 150,
              12 + leavesRng() * 26,
              angle,
              (0.19 + leavesRng() * 0.24) * (1 - t * 0.36)
            );
          }
        });

        const blurred = createLayer();
        const bc = blurred.getContext('2d')!;
        bc.filter = 'blur(7px)';
        bc.drawImage(raw, 0, 0);
        return blurred;
      }

      clusterA = renderCluster([0, 3], 27);
      clusterB = renderCluster([1, 4], 42);
      clusterC = renderCluster([2, 5], 88);

      const distantLayer = createLayer();
      const dc = distantLayer.getContext('2d')!;
      dc.filter = 'blur(19px)';
      dc.lineCap = 'round';
      const distant: [number, number, number, number, number, number, number, number][] = [
        [-90, 775, 370, 625, 790, 180, 28, 0.2],
        [90, 860, 490, 555, 1010, 125, 30, 0.24],
        [420, 875, 695, 615, 1240, 205, 36, 0.25],
        [640, 900, 860, 610, 1300, 400, 25, 0.16],
        [130, 785, 300, 670, 380, 580, 55, 0.11],
      ];
      for (const [x, y, cx, cy, ex, ey, width, alpha] of distant) {
        dc.strokeStyle = `rgba(92,88,64,${alpha})`;
        dc.lineWidth = width;
        dc.beginPath();
        dc.moveTo(x, y);
        dc.quadraticCurveTo(cx, cy, ex, ey);
        dc.stroke();
      }
      distantTrunks = distantLayer;

      // Pre-bake glowing dust mote sprite (eliminates per-frame shadowBlur in 60fps loop)
      const sprite = createLayer(24, 24);
      const spCtx = sprite.getContext('2d')!;
      spCtx.shadowColor = '#fff5d0';
      spCtx.shadowBlur = 4;
      spCtx.fillStyle = 'rgba(255,244,195,1)';
      spCtx.beginPath();
      spCtx.ellipse(12, 12, 3, 2.15, -0.5, 0, Math.PI * 2);
      spCtx.fill();
      moteSprite = sprite;

      dustCanvasLayer = createLayer();
      dustContextLayer = dustCanvasLayer.getContext('2d');
      motesList = Array.from({ length: 26 }, (_, i) => {
        const drng = random(18 + i * 17);
        return {
          x: 180 + drng() * 450,
          y: 110 + drng() * 520,
          r: 0.45 + drng() * 1.45,
          speedY: 0.12 + drng() * 0.18,
          driftPhase: drng() * Math.PI * 2,
          driftFreq: 0.0008 + drng() * 0.0012,
          driftAmp: 3 + drng() * 6,
          alpha: 0.3 + drng() * 0.45,
        };
      });

      sceneComposite = createLayer();
      updateCanvasMetrics();
      startAnimation();
    }

    // Generate paper grain in Web Worker (zero main-thread blocking)
    let worker: Worker | null = null;
    const isMobile = window.innerWidth <= 768;
    const paperScale = isMobile ? 1.15 : 1.45;

    if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
      try {
        const blob = new Blob([PAPER_WORKER_SOURCE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        worker = new Worker(url);
        worker.onmessage = (e) => {
          if (e.data && e.data.bitmap) {
            paperSource = e.data.bitmap;
            const { left, top, scale } = renderMetrics;
            if (paperSource) {
              ctx.drawImage(paperSource, left, top, W * scale, H * scale);
            }
          }
          URL.revokeObjectURL(url);
          worker?.terminate();
          worker = null;
        };
        worker.postMessage({ W, H, paperScale, isMobile });
      } catch {
        // Fallback handled if worker creation fails
      }
    }

    let animRunning = false;
    let animFrameId: number | null = null;
    let lastSolarCheck = 0;

    function renderFrame(time: number) {
      if (!clusterA || !clusterB || !clusterC || !distantTrunks || !dustCanvasLayer || !dustContextLayer || !sceneComposite) {
        return;
      }

      if (time - lastSolarCheck > 20000) {
        lastSolarCheck = time;
        solar = getSolarConditions();
        applySolarTheme(solar);
      }

      const sc = sceneComposite.getContext('2d')!;
      sc.clearRect(0, 0, W, H);

      sc.save();
      sc.globalAlpha = shadowAlphaSetting;
      sc.translate(W * 0.5, H * 0.85);
      sc.rotate(Math.sin(time * 0.00025) * 0.002);
      sc.translate(-W * 0.5, -H * 0.85);
      sc.drawImage(distantTrunks, 0, 0);
      sc.restore();

      sc.save();
      sc.globalAlpha = shadowAlphaSetting;
      sc.translate(solar.shadowX, solar.shadowY);
      sc.scale(solar.shadowScale, solar.shadowScale);

      const angleA = Math.sin(time * 0.00042) * 0.008 + Math.sin(time * 0.00095 + 1.2) * 0.004;
      sc.save();
      sc.translate(1460, -20);
      sc.rotate(angleA);
      sc.translate(-1460, 20);
      sc.drawImage(clusterA, 0, 0);
      sc.restore();

      const angleB = Math.sin(time * 0.00058 + 0.8) * 0.014 + Math.sin(time * 0.00125 + 2.4) * 0.007;
      sc.save();
      sc.translate(1270, -110);
      sc.rotate(angleB);
      sc.translate(-1270, 110);
      sc.drawImage(clusterB, 0, 0);
      sc.restore();

      const angleC = Math.sin(time * 0.00072 + 1.9) * 0.019 + Math.sin(time * 0.00155 + 0.5) * 0.009;
      sc.save();
      sc.translate(1300, -90);
      sc.rotate(angleC);
      sc.translate(-1300, 90);
      sc.drawImage(clusterC, 0, 0);
      sc.restore();

      sc.restore();

      const { left, top, scale } = renderMetrics;
      shadowContext!.clearRect(0, 0, shadowCanvas!.width, shadowCanvas!.height);
      shadowContext!.drawImage(sceneComposite, left, top, W * scale, H * scale);

      // Fast pre-baked sprite rendering for floating dust motes
      dustContextLayer.clearRect(0, 0, W, H);
      if (moteSprite) {
        for (let i = 0; i < motesList.length; i++) {
          const m = motesList[i];
          m.y -= m.speedY;
          if (m.y < 85) m.y = 650;
          const curX = m.x + Math.sin(time * m.driftFreq + m.driftPhase) * m.driftAmp;
          const drawSize = (m.r / 3) * 24;
          dustContextLayer.globalAlpha = m.alpha;
          dustContextLayer.drawImage(moteSprite, curX - drawSize * 0.5, m.y - drawSize * 0.5, drawSize, drawSize);
        }
        dustContextLayer.globalAlpha = 1;
      }

      dustContext!.clearRect(0, 0, dustCanvas!.width, dustCanvas!.height);
      dustContext!.drawImage(dustCanvasLayer, left, top, W * scale, H * scale);
    }

    let lastRenderTime = 0;
    const FRAME_INTERVAL = 1000 / 60; // 60 FPS: 1:1 match with 60Hz displays, 1:2 on 120Hz ProMotion, zero cadence jitter

    function loop(now: number) {
      if (!animRunning) return;
      const delta = now - lastRenderTime;
      // 1.8ms tolerance to prevent dropping to 30fps when 60Hz timestamps jitter between 16.3ms and 16.8ms
      if (delta >= FRAME_INTERVAL - 1.8) {
        renderFrame(now);
        lastRenderTime = now - (delta % FRAME_INTERVAL);
      }
      animFrameId = requestAnimationFrame(loop);
    }

    function startAnimation() {
      if (motion.matches) {
        renderFrame(performance.now());
        return;
      }
      if (!animRunning) {
        animRunning = true;
        lastRenderTime = performance.now();
        animFrameId = requestAnimationFrame(loop);
      }
    }

    function stopAnimation() {
      animRunning = false;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    }

    // Scroll progress & parallax variables for the opening stage
    let travel = 1;
    let stageHeight = window.innerHeight;
    let scrollFrame = 0;
    let lastProgress = -1;
    let navVisible = false;

    const setVar = (name: string, val: string | number) => paperEl.style.setProperty(name, String(val));

    function updateOpeningScroll() {
      scrollFrame = 0;
      stageHeight = paperEl!.offsetHeight || window.innerHeight;
      travel = Math.max(1, opening!.offsetHeight - stageHeight);
      const y = Math.max(0, window.scrollY);
      const progress = clamp(y / travel, 0, 1);
      const depth = motion.matches ? 0 : progress;

      if (progress !== lastProgress) {
        setVar('--scene-opacity', 1 - smoothStep(0.12, 0.97, progress));
        setVar('--shadow-opacity', 1 - smoothStep(0.04, 0.77, progress));
        setVar('--dust-opacity', 1 - smoothStep(0.03, 0.49, progress));
        setVar('--paper-y', `${depth * stageHeight * 0.018}px`);
        setVar('--paper-scale', 1 + depth * 0.075);
        setVar('--shadow-x', `${depth * -30}px`);
        setVar('--shadow-y', `${depth * -105}px`);
        setVar('--shadow-scale', 1 + depth * 0.17);
        setVar('--dust-y', `${depth * -175}px`);
        setVar('--title-y', `${depth * -135}px`);
        setVar('--title-opacity', 1 - smoothStep(0.06, 0.48, progress));
        setVar('--hint-opacity', 1 - smoothStep(0, 0.14, progress));
        setVar('--wash-front', `${160 - smoothStep(0.1, 0.99, progress) * 215}%`);
        setVar('--bloom-opacity', Math.sin(progress * Math.PI) * 0.6);
        setVar('--bloom-y', `${(1 - progress) * 80}px`);
        setVar('--chapter-opacity', smoothStep(0.34, 0.82, progress));
        setVar('--chapter-y', `${(1 - smoothStep(0.3, 0.95, progress)) * 70}px`);
        setVar('--chapter-line', smoothStep(0.65, 1, progress));

        if (titleEl) {
          titleEl.inert = progress > 0.47;
          titleEl.setAttribute('aria-hidden', String(progress > 0.47));
        }
        if (invitationEl) {
          invitationEl.inert = progress > 0.13;
          invitationEl.setAttribute('aria-hidden', String(progress > 0.13));
        }
        lastProgress = progress;
      }

      const showNav = progress > 0.76;
      if (showNav !== navVisible) {
        navVisible = showNav;
        navCallbackRef.current(showNav);
      }

      // Smart CPU power-saving pause when scrolled past hero
      const scrolledPast = y > window.innerHeight * 1.5;
      if (document.hidden || scrolledPast) {
        stopAnimation();
      } else {
        startAnimation();
      }
    }

    function requestScrollUpdate() {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateOpeningScroll);
    }

    function measureOpening() {
      document.documentElement.classList.add('js');
      stageHeight = paperEl!.offsetHeight || window.innerHeight;
      travel = Math.max(1, opening!.offsetHeight - stageHeight);
      lastProgress = -1;
      updateCanvasMetrics();
      if (!animRunning) renderFrame(performance.now());
      requestScrollUpdate();
    }

    const handleVisibility = () => {
      if (document.hidden || window.scrollY > window.innerHeight * 1.5) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    const idleTimer = setTimeout(initShadowAndMoteLayers, 16);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', measureOpening, { passive: true });
    motion.addEventListener('change', measureOpening);
    measureOpening();

    return () => {
      clearTimeout(idleTimer);
      stopAnimation();
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      worker?.terminate();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('scroll', requestScrollUpdate);
      window.removeEventListener('resize', measureOpening);
      motion.removeEventListener('change', measureOpening);
    };
  }, []);

  return (
    <section className="opening" ref={openingRef} aria-label="日光下的凹印纸面">
      <div className="paper" ref={paperRef}>
        <canvas id="surface" ref={surfaceCanvasRef} aria-hidden="true" />
        <canvas id="shadows" ref={shadowCanvasRef} aria-hidden="true" />
        <canvas id="motes" ref={dustCanvasRef} aria-hidden="true" />
        <div className="light-bloom" ref={lightBloomRef} aria-hidden="true" />
        <div className="paper-to-color" aria-hidden="true" />
        <h1 className="hero-title" ref={titleRef}>
          <a
            className="letterpress"
            href="#contact"
            aria-label="Charlie Freeman — 跳转至联系与交流"
          >
            Charlie Freeman
          </a>
        </h1>
        <a className="scroll-invitation" ref={invitationRef} href="#philosophy">
          向下，慢慢展开
        </a>
        <div className="threshold" aria-hidden="true">
          <div className="threshold-inner">
            <p className="eyebrow">01 / A way of seeing</p>
            <h2>
              让工具顺手，
              <br />
              <span>让体验从容。</span>
            </h2>
            <div className="chapter-line" />
            <p className="aside">从日常的观察，到恰到好处的设计。</p>
          </div>
        </div>
      </div>
    </section>
  );
};
