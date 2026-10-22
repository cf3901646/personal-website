/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { SunlitPaperStage } from './components/SunlitPaperStage';
import { WorksSection } from './components/WorksSection';
import { PocketToolsSection } from './components/PocketToolsSection';

export default function App() {
  const [navVisible, setNavVisible] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('js');

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('cf3901646@gmail.com');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      // Fallback if clipboard permission denied
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    }
  };

  return (
    <>
      <svg className="filter-definitions" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id="damaged-type" x="-20%" y="-25%" width="140%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency=".075 .12" numOctaves={2} seed={8} result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale={9} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="pressed-ink" x="-12%" y="-35%" width="124%" height="180%" colorInterpolationFilters="sRGB">
            {/* 1. 外上沿压痕微暗（纸面被铅字压入时的轻微下凹折边） */}
            <feOffset in="SourceAlpha" dx="-0.4" dy="-0.55" result="outer-shift" />
            <feComposite in="outer-shift" in2="SourceAlpha" operator="out" result="outer-edge" />
            <feGaussianBlur in="outer-edge" stdDeviation="0.45" result="outer-soft" />
            <feFlood floodColor="#7c6a52" floodOpacity="0.24" />
            <feComposite in2="outer-soft" operator="in" result="outer-cushion" />

            {/* 2. 字槽下沿斜坡受光棱线（承接左上方日光） */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.35" result="soft-alpha" />
            <feOffset in="soft-alpha" dx="0.48" dy="1.4" result="lower-edge" />
            <feComposite in="lower-edge" in2="SourceAlpha" operator="out" result="rim" />
            <feFlood floodColor="#fffcf0" floodOpacity="0.94" />
            <feComposite in2="rim" operator="in" result="lit-rim" />

            {/* 3. 字槽底面单色半透明压暗（保留底层纸张纤维与光束质感，同时可被上层树影叠底压暗） */}
            <feFlood floodColor="#998669" floodOpacity="0.34" />
            <feComposite in2="SourceAlpha" operator="in" result="cavity-base" />

            {/* 4. 字槽内部漫反射环境光遮蔽（柔和深邃感） */}
            <feOffset in="SourceAlpha" dx="1.35" dy="2.4" result="ao-shift" />
            <feComposite in="SourceAlpha" in2="ao-shift" operator="out" result="ao-edge" />
            <feGaussianBlur in="ao-edge" stdDeviation="1.15" result="ao-soft" />
            <feFlood floodColor="#69563d" floodOpacity="0.42" />
            <feComposite in2="ao-soft" operator="in" result="ao-clipped" />
            <feComposite in="ao-clipped" in2="SourceAlpha" operator="in" result="inner-ao" />

            {/* 5. 字槽上沿刀口背光主内阴影（清晰锐利的凹印深度） */}
            <feOffset in="SourceAlpha" dx="0.62" dy="1.25" result="shifted" />
            <feComposite in="SourceAlpha" in2="shifted" operator="out" result="inset-edge" />
            <feGaussianBlur in="inset-edge" stdDeviation="0.36" result="inset-soft" />
            <feFlood floodColor="#463522" floodOpacity="0.84" />
            <feComposite in2="inset-soft" operator="in" result="inset-raw" />
            <feComposite in="inset-raw" in2="SourceAlpha" operator="in" result="inset-shadow" />

            <feMerge>
              <feMergeNode in="outer-cushion" />
              <feMergeNode in="lit-rim" />
              <feMergeNode in="cavity-base" />
              <feMergeNode in="inner-ao" />
              <feMergeNode in="inset-shadow" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <nav
        className={`site-nav ${navVisible ? 'is-visible' : ''}`}
        aria-label="网站导航"
        inert={!navVisible ? true : undefined}
      >
        <a className="wordmark" href="#top" aria-label="回到首页">
          cf.
        </a>
        <div className="nav-links">
          <a href="#philosophy">理念</a>
          <a href="#works">作品</a>
          <a href="#tools">小工具</a>
          <a href="#contact">联系</a>
        </div>
      </nav>

      <main id="top">
        <SunlitPaperStage onNavVisibilityChange={setNavVisible} />

        <div className="content">
          <section className="manifesto wrap" id="philosophy" aria-labelledby="philosophy-title">
            <h2 id="philosophy-title" className="sr-only">
              设计理念：让工具顺手，让体验从容
            </h2>
            <div className="manifesto-intro reveal">
              <p className="eyebrow">
                Design as a daily practice
                <br />
                关于设计的日常练习
              </p>
              <p className="manifesto-copy">
                我关注日常里那些微小的阻力。
                <br />
                通过设计和工具，试着让复杂的事情变得清楚，让每一次使用<em>少一点负担。</em>
              </p>
            </div>
            <div className="principles">
              <article className="principle reveal">
                <span className="number">01</span>
                <h3>从具体问题出发</h3>
                <p>
                  先理解一件事为什么令人困扰，
                  <br />
                  再决定它应该如何被改变。
                </p>
              </article>
              <article className="principle reveal" style={{ '--delay': '100ms' } as React.CSSProperties}>
                <span className="number">02</span>
                <h3>少做一个决定</h3>
                <p>
                  把思考放进设计过程，
                  <br />
                  把清楚的选择留给使用者。
                </p>
              </article>
              <article className="principle reveal" style={{ '--delay': '200ms' } as React.CSSProperties}>
                <span className="number">03</span>
                <h3>留一点温度</h3>
                <p>
                  在理性的秩序之外，
                  <br />
                  也为直觉、触感和呼吸留下位置。
                </p>
              </article>
            </div>
          </section>

          <WorksSection />

          <PocketToolsSection />

          <footer className="contact wrap" id="contact">
            <div className="reveal">
              <p className="eyebrow">04 / A conversation starts here</p>
              <h2>
                有一个值得
                <br />
                一起做的想法？
              </h2>
              <a className="contact-link" href="mailto:cf3901646@gmail.com">
                cf3901646@gmail.com
              </a>
            </div>
            <div className="colophon">
              <span>cf. / A personal notebook</span>
              <a href="https://github.com/cf3901646" target="_blank" rel="noopener noreferrer">
                {'更多记录，在 GitHub ↗\uFE0E'}
                <span className="sr-only">（新窗口）</span>
              </a>
              <a href="#top">{'回到日光里 ↑\uFE0E'}</a>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
