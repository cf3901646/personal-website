# ☀️ 3901646.xyz — Charlie Freeman · 日光里的个人手册

> **午后斜阳与活字压痕的数字花园与工具作品集**  
> 线上地址：[https://3901646.xyz](https://3901646.xyz) · 邮箱：`cf3901646@gmail.com`

---

## 📖 项目简介

基于 **React 19 + Vite + Tailwind CSS v4** 重构的个人品牌与实验性交互展厅。通过 WebGL/Canvas 自然光影投射、SVG 盲压印深度滤镜与响应式排版工坊，呈现“想法在这里成为工具”的数字手册体验。

### 核心展厅作品
1. **EasyCV**（[https://cv.3901646.xyz](https://cv.3901646.xyz)）：文字排版节奏工作台，支持字号、行距、留白实时调优与双向联动。
2. **AITextRestorer**（[https://restore.3901646.xyz](https://restore.3901646.xyz)）：AI 图像增强与文字笔画精准复原对比工具。
3. **Thermal**（[体感温度计](https://github.com/cf3901646/thermal-feels-like)）：24 小时全天室内外温感变化曲线与交互估算。
4. **一车之地**（[https://car.3901646.xyz](https://car.3901646.xyz) · [源码](https://github.com/cf3901646/car-dimension-filter)）：按尺寸选车，看标准车位停不停得下、开门够不够。首页演示把 5 款车按官方车宽画进 5300 × 2500 mm 车位。
5. **Space DJ**（[https://3901646.xyz/space/](https://3901646.xyz/space/)）：基于 Google Magenta 与 Lyria RealTime 实时音频大模型深度改造的 3D 星系声景漫游。自建 Cloudflare Pages 边缘 WebSocket 网关实现国内免梯直连与多 Key 配额池轮询，体验不限时长。手机和平板上显示触屏摇杆（`public/space/touch-controls.js`），把手指操作翻译成飞船原有的键盘控制；网址加 `?touch=1` 可在电脑上强制显示。

---

## ⚡ 极速渲染与性能工程 (Performance Architecture)

本版本针对移动端与高刷屏幕进行了深度底层重构：

- **0-VDOM 滚动直驱引擎**：展厅组件（EasyCV / Restorer / Thermal）在自然滚动时彻底解耦 React `useState`，采用 Direct DOM Ref 与 CSS 自定义属性批量直更，将滚动 JS 执行开销由 25ms 压榨至 **< 0.3ms**，滚动阶段 VDOM Diffing 次数降至 **0**。
- **60 FPS V-Sync 对齐**：Canvas 慢速树影与微尘粒子采用 60 FPS 硬件垂直同步分频锁（1:1 匹配 60Hz 屏幕，1:2 匹配 120Hz ProMotion 屏幕），彻底消除步调抖动，削减 50% 无谓 GPU 消耗。离开视口自动休眠。
- **Web Worker 离线纸纹**：底纸颗粒纹理在 Web Worker 中通过 `OffscreenCanvas` 与 `createImageBitmap` 异步生成，主线程零卡顿。
- **边缘强缓存与离线 PWA**：部署 Service Worker 离线缓存、PWA 清单，并通过 `public/_headers` 针对静态构建产物下发 1 年不可变（`immutable`）长效缓存。
- **微信防劫持防线**：内置 `WeixinJSBridge` 字号锁定脚本，杜绝微信内置浏览器字体缩放破坏排版。

---

## 🛠️ 本地开发与构建

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地开发服务 (http://localhost:5173)
pnpm run dev

# 3. 生产打包构建
pnpm run build

# 4. 本地预览产物
pnpm run preview
```

---

## 🚀 部署架构

本仓库代码推送至 `main` 分支后，由 **Cloudflare Pages** 自动执行 `pnpm run build` 并全球边缘秒级分发至 [3901646.xyz](https://3901646.xyz)。
旧版 Astro 实现已安全完整归档于 [`legacy-astro`](https://github.com/cf3901646/personal-website/tree/legacy-astro) 分支。
