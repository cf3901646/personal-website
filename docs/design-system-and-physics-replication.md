# 3901646.xyz 全景设计系统与开场第一页物理级代码复刻深度研究报告

> **目标**：以 Cursor.com、Steph Ango（Obsidian CEO）、Paco Coursey 的极简主义设计工程为标杆，深度逆向解构开场第一页（`v2_hero_sunlit_letterpress.jpg`）的物理世界光学原理，并给出 1:1 像素级纯前端工程复刻实现。

---

## 一、 顶尖极简设计系统的技术解构

### 1. Cursor.com 的设计系统精髓（Warm Editorial Utility）

通过逆向分析 Cursor 官网的底层 CSS 架构与设计语言，其核心特征为：

- **告别数字纯黑白**：
  - **背景色**：坚决弃用刺眼的 `#FFFFFF`，采用暖骨白与浅燕麦色（`#F2F1ED`、`#E6E5E0`），模拟吸墨棉纸与老式印刷刊物。
  - **墨水色**：弃用死黑 `#000000`，正文采用高对比度的暖炭墨色 `#26251E`。
- **Oklab 感知均匀发丝线（Hairline Grid）**：
  - 彻底摒弃粗重的投影卡片或实心灰线，所有分界线均使用 `oklab()` 感知色彩空间的超低透明度暖棕发丝线：
    ```css
    --border-warm: oklab(0.263084 -0.00230259 0.0124794 / 0.12);
    ```
- **三层字体秩序（The 3-Font Hierarchy）**：
  1. **Display / 标题**：采用紧凑粗黑的展示体，在较大字号下施加激进的**负字间距（Negative Tracking）**（如 `letter-spacing: -0.03em`），营造严谨精密的工程结构感。
  2. **Editorial / 正文**：采用舒展人文的古典衬线体（Transitional Serif），行高保持在 `1.7` 至 `1.9`，留足呼吸空间。
  3. **Code / 标签**：采用硬朗清晰的等宽字体（`JetBrains Mono` / `Berkeley Mono`），搭配按键物理微浮雕。
- **滚动交互（Sticky Assembly）**：
  - 核心模块采用视口钉住（Sticky Pinning），滚轮向下时驱动文字由淡凝深、细节如抽屉展开，绝不出现花哨晃眼的乱动。

### 2. Steph Ango & Paco Coursey 的激进克制哲学（Radical Restraint）

- **Typography is the UI（文字即界面）**：
  - 无需任何多余的装饰性边框、图标外盒或渐变大泡泡；
  - 严格限制单栏黄金阅读宽度（`max-width: 680px`），两翼大面积留白；
  - 链接融入正文，仅以低对比度下划线提示，悬停时产生微妙的墨色加深过渡。

---

## 二、 开场第一页（午后斜阳 · 活字压痕）物理学与光学公式解构

开场第一页的核心视觉目标是：**在纯净纸面上，让 `cf3901646@gmail.com` 看起来像是被无墨金属活字冲压机深深凹印进一张厚重的 600gsm 纯棉艺术纸中，同时一束 3200K 的午后暖阳透过窗外百叶与枝叶斜斜洒下**。

### 1. 纸张微纤维渲染（Anisotropic SVG Noise & Lighting）

传统的 CSS 噪点图片是均质像素点阵，无法表现“植物纤维沿垂直方向交织”的手工棉纸质感。

- **解法**：使用各向异性（Anisotropic）SVG `<feTurbulence>` 滤镜：
  ```xml
  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.7" numOctaves="4" seed="5" result="noise" />
  ```
  `baseFrequency="0.04 0.7"` 将 X 轴频率压低、Y 轴频率拉高，生成垂直排列的微细植物纤维丝。
- **定向纸张漫反射**：结合 `<feDiffuseLighting>` 与 `<feDistantLight azimuth="60" elevation="50" />`，让微观纸张纤维在定向光源下产生微米级阴影与高光，形成真正的艺术纸肌理。

### 2. 真实活字压痕光学模型（Blind Letterpress Physics）

凸版无墨压痕（Blind Deboss）的视觉形成源于两个物理界面：
1. **上壁背阴暗槽（Cavity Shadow）**：金属活字冲压时在纸张上边缘形成垂直下切，阻挡来自上方的光线，产生深色压痕内影；
2. **下壁受光凸脊（Paper Lip Crest Highlight）**：活字下边缘将纸张纤维向下挤压，在边缘挤出一道微小的向上隆起褶皱（Paper Lip），直接朝向光源产生极亮的高光线。

