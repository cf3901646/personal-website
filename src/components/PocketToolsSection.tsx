import React, { useState } from 'react';

interface ZLibLink {
  domain: string;
  url: string;
  label?: string;
}

interface ZLibGroup {
  id: string;
  title: string;
  hint: string;
  links: ZLibLink[];
}

const ZLIB_GROUPS: ZLibGroup[] = [
  {
    id: 'direct',
    title: '国内直连',
    hint: '打开即用',
    links: [
      { domain: 'z-lib.by', url: 'https://z-lib.by/' },
      { domain: 'zlib.ch', url: 'https://zlib.ch/' },
      { domain: 'zlib.re', url: 'https://zlib.re/' },
      { domain: 'znew.pages.dev', url: 'https://znew.pages.dev/' },
    ],
  },
  {
    id: 'official',
    title: '官方站点',
    hint: '需代理',
    links: [
      { domain: 'singlelogin.re', url: 'https://singlelogin.re/', label: '登录' },
      { domain: 'zh.z-library.sk', url: 'https://zh.z-library.sk/', label: '中文' },
      { domain: 'zh.z-lib.gd', url: 'https://zh.z-lib.gd/', label: '中文' },
      { domain: 'z-lib.fm', url: 'https://z-lib.fm/' },
    ],
  },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 微信等环境可能拒绝 Clipboard API，退回到 execCommand
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }
}

export const PocketToolsSection: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (url: string) => {
    const ok = await copyText(url);
    if (!ok) return;
    setCopied(url);
    window.setTimeout(() => setCopied((cur) => (cur === url ? null : cur)), 1800);
  };

  return (
    <section className="pocket-tools wrap" id="tools" aria-labelledby="tools-title">
      <header className="section-heading reveal">
        <div>
          <p className="eyebrow">03 / Pocket tools</p>
          <h2 id="tools-title">顺手工具，常备身边。</h2>
        </div>
        <p>常用的入口放在这里，点开即用，也可以复制网址。</p>
      </header>

      <div className="zlib reveal">
        <div className="zlib-head">
          <h3>Z-Library</h3>
          <p>找书和论文</p>
        </div>

        <div className="zlib-groups">
          {ZLIB_GROUPS.map((group) => (
            <div className="zlib-group" key={group.id}>
              <h4>
                {group.title}
                <span>{group.hint}</span>
              </h4>
              <ul>
                {group.links.map((link) => (
                  <li className="zlib-row" key={link.url}>
                    <a className="zlib-link" href={link.url} target="_blank" rel="noopener noreferrer nofollow">
                      <span className="zlib-domain">{link.domain}</span>
                      {link.label && <span className="zlib-label">{link.label}</span>}
                      <span className="zlib-arrow" aria-hidden="true">
                        {'↗\uFE0E'}
                      </span>
                      <span className="sr-only">（新窗口）</span>
                    </a>
                    <button
                      type="button"
                      className={`zlib-copy ${copied === link.url ? 'is-copied' : ''}`}
                      onClick={() => handleCopy(link.url)}
                      aria-label={`复制 ${link.domain}`}
                    >
                      {copied === link.url ? '已复制' : '复制'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
