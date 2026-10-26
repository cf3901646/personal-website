/*
 * Space DJ 触屏摇杆
 *
 * Space DJ 的飞船只认键盘（WASD / 方向键 / Q E / Shift），手机上没有键盘就开不动。
 * 这里在手机和平板上叠一层摇杆，把手指的推动翻译成同样的按键事件派发给 window，
 * 不改动 Space DJ 的打包产物。
 *
 * 左摇杆：上 W 前进，下 S 后退，左右 A / D 转向
 * 右摇杆：上下 ↑ / ↓ 抬头低头，左右 Q / E 横滚
 * 加速键：点一下按住 Shift，再点一下松开
 *
 * 网址加 ?touch=1 可在电脑上强制显示，?touch=0 关闭。
 */
(function () {
  'use strict';

  var param = new URLSearchParams(location.search).get('touch');
  if (param === '0' || param === 'off') return;
  var forced = param === '1' || param === 'on';

  // 多种信号任一成立就当作手机/平板；都不成立时，第一次真实触摸也会把摇杆叫出来
  function looksTouchFirst() {
    var ua = navigator.userAgent || '';
    var uaMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|OpenHarmony|ArkWeb|Windows Phone/i.test(ua);
    var uaData = !!(navigator.userAgentData && navigator.userAgentData.mobile);
    var iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    var mq = window.matchMedia
      ? function (q) {
          return window.matchMedia(q).matches;
        }
      : function () {
          return false;
        };
    var coarse = mq('(pointer: coarse)') || (mq('(any-pointer: coarse)') && !mq('(any-pointer: fine)'));
    return uaMobile || uaData || iPadOS || coarse;
  }

  var KEYS = {
    w: ['w', 'KeyW', 87],
    s: ['s', 'KeyS', 83],
    a: ['a', 'KeyA', 65],
    d: ['d', 'KeyD', 68],
    q: ['q', 'KeyQ', 81],
    e: ['e', 'KeyE', 69],
    up: ['ArrowUp', 'ArrowUp', 38],
    down: ['ArrowDown', 'ArrowDown', 40],
    shift: ['Shift', 'ShiftLeft', 16],
  };
  var held = {};

  function press(name, on) {
    if (!!held[name] === on) return;
    held[name] = on;
    var k = KEYS[name];
    var ev = new KeyboardEvent(on ? 'keydown' : 'keyup', {
      key: k[0],
      code: k[1],
      keyCode: k[2],
      which: k[2],
      shiftKey: name === 'shift' ? on : !!held.shift,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(ev);
  }

  function releaseAll() {
    Object.keys(held).forEach(function (name) {
      press(name, false);
    });
  }

  var CSS =
    // z-index 1000 与键盘说明层同级、DOM 在后，所以压在它上面；展开的 prompts 面板（1001）仍在摇杆之上
    '.sdj-touch{position:fixed;inset:0;z-index:1000;pointer-events:none;' +
    '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;' +
    'font:11px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:rgba(226,223,209,.7)}' +
    '.sdj-stick{position:absolute;bottom:calc(124px + env(safe-area-inset-bottom,0px));width:128px;height:128px;' +
    'border-radius:50%;border:1px solid rgba(226,223,209,.3);background:radial-gradient(circle,rgba(17,19,16,.2),rgba(17,19,16,.55));' +
    'pointer-events:auto;touch-action:none}' +
    '.sdj-stick.is-left{left:calc(18px + env(safe-area-inset-left,0px))}' +
    '.sdj-stick.is-right{right:calc(18px + env(safe-area-inset-right,0px))}' +
    '.sdj-stick::before{content:"";position:absolute;inset:14px;border-radius:50%;border:1px dashed rgba(226,223,209,.16)}' +
    '.sdj-knob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;' +
    'border:1px solid rgba(197,164,122,.85);background:rgba(226,223,209,.1);transition:transform .14s ease-out,background .2s}' +
    '.sdj-stick.is-active .sdj-knob{transition:background .2s;background:rgba(197,164,122,.24)}' +
    '.sdj-label{position:absolute;left:50%;bottom:calc(100% + 9px);transform:translateX(-50%);white-space:nowrap;letter-spacing:.14em}' +
    '.sdj-boost{position:absolute;right:calc(18px + 38px + env(safe-area-inset-right,0px));' +
    'bottom:calc(124px + 128px + 36px + env(safe-area-inset-bottom,0px));width:52px;height:52px;padding:0;border-radius:50%;' +
    'border:1px solid rgba(168,66,50,.85);background:rgba(17,19,16,.5);color:#e2dfd1;font:inherit;font-size:12px;letter-spacing:.08em;' +
    'pointer-events:auto;touch-action:none}' +
    '.sdj-boost.is-on{background:#a84232;border-color:#a84232}' +
    '@media (orientation:landscape) and (max-height:500px){' +
    '.sdj-stick{bottom:calc(64px + env(safe-area-inset-bottom,0px));width:112px;height:112px}' +
    '.sdj-boost{bottom:calc(64px + 112px + 32px + env(safe-area-inset-bottom,0px));right:calc(18px + 30px + env(safe-area-inset-right,0px))}}';

  var mounted = false;

  function stick(el, map) {
    var knob = el.querySelector('.sdj-knob');
    var id = null;
    var cx = 0;
    var cy = 0;
    var reach = 1;

    function apply(x, y) {
      var t = 0.3;
      press(map.up, y < -t);
      press(map.down, y > t);
      press(map.left, x < -t);
      press(map.right, x > t);
    }

    function move(e) {
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > reach) {
        dx = (dx / len) * reach;
        dy = (dy / len) * reach;
      }
      knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      apply(dx / reach, dy / reach);
    }

    function end(e) {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove('is-active');
      knob.style.transform = '';
      apply(0, 0);
    }

    el.addEventListener('pointerdown', function (e) {
      if (id !== null) return;
      id = e.pointerId;
      try {
        el.setPointerCapture(id);
      } catch (err) {
        /* 部分内核在合成事件上不支持捕获，忽略 */
      }
      var r = el.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      reach = r.width * 0.32;
      el.classList.add('is-active');
      move(e);
      e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id) return;
      move(e);
      e.preventDefault();
    });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  function mount() {
    if (mounted) return;
    mounted = true;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.className = 'sdj-touch';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="sdj-stick is-left"><span class="sdj-knob"></span><span class="sdj-label">推进 · 转向</span></div>' +
      '<div class="sdj-stick is-right"><span class="sdj-knob"></span><span class="sdj-label">俯仰 · 横滚</span></div>' +
      '<button type="button" class="sdj-boost">加速</button>';
    document.body.appendChild(root);

    stick(root.querySelector('.is-left'), { up: 'w', down: 's', left: 'a', right: 'd' });
    stick(root.querySelector('.is-right'), { up: 'up', down: 'down', left: 'q', right: 'e' });

    var boost = root.querySelector('.sdj-boost');
    boost.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var on = !held.shift;
      press('shift', on);
      boost.classList.toggle('is-on', on);
    });
    boost.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
    root.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });

    window.addEventListener('blur', function () {
      releaseAll();
      boost.classList.remove('is-on');
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        releaseAll();
        boost.classList.remove('is-on');
      }
    });

    tidyApp();
  }

  function withApp(fn) {
    var tries = 0;
    (function find() {
      var app = document.querySelector('space-dj');
      if (app && app.shadowRoot) {
        fn(app);
        return;
      }
      if (++tries < 100) setTimeout(find, 100);
    })();
  }

  // 窄屏时顶栏（返回链接 + 大标题 + 5 个按钮）比屏幕宽，整页被撑宽，
  // 固定定位的摇杆会跑到屏幕外。这里给 <space-dj> 的 shadow root 补一份窄屏样式。
  var NARROW_CSS =
    '@media (max-width:600px){' +
    '.header{left:0;right:0;padding:0 10px;overflow:hidden}' +
    '.header-row{gap:8px}' +
    '.header-row>div:first-child{min-width:0}' +
    '.header h1{font-size:22px;white-space:nowrap;margin-left:8px}' +
    '.controls{flex-shrink:0;gap:2px}}' +
    '@media (max-width:480px){.header h1{display:none}}';

  function patchNarrowLayout() {
    withApp(function (app) {
      var root = app.shadowRoot;
      try {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(NARROW_CSS);
        root.adoptedStyleSheets = Array.prototype.slice.call(root.adoptedStyleSheets || []).concat([sheet]);
      } catch (err) {
        var tag = document.createElement('style');
        tag.textContent = NARROW_CSS;
        root.appendChild(tag);
      }
    });
  }

  // 手机上用不到键盘按键说明；"请用电脑访问"的英文提示也不再成立。
  // 只改 <space-dj> 元素公开的属性，不碰它的内部实现。
  function tidyApp() {
    withApp(function (app) {
      Promise.resolve(app.updateComplete).then(function () {
        var apply = function () {
          app.isTouchDevice = false;
          app.showControlsOverlay = false;
          app.promptsOverlayCollapsed = true;
          if (app.toastMessage && typeof app.toastMessage.hide === 'function') app.toastMessage.hide();
        };
        apply();
        setTimeout(apply, 400);
      });
    });
  }

  function start() {
    patchNarrowLayout();
    if (forced || looksTouchFirst()) {
      mount();
      return;
    }
    // 识别不出来的设备：等第一次真实触摸
    var onFirstTouch = function (e) {
      if (e.type === 'pointerdown' && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      window.removeEventListener('pointerdown', onFirstTouch, true);
      window.removeEventListener('touchstart', onFirstTouch, true);
      mount();
    };
    window.addEventListener('pointerdown', onFirstTouch, true);
    window.addEventListener('touchstart', onFirstTouch, { capture: true, passive: true });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
