import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Search,
  Globe,
  Radio,
  Sparkles,
  Lock,
} from 'lucide-react';

interface ZLibEntry {
  id: string;
  name: string;
  url: string;
  displayUrl: string;
  category: 'mirror' | 'official' | 'emergency';
  status: 'direct' | 'proxy' | 'tor';
  statusLabel: string;
  note: string;
  recommended?: boolean;
}

const ZLIB_ENTRIES: ZLibEntry[] = [
  // 国内免梯 / 重定向镜像
  {
    id: 'mirror-by',
    name: '镜像入口 1 · 自动重定向',
    url: 'https://z-lib.by/',
    displayUrl: 'z-lib.by',
    category: 'mirror',
    status: 'direct',
    statusLabel: '国内直连',
    note: '目前稳定，访问后将自动分配可用重定向节点',
    recommended: true,
  },
  {
    id: 'mirror-ch',
    name: '镜像入口 2 · 自动重定向',
    url: 'https://zlib.ch/',
    displayUrl: 'zlib.ch',
    category: 'mirror',
    status: 'direct',
    statusLabel: '国内直连',
    note: '瑞士域名通道，适合国内网络环境秒级跳转',
    recommended: true,
  },
  {
    id: 'mirror-re',
    name: '镜像入口 3 · 极速镜像',
    url: 'https://zlib.re/',
    displayUrl: 'zlib.re',
    category: 'mirror',
    status: 'direct',
    statusLabel: '国内直连',
    note: '实时可用镜像，响应迅速',
  },
  {
    id: 'mirror-pages',
    name: '国内直达 · Cloudflare 实时同步',
    url: 'https://znew.pages.dev/',
    displayUrl: 'znew.pages.dev',
    category: 'mirror',
    status: 'direct',
    statusLabel: '边缘同步',
    note: 'Cloudflare Pages 托管的入口导航，长期防失联',
  },

  // 官方主站 (需代理)
  {
    id: 'official-singlelogin',
    name: '官方单点登录主站 · SingleLogin',
    url: 'https://singlelogin.re/',
    displayUrl: 'singlelogin.re',
    category: 'official',
    status: 'proxy',
    statusLabel: '需代理',
    note: '官方账号登录枢纽，登录后系统会自动派发个人独占私有二级域名',
    recommended: true,
  },
  {
    id: 'official-sk',
    name: '官方主站 · 中文站点',
    url: 'https://zh.z-library.sk/',
    displayUrl: 'zh.z-library.sk',
    category: 'official',
    status: 'proxy',
    statusLabel: '需代理',
    note: '官方斯洛伐克节点，中文界面完整，书目搜索全面',
  },
  {
    id: 'official-gd',
    name: '官方备用主站 · zh.z-lib.gd',
    url: 'https://zh.z-lib.gd/',
    displayUrl: 'zh.z-lib.gd',
    category: 'official',
    status: 'proxy',
    statusLabel: '需代理',
    note: '官方格林纳达节点，主站受阻时的优先备用通道',
  },
  {
    id: 'official-fm',
    name: '官方国际主站 · z-lib.fm',
    url: 'https://z-lib.fm/',
    displayUrl: 'z-lib.fm',
    category: 'official',
    status: 'proxy',
    statusLabel: '需代理',
    note: '官方密克罗尼西亚主站，与全球书库实时互联',
  },

  // 暗网 / 应急
  {
    id: 'tor-onion',
    name: 'Tor 官方暗网主站 · 终极防封锁',
    url: 'http://zlibrary24tuxziyiyfr7zd46ytefdqbqd2axkmxmfd3nooeqmfdgahd.onion/',
    displayUrl: 'zlibrary24...gahd.onion',
    category: 'emergency',
    status: 'tor',
    statusLabel: 'Tor 专用',
    note: '需使用洋葱浏览器（Tor Browser）访问，任何网络封锁下的永久有效节点',
  },
  {
    id: 'telegram-channel',
    name: 'Telegram 官方渠道与 Bot 指引',
    url: 'https://t.me/zlibrary_official',
    displayUrl: 't.me/zlibrary_official',
    category: 'emergency',
    status: 'proxy',
    statusLabel: '需代理',
    note: '官方发布频道，可获取绑定个人专属 Bot 实现免网页直接查书搜书',
  },
];

type CategoryFilter = 'all' | 'mirror' | 'official' | 'emergency';

