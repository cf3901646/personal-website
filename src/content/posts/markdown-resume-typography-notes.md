---
title: "从零手搓 Markdown 简历编辑器时的排版与分页痛点复盘"
date: "2026.09"
description: "Web 打印与 A4 纸张物理边界在 CSS 排版引擎下的妥协与破局。"
tags:
  - "Vue"
  - "CSS"
---

在开发 EasyCV 过程中，最大的技术挑战并非 Markdown 的语法解析，而是浏览器视口与物理 A4 纸张页面尺寸之间的映射。

CSS 的 `@media print` 与 `break-inside: avoid` 在不同 Chromium 内核下的渲染行为存在细微差异。通过引入实时的 DOM 测距与分页高度计算，我们得以在保持极简的前提下实现稳定分页。
