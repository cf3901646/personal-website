import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildSplineCurve,
  clamp,
  computeCvStateFromProgress,
  computeRestoreFromProgress,
  computeTrackFill,
  computeWeatherHourFromProgress,
  CV_PRESETS,
  CV_RANGES,
  CvPresetKey,
  CvTypographyState,
  easeInOutCubic,
  formatHourToTime,
  INDOOR_TEMPS,
  OUTDOOR_TEMPS,
  sampleTemperature,
  weatherX,
  weatherY,
} from '../utils/demos';

export const WorksSection: React.FC = () => {
  // 1. EasyCV State (Bidirectional: Scroll + Direct Click/Drag)
  const [cvState, setCvState] = useState<CvTypographyState>(() => computeCvStateFromProgress(0));
  const [cvManual, setCvManual] = useState(false);
  const cvManualRef = useRef(false);
  cvManualRef.current = cvManual;

  // 2. AITextRestorer State (Bidirectional: Scroll + Stage Drag / Slider Drag)
  const [restorePct, setRestorePct] = useState<number>(50);
  const [restoreManual, setRestoreManual] = useState(false);
  const restoreManualRef = useRef(false);
  restoreManualRef.current = restoreManual;

  // 3. Thermal Weather State (Bidirectional: Scroll + Chart Scrub / Slider Drag)
  const [weatherHour, setWeatherHour] = useState<number>(14);
  const [weatherManual, setWeatherManual] = useState(false);
  const weatherManualRef = useRef(false);
  weatherManualRef.current = weatherManual;

  const cvScrollRef = useRef<HTMLDivElement>(null);
  const cvPinRef = useRef<HTMLDivElement>(null);
  const restoreScrollRef = useRef<HTMLDivElement>(null);
  const restorePinRef = useRef<HTMLDivElement>(null);
  const weatherScrollRef = useRef<HTMLDivElement>(null);
  const weatherPinRef = useRef<HTMLDivElement>(null);

  const restoreStageRef = useRef<HTMLDivElement>(null);
  const weatherChartRef = useRef<SVGSVGElement>(null);

  // Direct DOM Refs for 0-VDOM scroll updates (sub-millisecond high-speed animation)
  const cvResumeSheetRef = useRef<HTMLDivElement>(null);
  const cvPhaseRef = useRef<HTMLSpanElement>(null);
  const cvFontValRef = useRef<HTMLSpanElement>(null);
  const cvFontTrackRef = useRef<HTMLDivElement>(null);
  const cvFontInputRef = useRef<HTMLInputElement>(null);
  const cvLineValRef = useRef<HTMLSpanElement>(null);
  const cvLineTrackRef = useRef<HTMLDivElement>(null);
  const cvLineInputRef = useRef<HTMLInputElement>(null);
  const cvGapValRef = useRef<HTMLSpanElement>(null);
  const cvGapTrackRef = useRef<HTMLDivElement>(null);
  const cvGapInputRef = useRef<HTMLInputElement>(null);
  const cvMarginValRef = useRef<HTMLSpanElement>(null);
  const cvMarginTrackRef = useRef<HTMLDivElement>(null);
  const cvMarginInputRef = useRef<HTMLInputElement>(null);
  const cvPresetBtnsRef = useRef<HTMLDivElement>(null);

  const restoreVisualRef = useRef<HTMLDivElement>(null);
  const restoreBeforeLabelRef = useRef<HTMLSpanElement>(null);
  const restoreAfterLabelRef = useRef<HTMLSpanElement>(null);
  const restoreValRef = useRef<HTMLSpanElement>(null);
  const restoreTrackRef = useRef<HTMLDivElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const weatherTimeRef = useRef<HTMLTimeElement>(null);
  const indoorValRef = useRef<HTMLOutputElement>(null);
  const outdoorValRef = useRef<HTMLOutputElement>(null);
  const weatherMarkerRef = useRef<SVGLineElement>(null);
  const outdoorPointRef = useRef<SVGCircleElement>(null);
  const indoorPointRef = useRef<SVGCircleElement>(null);
  const weatherTrackRef = useRef<HTMLDivElement>(null);
  const weatherInputRef = useRef<HTMLInputElement>(null);

  const requestUpdateRef = useRef<() => void>(() => {});

  const indoorPath = useMemo(() => buildSplineCurve(INDOOR_TEMPS), []);
  const outdoorPath = useMemo(() => buildSplineCurve(OUTDOOR_TEMPS), []);
  const outdoorAreaPath = useMemo(() => `${outdoorPath} L392,120 L8,120 Z`, [outdoorPath]);

  // Direct DOM applicators (bypasses React 19 VDOM Diffing during scrolling)
  const applyCvDom = useCallback((s: CvTypographyState) => {
    if (cvResumeSheetRef.current) {
      const el = cvResumeSheetRef.current;
      el.style.setProperty('--cv-font', `${s.font.toFixed(2)}px`);
      el.style.setProperty('--cv-line', s.line.toFixed(2));
      el.style.setProperty('--cv-gap', `${s.gap.toFixed(2)}px`);
      el.style.setProperty('--cv-margin', `${s.margin.toFixed(2)}px`);
    }
    if (cvPhaseRef.current) {
      cvPhaseRef.current.textContent = CV_PRESETS[s.preset].label;
    }
    if (cvFontValRef.current) cvFontValRef.current.textContent = `${Number(s.font.toFixed(1))} px`;
    if (cvFontTrackRef.current) {
      const fill = computeTrackFill(s.font, CV_RANGES[0][0], CV_RANGES[0][1]);
      cvFontTrackRef.current.style.setProperty('--range-fill', `${fill}%`);
    }
    if (cvFontInputRef.current) cvFontInputRef.current.value = String(s.font);

    if (cvLineValRef.current) cvLineValRef.current.textContent = s.line.toFixed(2);
    if (cvLineTrackRef.current) {
      const fill = computeTrackFill(s.line, CV_RANGES[1][0], CV_RANGES[1][1]);
      cvLineTrackRef.current.style.setProperty('--range-fill', `${fill}%`);
    }
    if (cvLineInputRef.current) cvLineInputRef.current.value = String(s.line);

    if (cvGapValRef.current) cvGapValRef.current.textContent = `${Number(s.gap.toFixed(1))} px`;
    if (cvGapTrackRef.current) {
      const fill = computeTrackFill(s.gap, CV_RANGES[2][0], CV_RANGES[2][1]);
      cvGapTrackRef.current.style.setProperty('--range-fill', `${fill}%`);
    }
    if (cvGapInputRef.current) cvGapInputRef.current.value = String(s.gap);

    if (cvMarginValRef.current) cvMarginValRef.current.textContent = `${Number(s.margin.toFixed(1))} px`;
    if (cvMarginTrackRef.current) {
      const fill = computeTrackFill(s.margin, CV_RANGES[3][0], CV_RANGES[3][1]);
      cvMarginTrackRef.current.style.setProperty('--range-fill', `${fill}%`);
    }
    if (cvMarginInputRef.current) cvMarginInputRef.current.value = String(s.margin);

    if (cvPresetBtnsRef.current) {
      const btns = cvPresetBtnsRef.current.querySelectorAll<HTMLButtonElement>('button[data-cv-preset]');
      btns.forEach((btn) => {
        const active = btn.getAttribute('data-cv-preset') === s.preset;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
  }, []);

  const applyRestoreDom = useCallback((pct: number) => {
    const splitPct = 100 - pct;
    const beforeOpacity = 1 - easeInOutCubic((pct - 80) / 20);
    const afterOpacity = easeInOutCubic(pct / 20);

    if (restoreVisualRef.current) {
      restoreVisualRef.current.style.setProperty('--restore-split', `${splitPct}%`);
    }
    if (restoreBeforeLabelRef.current) {
      restoreBeforeLabelRef.current.style.opacity = String(beforeOpacity);
    }
    if (restoreAfterLabelRef.current) {
      restoreAfterLabelRef.current.style.opacity = String(afterOpacity);
    }
    if (restoreValRef.current) {
      restoreValRef.current.textContent = `${pct}%`;
    }
    if (restoreTrackRef.current) {
      restoreTrackRef.current.style.setProperty('--range-fill', `${pct}%`);
    }
    if (restoreInputRef.current) {
      restoreInputRef.current.value = String(pct);
    }
  }, []);

  const applyWeatherDom = useCallback((hour: number) => {
    const formattedTime = formatHourToTime(hour);
    const indoor = sampleTemperature(INDOOR_TEMPS, hour);
    const outdoor = sampleTemperature(OUTDOOR_TEMPS, hour);
    const markerX = weatherX(hour);
    const inCy = weatherY(indoor);
    const outCy = weatherY(outdoor);
    const fillPct = clamp(hour / 24, 0, 1) * 100;

    if (weatherTimeRef.current) weatherTimeRef.current.textContent = formattedTime;
    if (indoorValRef.current) indoorValRef.current.textContent = indoor.toFixed(1);
    if (outdoorValRef.current) outdoorValRef.current.textContent = outdoor.toFixed(1);
    if (weatherMarkerRef.current) {
      weatherMarkerRef.current.setAttribute('x1', String(markerX));
      weatherMarkerRef.current.setAttribute('x2', String(markerX));
    }
    if (outdoorPointRef.current) {
      outdoorPointRef.current.setAttribute('cx', String(markerX));
      outdoorPointRef.current.setAttribute('cy', String(outCy));
    }
    if (indoorPointRef.current) {
      indoorPointRef.current.setAttribute('cx', String(markerX));
      indoorPointRef.current.setAttribute('cy', String(inCy));
    }
    if (weatherTrackRef.current) {
      weatherTrackRef.current.style.setProperty('--range-fill', `${fillPct}%`);
    }
    if (weatherInputRef.current) {
      weatherInputRef.current.value = String(hour);
    }
  }, []);

  // Preset click handler for EasyCV
  const handleSelectCvPreset = useCallback((preset: CvPresetKey) => {
    const [font, line, gap, margin] = CV_PRESETS[preset].values;
    const next: CvTypographyState = { font, line, gap, margin, preset };
    setCvManual(true);
    setCvState(next);
    applyCvDom(next);
  }, [applyCvDom]);

  // Individual slider change handler for EasyCV
  const handleCvSliderChange = useCallback(
    (key: 'font' | 'line' | 'gap' | 'margin', rawVal: number) => {
      setCvManual(true);
      setCvState((prev) => {
        const next = { ...prev, [key]: rawVal };
        // Determine closest preset badge
        const distCompact = Math.abs(next.font - 10.5) + Math.abs(next.line - 1.44) * 3;
        const distBalanced = Math.abs(next.font - 10.8) + Math.abs(next.line - 1.58) * 3;
        const distAiry = Math.abs(next.font - 11.2) + Math.abs(next.line - 1.72) * 3;
        if (distCompact <= distBalanced && distCompact <= distAiry) next.preset = 'compact';
        else if (distAiry <= distBalanced && distAiry <= distCompact) next.preset = 'airy';
        else next.preset = 'balanced';
        applyCvDom(next);
        return next;
      });
    },
    [applyCvDom]
  );

  // Pointer drag on AITextRestorer comparison stage
  const updateRestoreFromClientX = useCallback((clientX: number) => {
    const stage = restoreStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratioFromLeft = clamp((clientX - rect.left) / rect.width, 0, 1);
    const restored = Math.round((1 - ratioFromLeft) * 100);
    setRestoreManual(true);
    setRestorePct(restored);
    applyRestoreDom(restored);
  }, [applyRestoreDom]);

  // Pointer drag on Weather SVG chart
  const updateWeatherFromClientX = useCallback((clientX: number) => {
    const svg = weatherChartRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const hour = Number((ratio * 24).toFixed(2));
    setWeatherManual(true);
    setWeatherHour(hour);
    applyWeatherDom(hour);
  }, [applyWeatherDom]);

  // Scroll-driven demo synchronization
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const demoConfigs = [
      { kind: 'cv' as const, scrollEl: cvScrollRef.current, pinEl: cvPinRef.current },
      { kind: 'restore' as const, scrollEl: restoreScrollRef.current, pinEl: restorePinRef.current },
      { kind: 'weather' as const, scrollEl: weatherScrollRef.current, pinEl: weatherPinRef.current },
    ];

    let metrics: {
      kind: 'cv' | 'restore' | 'weather';
      scrollEl: HTMLDivElement;
      pinEl: HTMLDivElement;
      top: number;
      travel: number;
      last: number;
    }[] = [];
    let frame = 0;

    function updateScrollDemos() {
      frame = 0;
      const isDesktop = window.innerWidth > 700;
      metrics.forEach((demo) => {
        const rectTop = demo.scrollEl.getBoundingClientRect().top;
        const progress = motion.matches
          ? demo.kind === 'weather'
            ? 14 / 24
            : 0.5
          : clamp((demo.top - rectTop) / demo.travel, 0, 1);
        if (progress === demo.last) return;
        demo.last = progress;
        demo.scrollEl.style.setProperty('--demo-progress', String(progress));

        if (demo.kind === 'cv' && !cvManualRef.current) {
          applyCvDom(computeCvStateFromProgress(progress));
        } else if (demo.kind === 'restore' && !restoreManualRef.current) {
          applyRestoreDom(computeRestoreFromProgress(progress, isDesktop));
        } else if (demo.kind === 'weather' && !weatherManualRef.current) {
          applyWeatherDom(computeWeatherHourFromProgress(progress, isDesktop));
        }
      });
    }

    function requestUpdate() {
      if (!frame) frame = requestAnimationFrame(updateScrollDemos);
    }
    requestUpdateRef.current = requestUpdate;

    function measureDemos() {
      document.documentElement.classList.add('js');
      const viewport = window.innerHeight;
      metrics = [];
      demoConfigs.forEach(({ kind, scrollEl, pinEl }) => {
        if (!scrollEl || !pinEl) return;
        const pinHeight = pinEl.offsetHeight;
        const top = Math.max(74, Math.min(104, (viewport - pinHeight) / 2));
        const travel = kind === 'cv' ? Math.max(460, viewport * 0.9) : Math.max(420, viewport * 0.85);
        scrollEl.style.setProperty('--demo-top', `${top}px`);
        scrollEl.style.setProperty('--demo-height', `${pinHeight}px`);
        scrollEl.style.setProperty('--demo-travel', `${travel}px`);
        metrics.push({
          kind,
          scrollEl,
          pinEl,
          top,
          travel,
          last: -1,
        });
      });
      requestUpdate();
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', measureDemos, { passive: true });
    motion.addEventListener('change', measureDemos);

    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(measureDemos);
      demoConfigs.forEach((d) => {
        if (d.pinEl) ro!.observe(d.pinEl);
      });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureDemos);
    }
    measureDemos();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', measureDemos);
      motion.removeEventListener('change', measureDemos);
      ro?.disconnect();
    };
  }, []);

  // Derived values for EasyCV
  const fontFill = computeTrackFill(cvState.font, CV_RANGES[0][0], CV_RANGES[0][1]);
  const lineFill = computeTrackFill(cvState.line, CV_RANGES[1][0], CV_RANGES[1][1]);
  const gapFill = computeTrackFill(cvState.gap, CV_RANGES[2][0], CV_RANGES[2][1]);
  const marginFill = computeTrackFill(cvState.margin, CV_RANGES[3][0], CV_RANGES[3][1]);

  // Derived values for AITextRestorer
  const restoreSplitPct = 100 - restorePct;
  const beforeLabelOpacity = 1 - easeInOutCubic((restorePct - 80) / 20);
  const afterLabelOpacity = easeInOutCubic(restorePct / 20);

  // Derived values for Weather
  const formattedTime = formatHourToTime(weatherHour);
  const indoorTemp = sampleTemperature(INDOOR_TEMPS, weatherHour);
  const outdoorTemp = sampleTemperature(OUTDOOR_TEMPS, weatherHour);
  const markerX = weatherX(weatherHour);
  const indoorCy = weatherY(indoorTemp);
  const outdoorCy = weatherY(outdoorTemp);
  const weatherFillPct = clamp(weatherHour / 24, 0, 1) * 100;

  return (
    <section className="works wrap" id="works" aria-labelledby="works-title">
      <header className="section-heading reveal">
        <div>
          <p className="eyebrow">02 / Small things, made with care</p>
          <h2 id="works-title">想法，在这里成为工具。</h2>
        </div>
        <p>
          关于日常工具、排版节奏与前沿声景生成的小小回应。
          <br />
          向下滚动自动演示，也可直接点击把玩或启动飞船体验。
        </p>
      </header>

      <div className="work-grid">
        {/* 01 / EasyCV */}
        <article className="work work-featured" id="easycv" aria-labelledby="easycv-title">
          <div className="demo-scroll" data-scroll-demo="cv" ref={cvScrollRef}>
            <div className="demo-pin" ref={cvPinRef}>
              <div className="work-visual cv-demo">
                <div className="demo-bar">
                  <span className="demo-brand">EasyCV</span>
                  <small>
                    {cvManual ? (
                      <button
                        type="button"
                        className="mode-reset-btn"
                        onClick={() => {
                          setCvManual(false);
                          cvManualRef.current = false;
                          requestUpdateRef.current();
                        }}
                        aria-label="恢复 EasyCV 随页面滚动自动演示"
                      >
                        手动调节中 · 恢复随滚动 ↺
                      </button>
                    ) : (
                      <>
                        排版随滚动展开 / <span id="cv-phase" ref={cvPhaseRef}>{CV_PRESETS[cvState.preset].label}</span>
                      </>
                    )}
                  </small>
                </div>

                <div className="cv-workbench">
                  <div className="cv-controls">
                    <h4>找到文字的呼吸感。</h4>
                    <p className="control-intro">可随页面滚动展开，也可直接点击预设或拖动滑块微调。</p>

                    <div className="preset-group" ref={cvPresetBtnsRef} role="group" aria-label="切换紧凑、均衡、舒展三种排版预设">
                      {(['compact', 'balanced', 'airy'] as CvPresetKey[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          data-cv-preset={key}
                          className={cvState.preset === key ? 'is-active' : ''}
                          aria-pressed={cvState.preset === key}
                          onClick={() => handleSelectCvPreset(key)}
                        >
                          {CV_PRESETS[key].label}
                        </button>
                      ))}
                    </div>

                    <div className="cv-slider-grid">
                      {/* Font Size Slider */}
                      <div className="slider-control">
                        <label className="slider-label" htmlFor="cv-font-input">
                          <span>正文字号</span>
                          <span className="demo-value" id="cv-font-value" ref={cvFontValRef}>
                            {Number(cvState.font.toFixed(1))} px
                          </span>
                        </label>
                        <div
                          className="scroll-track interactive-track"
                          id="cv-font"
                          ref={cvFontTrackRef}
                          style={{ '--range-fill': `${fontFill}%` } as React.CSSProperties}
                        >
                          <input
                            id="cv-font-input"
                            ref={cvFontInputRef}
                            type="range"
                            min={CV_RANGES[0][0]}
                            max={CV_RANGES[0][1]}
                            step={0.1}
                            value={cvState.font}
                            aria-label="正文字号"
                            onChange={(e) => handleCvSliderChange('font', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Line Height Slider */}
                      <div className="slider-control">
                        <label className="slider-label" htmlFor="cv-line-input">
                          <span>文字行距</span>
                          <span className="demo-value" id="cv-line-value" ref={cvLineValRef}>
                            {cvState.line.toFixed(2)}
                          </span>
                        </label>
                        <div
                          className="scroll-track interactive-track"
                          id="cv-line"
                          ref={cvLineTrackRef}
                          style={{ '--range-fill': `${lineFill}%` } as React.CSSProperties}
                        >
                          <input
                            id="cv-line-input"
                            ref={cvLineInputRef}
                            type="range"
                            min={CV_RANGES[1][0]}
                            max={CV_RANGES[1][1]}
                            step={0.02}
                            value={cvState.line}
                            aria-label="文字行距"
                            onChange={(e) => handleCvSliderChange('line', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Section Gap Slider */}
                      <div className="slider-control">
                        <label className="slider-label" htmlFor="cv-gap-input">
                          <span>段落间距</span>
                          <span className="demo-value" id="cv-gap-value" ref={cvGapValRef}>
                            {Number(cvState.gap.toFixed(1))} px
                          </span>
                        </label>
                        <div
                          className="scroll-track interactive-track"
                          id="cv-gap"
                          ref={cvGapTrackRef}
                          style={{ '--range-fill': `${gapFill}%` } as React.CSSProperties}
                        >
                          <input
                            id="cv-gap-input"
                            ref={cvGapInputRef}
                            type="range"
                            min={CV_RANGES[2][0]}
                            max={CV_RANGES[2][1]}
                            step={0.5}
                            value={cvState.gap}
                            aria-label="段落间距"
                            onChange={(e) => handleCvSliderChange('gap', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Page Margin Slider */}
                      <div className="slider-control">
                        <label className="slider-label" htmlFor="cv-margin-input">
                          <span>纸面留白</span>
                          <span className="demo-value" id="cv-margin-value" ref={cvMarginValRef}>
                            {Number(cvState.margin.toFixed(1))} px
                          </span>
                        </label>
                        <div
                          className="scroll-track interactive-track"
                          id="cv-margin"
                          ref={cvMarginTrackRef}
                          style={{ '--range-fill': `${marginFill}%` } as React.CSSProperties}
                        >
                          <input
                            id="cv-margin-input"
                            ref={cvMarginInputRef}
                            type="range"
                            min={CV_RANGES[3][0]}
                            max={CV_RANGES[3][1]}
                            step={0.5}
                            value={cvState.margin}
                            aria-label="纸面留白"
                            onChange={(e) => handleCvSliderChange('margin', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="scroll-note">
                      {cvManual ? '已切换为手动调参 · 点击右上角可恢复随滚动' : '随你的滚动节奏展开 · 亦可直接点击或拖动滑块'}
                    </p>
                  </div>

                  <div className="cv-preview">
                    <div
                      className="resume-sheet"
                      id="resume-preview"
                      ref={cvResumeSheetRef}
                      role="region"
                      aria-label="简历排版示例，虚构内容"
                      style={
                        {
                          '--cv-font': `${cvState.font.toFixed(2)}px`,
                          '--cv-line': cvState.line.toFixed(2),
                          '--cv-gap': `${cvState.gap.toFixed(2)}px`,
                          '--cv-margin': `${cvState.margin.toFixed(2)}px`,
                        } as React.CSSProperties
                      }
                    >
                      <p className="resume-name">Charlie Freeman</p>
                      <p className="resume-role">产品设计师 / Product Designer</p>
                      <div className="resume-line" />
                      <div className="resume-section">
                        <h5>关于我</h5>
                        <p>
                          从日常观察出发，把复杂的问题整理成清楚、自然的使用体验。喜欢纸张、步行，以及刚刚好的留白。
                        </p>
                      </div>
                      <div className="resume-section">
                        <h5>项目经历</h5>
                        <div className="resume-item">
                          <strong>日常手册 · 体验设计</strong>
                          <span>2024 — 2025</span>
                        </div>
                        <p>梳理信息层级与阅读路径，通过原型验证，让记录和查找都更顺手。</p>
                      </div>
                      <div className="resume-section">
                        <h5>工作方式</h5>
                        <p>观察具体场景，画出可讨论的原型，在真实反馈中持续调整细节。</p>
                      </div>
                      <div className="resume-section">
                        <h5>擅长的事</h5>
                        <p className="resume-skills">信息设计 交互原型 视觉表达</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="demo-caption">
                  <span>同一份内容，不同的阅读节奏。</span>
                  <span>示例简历 · 支持滚动与手动微调</span>
                </div>
              </div>

              <div className="work-meta">
                <h3 id="easycv-title">EasyCV</h3>
                <span>01 / 简历与排版</span>
              </div>
              <div className="work-summary">
                <h4>
                  把注意力留给内容，
                  <br />
                  让排版跟着你的想法走。
                </h4>
                <p>
                  在 EasyCV 中，用滑块细调字号、行距和留白，即刻看到变化。支持多种模板与 A/B 排版对照，内容保存在本地，可导出 PDF。让一份简历，找到适合自己的表达。
                </p>
              </div>
              <div className="work-links">
                <a className="text-button" href="https://cv.3901646.xyz" target="_blank" rel="noopener noreferrer">
                  打开 EasyCV
                  <span aria-hidden="true">{'↗\uFE0E'}</span>
                  <span className="sr-only">（新窗口）</span>
                </a>
                <a
                  className="quiet-link"
                  href="https://github.com/cf3901646/EasyCV"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {'查看源码 ↗\uFE0E'}
                  <span className="sr-only">（新窗口）</span>
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* 04 / Space DJ */}
        <article className="work work-featured" id="spacedj" aria-labelledby="spacedj-title">
          <div className="demo-scroll">
            <div className="demo-pin">
              <div
                className="work-visual space-preview-stage"
                style={{
                  background: 'radial-gradient(ellipse at center, #182232 0%, #080a0f 100%)',
                  color: '#fff',
                  borderRadius: '12px',
                  minHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '28px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                  <span style={{ fontSize: '12px', letterSpacing: '0.1em', fontWeight: 600, color: '#ffca28', textTransform: 'uppercase' }}>
                    Google Magenta × Lyria RealTime
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255,202,40,0.15)',
                      border: '1px solid rgba(255,202,40,0.3)',
                      color: '#ffca28',
                    }}
                  >
                    国内免翻直连 · 多Key配额池
                  </span>
                </div>

                <div style={{ margin: 'auto 0', zIndex: 2 }}>
                  <h3 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 10px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
                    Space DJ · 3D 潜空间星际漫游
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', maxWidth: '520px', margin: 0 }}>
                    驾驶飞船在 3D 音符星座中自由穿梭。基于航行坐标实时融合风格 Prompt，通过 Google Lyria RealTime API 持续无缝生成流式合成音乐。
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', zIndex: 2, flexWrap: 'wrap' }}>
                  <a
                    href="/space/"
                    target="_blank"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      background: '#ffca28',
                      color: '#121316',
                      fontWeight: 700,
                      fontSize: '14px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 16px rgba(255,202,40,0.4)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    启动飞船 · 立即体验 ↗
                  </a>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    支持 WASD / 键盘方向键 6-DOF 飞行控制 · 2 分钟安全限额保护
                  </span>
                </div>

                {/* Decorative cosmic stars background glow */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.4,
                    pointerEvents: 'none',
                    background:
                      'radial-gradient(circle at 20% 30%, rgba(120, 119, 198, 0.45), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255, 202, 40, 0.25), transparent 45%)',
                  }}
                />
              </div>

              <div className="work-meta">
                <h3 id="spacedj-title">Space DJ</h3>
                <span>04 / 声音与星际</span>
              </div>
              <div className="work-summary">
                <h4>当音乐在宇宙空间中拥有坐标。</h4>
                <p>
                  改造自 Google Magenta 实验项目。将数百种音乐风格通过 UMAP 映射为三维星系，当飞船掠过不同星辰，Lyria 实时模型动态平滑插值合成流式音乐。自建边缘网关保障国内极速直连。
                </p>
              </div>
              <div className="work-links">
                <a className="text-button" href="/space/" target="_blank">
                  全屏进入
                  <span aria-hidden="true">{'↗︎'}</span>
                  <span className="sr-only">（新窗口）</span>
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* 02 / AITextRestorer */}
        <article className="work" id="text-restorer" aria-labelledby="restorer-title">
          <div className="demo-scroll" data-scroll-demo="restore" ref={restoreScrollRef}>
            <div className="demo-pin" ref={restorePinRef}>
              <div
                className="work-visual restore-demo"
                ref={restoreVisualRef}
                style={{ '--restore-split': `${restoreSplitPct}%` } as React.CSSProperties}
              >
                <div className="demo-bar">
                  <span className="demo-brand">Aa.</span>
                  <small>
                    {restoreManual ? (
                      <button
                        type="button"
                        className="mode-reset-btn"
                        onClick={() => {
                          setRestoreManual(false);
                          restoreManualRef.current = false;
                          requestUpdateRef.current();
                        }}
                        aria-label="恢复 AITextRestorer 随页面滚动自动演示"
                      >
                        手动比对中 · 恢复随滚动 ↺
                      </button>
                    ) : (
                      'AITextRestorer / 文字修复'
                    )}
                  </small>
                </div>

                <div className="restore-stage">
                  <div
                    className="restore-comparison interactive-stage"
                    id="restore-comparison"
                    ref={restoreStageRef}
                    role="img"
                    aria-label="文字修复原理示意：左侧笔画变形，右侧保留正确文字，可左右拖动分割线对比"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      updateRestoreFromClientX(e.clientX);
                    }}
                    onPointerMove={(e) => {
                      if (e.buttons > 0) updateRestoreFromClientX(e.clientX);
                    }}
                  >
                    <div className="restore-art after" aria-hidden="true">
                      <div className="sample-print">
                        <small>NOTES ON EVERYDAY LIFE</small>
                        <strong>日常有光</strong>
                        <p>把美好留在纸上</p>
                        <i className="print-rule" />
                      </div>
                    </div>
                    <div className="restore-art before" aria-hidden="true">
                      <div className="sample-print">
                        <small>NOTES ON EVERYDAY LIFE</small>
                        <strong>日常有光</strong>
                        <p>把美好留在纸上</p>
                        <i className="print-rule" />
                      </div>
                    </div>
                    <span
                      className="compare-label before-label"
                      ref={restoreBeforeLabelRef}
                      aria-hidden="true"
                      style={{ opacity: beforeLabelOpacity }}
                    >
                      文字变形
                    </span>
                    <span
                      className="compare-label after-label"
                      ref={restoreAfterLabelRef}
                      aria-hidden="true"
                      style={{ opacity: afterLabelOpacity }}
                    >
                      还原文字
                    </span>
                    <div className="compare-divider" aria-hidden="true" />
                  </div>
                </div>

                <div className="compare-control">
                  <label className="slider-label" htmlFor="restore-range-input">
                    <span>向下滚动或拖动滑块，文字回到原样</span>
                    <span className="demo-value" id="restore-value" ref={restoreValRef}>
                      {restorePct}%
                    </span>
                  </label>
                  <div
                    className="scroll-track interactive-track"
                    id="restore-range"
                    ref={restoreTrackRef}
                    style={{ '--range-fill': `${restorePct}%` } as React.CSSProperties}
                  >
                    <input
                      id="restore-range-input"
                      ref={restoreInputRef}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={restorePct}
                      aria-label="文字修复进度百分比"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setRestoreManual(true);
                        setRestorePct(val);
                        applyRestoreDom(val);
                      }}
                    />
                  </div>
                </div>

                <div className="demo-caption">
                  <span>原图文字 + 增强后的背景</span>
                  <span>支持直接拖动分割线对照</span>
                </div>
              </div>

              <div className="work-meta">
                <h3 id="restorer-title">AITextRestorer</h3>
                <span>02 / 图像与文字</span>
              </div>
              <div className="work-summary">
                <h4>画面变清楚，文字保持原样。</h4>
                <p>
                  AI 增强画面时，也可能改变文字的笔画。将原图中的正确文字重新对齐、融合进增强后的背景，并通过笔刷与羽化调整细节。
                </p>
              </div>
              <div className="work-links">
                <a className="text-button" href="https://restore.3901646.xyz" target="_blank" rel="noopener noreferrer">
                  打开网页版
                  <span aria-hidden="true">{'↗\uFE0E'}</span>
                  <span className="sr-only">（新窗口）</span>
                </a>
                <a
                  className="quiet-link"
                  href="https://github.com/cf3901646/AITextRestorer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {'查看项目 ↗\uFE0E'}
                  <span className="sr-only">（新窗口）</span>
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* 03 / Thermal */}
        <article className="work" id="thermal" aria-labelledby="thermal-title">
          <div className="demo-scroll" data-scroll-demo="weather" ref={weatherScrollRef}>
            <div className="demo-pin" ref={weatherPinRef}>
              <div className="work-visual weather-demo">
                <div className="demo-bar">
                  <span className="demo-brand">°C</span>
                  <small>
                    {weatherManual ? (
                      <button
                        type="button"
                        className="mode-reset-btn"
                        onClick={() => {
                          setWeatherManual(false);
                          weatherManualRef.current = false;
                          requestUpdateRef.current();
                        }}
                        aria-label="恢复体感温度计随页面滚动自动演示"
                      >
                        手动查看中 · 恢复随滚动 ↺
                      </button>
                    ) : (
                      'Thermal / 体感温度'
                    )}
                  </small>
                </div>

                <div className="weather-stage">
                  <div className="weather-heading">
                    <span>一天之中，身体感受到的温度</span>
                    <time id="weather-time" ref={weatherTimeRef}>{formattedTime}</time>
                  </div>
                  <div className="weather-readings">
                    <div className="weather-reading">
                      <span>室内 · 阴凉处</span>
                      <output id="indoor-value" ref={indoorValRef} aria-live="off">
                        {indoorTemp.toFixed(1)}
                      </output>
                      <sup>°C</sup>
                    </div>
                    <div className="weather-reading outdoor">
                      <span>室外 · 日光下</span>
                      <output id="outdoor-value" ref={outdoorValRef} aria-live="off">
                        {outdoorTemp.toFixed(1)}
                      </output>
                      <sup>°C</sup>
                    </div>
                  </div>
                  <svg
                    className="weather-chart interactive-stage"
                    id="weather-chart"
                    ref={weatherChartRef}
                    viewBox="0 0 400 145"
                    role="img"
                    aria-labelledby="weather-chart-title weather-chart-desc"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      updateWeatherFromClientX(e.clientX);
                    }}
                    onPointerMove={(e) => {
                      if (e.buttons > 0) updateWeatherFromClientX(e.clientX);
                    }}
                  >
                    <title id="weather-chart-title">室内外体感温度示例曲线</title>
                    <desc id="weather-chart-desc">
                      示例数据展示室外体感在午后上升，室内变化较缓；支持直接左右拖动查看任意时刻温度。
                    </desc>
                    <defs>
                      <linearGradient id="weather-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop stopColor="#ddc8a8" stopOpacity=".18" />
                        <stop offset="1" stopColor="#ddc8a8" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path className="chart-grid" d="M8 26H392 M8 67H392 M8 108H392" />
                    <text className="chart-label" x="8" y="140">
                      00:00
                    </text>
                    <text className="chart-label" x="102" y="140" textAnchor="middle">
                      06:00
                    </text>
                    <text className="chart-label" x="200" y="140" textAnchor="middle">
                      12:00
                    </text>
                    <text className="chart-label" x="296" y="140" textAnchor="middle">
                      18:00
                    </text>
                    <text className="chart-label" x="392" y="140" textAnchor="end">
                      24:00
                    </text>
                    <path id="outdoor-area" fill="url(#weather-fill)" d={outdoorAreaPath} />
                    <path
                      id="outdoor-line"
                      fill="none"
                      stroke="#c9ad88"
                      strokeWidth="2"
                      strokeLinecap="round"
                      d={outdoorPath}
                    />
                    <path
                      id="indoor-line"
                      fill="none"
                      stroke="#a0b191"
                      strokeWidth="2"
                      strokeLinecap="round"
                      d={indoorPath}
                    />
                    <line
                      id="weather-marker"
                      ref={weatherMarkerRef}
                      x1={markerX}
                      x2={markerX}
                      y1="12"
                      y2="116"
                      stroke="#d1d9c8"
                      strokeDasharray="3 4"
                    />
                    <circle
                      id="outdoor-point"
                      ref={outdoorPointRef}
                      cx={markerX}
                      cy={outdoorCy}
                      r="4"
                      fill="#c9ad88"
                      stroke="#fffdf6"
                      strokeWidth="2"
                    />
                    <circle
                      id="indoor-point"
                      ref={indoorPointRef}
                      cx={markerX}
                      cy={indoorCy}
                      r="4"
                      fill="#a0b191"
                      stroke="#fffdf6"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                <div className="weather-slider">
                  <label className="slider-label" htmlFor="weather-hour-input">
                    <span>随滚动或拖动滑块，走过一天的温度</span>
                    <span>24 小时</span>
                  </label>
                  <div
                    className="scroll-track interactive-track"
                    id="weather-hour"
                    ref={weatherTrackRef}
                    style={{ '--range-fill': `${weatherFillPct}%` } as React.CSSProperties}
                  >
                    <input
                      id="weather-hour-input"
                      ref={weatherInputRef}
                      type="range"
                      min={0}
                      max={24}
                      step={0.1}
                      value={weatherHour}
                      aria-label="全天24小时体感温度时刻选择"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setWeatherManual(true);
                        setWeatherHour(val);
                        applyWeatherDom(val);
                      }}
                    />
                  </div>
                </div>

                <div className="demo-caption">
                  <span>室内外对照 · 体感估算</span>
                  <span>支持直接拖动曲线或滑块</span>
                </div>
              </div>

              <div className="work-meta">
                <h3 id="thermal-title">体感温度计</h3>
                <span>03 / 天气与感受</span>
              </div>
              <div className="work-summary">
                <h4>天气数字之外，还有身体的感受。</h4>
                <p>
                  结合温度、湿度、风速与日照，估算室内外体感差异。用一天的变化曲线，让天气信息更接近日常的感受。
                </p>
              </div>
              <div className="work-links">
                <a
                  className="text-button"
                  href="https://github.com/cf3901646/thermal-feels-like"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  了解这个工具
                  <span aria-hidden="true">{'↗\uFE0E'}</span>
                  <span className="sr-only">（新窗口）</span>
                </a>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};