#### CSS 光学数学公式：
```css
/* 基础凹印字符（cf 与 @gmail.com） */
.part-muted {
  color: #b0a490;
  text-shadow:
    var(--light-dir-x) var(--light-dir-y) 1.5px rgba(58, 48, 36, 0.52),  /* 背阴暗槽 */
    var(--highlight-x) var(--highlight-y) 2px rgba(255, 252, 245, 0.92),  /* 受光突起脊线 */
    0 0 1px rgba(110, 98, 80, 0.2);                                      /* 接触面纸浆挤压 */
}

/* 斜阳照耀的同源数字 3901646 */
.part-sunlit {
  color: #c98e4d;
  text-shadow:
    var(--light-dir-x) var(--light-dir-y) 1.5px rgba(78, 52, 22, 0.65),
    var(--highlight-x) var(--highlight-y) 2.5px rgba(255, 250, 235, 1.0),
    0 0 16px rgba(228, 168, 88, 0.42); /* 斜阳光束在暖金凹槽内壁激发的漫反射漫光 */
}
```

### 3. 光标法线重光照算法（Dynamic Normal Relighting）

在现实中，观察者移动视线或光源轻微摆动时，凹痕的阴影和高光角度会发生细微法线偏移。
通过监听 `pointermove` 事件，将光标视口归一化坐标 `(nx, ny)` 映射为光线入射偏角：
$$\Delta x = \text{round}(-1.2 - 1.4 \cdot n_x, 2)\text{ px}$$
$$\Delta y = \text{round}(-1.5 - 1.4 \cdot n_y, 2)\text{ px}$$
$$\text{Highlight}_x = \text{round}(1.4 + 1.4 \cdot n_x, 2)\text{ px}$$
$$\text{Highlight}_y = \text{round}(1.8 + 1.4 \cdot n_y, 2)\text{ px}$$
使文字凹印在不同鼠标位置下呈现随光流动的立体物理触感。

### 4. 午后斜阳与斑驳树影（Gobo Light Dual-Layer Blend）

自然界的阳光树影由两层物理混合叠加而成：
1. **加色层（Light Cast）**：使用 `mix-blend-mode: plus-lighter`（或 `soft-light`），通过 135° 线性渐变模拟色温 3200K 的温暖斜阳光柱，仅提升画面受光区域的明度；
2. **减色遮蔽层（Gobo Occlusion）**：使用 `mix-blend-mode: multiply`，叠加百叶窗几何硬框与多点径向发散树叶集群，并施加 `filter: blur(14px)` 模拟大光圈镜头下的真实光斑弥散，配合 12 秒缓动循环动画模拟微风吹拂。

### 5. 丁达尔浮尘粒子数学模型（Brownian Motion with Light Cone Masking）

微米级灰尘只有在掠过强光束的瞬间才会被人眼捕捉。
- 粒子受双向扰动：横向微弱正风速 $v_x \in [0.06, 0.20]$，纵向微弱升腾 $v_y \in [-0.04, -0.16]$；
- **阳光锥体相交检验**：
  $$\text{Dist} = \left| \frac{x}{W} + \frac{y}{H} - 1.02 \right|$$
  $$\text{SunFactor} = \max\left(0, 1 - 2.0 \cdot \text{Dist}\right)$$
  $$\text{Alpha} = (0.2 + 0.5 \sin(\text{phase})) \cdot \text{SunFactor}$$
  只有当粒子处于光束对角线通道内时，高斯光晕才被点亮，完美还原午后书房中浮尘穿过光束的宁静呼吸感。

---

## 三、 向下滚动的全站架构衔接

从第一屏过渡到正文区时，严格执行**“色彩无断层、结构无多余大框、内容按需展开”**的原则：

1. **零色彩跳跃**：背景严格锚定在同一张暖燕麦纸色（`#E6DFD1`），仅通过滚动行程将斜阳与树影的 Opacity 从 1.0 平滑衰减至 0，展现纯净的平整纸面。
2. **发丝线与极简骨架**：单栏居中（`max-width: 680px`），章节间使用 1px 活字压槽分割线（深色槽线 + 浅色受光线）。
3. **滚动驱动抽屉舒展（Progressive Reveal）**：
   - 序言文字按滚动视线逐行由浅灰墨（35%）凝结为深墨（100%）；
   - 代表项目在滚入视口中央黄金带（`Center ± 160px`）时，自动舒展开技术压痕胶囊与外链，滚出后自然收拢，兼顾极简排版与丰富细节。