export const PocketToolsSection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return ZLIB_ENTRIES.filter((entry) => {
      const matchCategory = activeFilter === 'all' || entry.category === activeFilter;
      const matchKeyword =
        !searchKeyword.trim() ||
        entry.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        entry.displayUrl.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        entry.note.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchCategory && matchKeyword;
    });
  }, [activeFilter, searchKeyword]);

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <section className="pocket-tools wrap" id="tools" aria-labelledby="tools-title">
      <header className="section-heading reveal">
        <div>
          <p className="eyebrow">03 / Useful Pocket Tools & Gateways</p>
          <h2 id="tools-title">顺手工具，常备身边。</h2>
        </div>
        <p>
          收录稳定实用的知识镜像与日常工具通道。
          <br />
          省去反复寻找的时间，点击直达或一键复制。
        </p>
      </header>

      <div className="tools-card-container reveal">
        {/* Tool Card 01: Z-Library Knowledge Gateway */}
        <div className="tool-card">
          <div className="tool-card-header">
            <div className="tool-title-group">
              <span className="tool-badge-icon">
                <BookOpen size={20} aria-hidden="true" />
              </span>
              <div>
                <div className="tool-header-title">
                  <h3>Z-Library 镜像与官方入口导航</h3>
                  <span className="verified-pill">
                    <Sparkles size={12} aria-hidden="true" /> 2026 稳定节点
                  </span>
                </div>
                <p className="tool-subdesc">
                  涵盖 23,000,000+ 册书籍与 84,000,000+ 学术文献，提供国内直连重定向、官方登录及 Tor 防封锁通道。
                </p>
              </div>
            </div>

            {/* Quick search input */}
            <div className="tool-search-box">
              <Search size={15} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="搜索入口或域名..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                aria-label="搜索 Z-Library 入口或域名"
              />
              {searchKeyword && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchKeyword('')}
                  aria-label="清空搜索"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="tool-filter-tabs" role="tablist" aria-label="Z-Library 入口分类筛选">
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'all'}
              className={`filter-tab ${activeFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              全部通道 ({ZLIB_ENTRIES.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'mirror'}
              className={`filter-tab ${activeFilter === 'mirror' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('mirror')}
            >
              <Globe size={13} aria-hidden="true" /> 国内直连镜像 (4)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'official'}
              className={`filter-tab ${activeFilter === 'official' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('official')}
            >
              <Radio size={13} aria-hidden="true" /> 官方主站·需代理 (4)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'emergency'}
              className={`filter-tab ${activeFilter === 'emergency' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('emergency')}
            >
              <Lock size={13} aria-hidden="true" /> 暗网与备用 (2)
            </button>
          </div>

          {/* Links Grid */}
          <div className="tool-entries-grid">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="entry-item">
                <div className="entry-main">
                  <div className="entry-header">
                    <span className="entry-name">{entry.name}</span>
                    {entry.recommended && <span className="entry-tag-rec">推荐</span>}
                    <span className={`entry-status-tag status-${entry.status}`}>
                      {entry.statusLabel}
                    </span>
                  </div>
                  <div className="entry-domain">{entry.displayUrl}</div>
                  <p className="entry-note">{entry.note}</p>
                </div>

                <div className="entry-actions">
                  <button
                    type="button"
                    className="action-btn action-copy"
                    onClick={() => handleCopy(entry.id, entry.url)}
                    aria-label={`复制 ${entry.name} 链接`}
                  >
                    {copiedId === entry.id ? (
                      <>
                        <Check size={14} aria-hidden="true" /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy size={14} aria-hidden="true" /> 复制
                      </>
                    )}
                  </button>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="action-btn action-visit"
                  >
                    访问 <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}

            {filteredEntries.length === 0 && (
              <div className="empty-filter-state">
                <p>未找到匹配的入口，请尝试不同的关键词。</p>
              </div>
            )}
          </div>

          {/* Anti-Scam Security Notice Banner */}
          <div className="tool-security-alert">
            <div className="alert-icon">
              <ShieldAlert size={20} aria-hidden="true" />
            </div>
            <div className="alert-content">
              <strong>⚠️ 防骗避坑提醒与官方规则：</strong>
              <p>
                1. <strong>官方绝不在下载前收费</strong>：网上存在大量假冒山寨站（如 <code>z-library.is</code>、<code>z-library.to</code>、<code>z-lib.io</code> 等），任何要求先充值、开会员才能下载的站点均为仿冒钓鱼站，切勿付款。<br />
                2. <strong>个人独占域名机制</strong>：建议先在官方主站（如 <code>singlelogin.re</code>）注册/登录个人账号，登录后系统会自动分发专属私有域名，长期免受封锁干扰。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
