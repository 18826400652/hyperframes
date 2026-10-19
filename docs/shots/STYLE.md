# 镜头库视觉语法（dy-shot-*）

> 所有 `dy-shot-*` 镜头遵守这一份，整片才像一个世界，而不是 12 个模板。每个镜头的 `SHOT.md` 引用这里，不重复写。
> 方向：回形针式科普的视觉语法 × 项目自己的配色（`palette`）。来源：self-media-skills `docs/superpowers/specs/2026-10-19-shot-library-design.md` 第 4.2 节。

## 1. 贴纸

真实素材（截图、录屏、回答、照片）一律抠成贴纸：白描边 + 三层投影。**凡是实测里真实发生的画面，用真实素材，不画假界面。**

```js
HF.sticker(el);   // 加 .hf-sticker：10px 白描边、14px 圆角、硬边 + 远近两层投影（dykit.css）
```

## 2. 画布和镜头

每个镜头内部有一个比画面大的画布层（stage）。信息点摆在画布上，镜头推、拉、平移去找它们，而不是元素在原地淡入。

```js
HF.camera(tl, stage, [
  { t: 0, x: 0, y: 0, scale: 1 },                    // 初态
  { t: cue[0], x: -320, y: -140, scale: 1.8 },       // 推到第一处
  { t: cue[1], x: -60, y: -520, scale: 1.6, dur: 0.8 },
]);
```

镜头移动 `power2.inOut` 0.8–1.2 秒。推近后要读的那一行标 `data-vd-zoom="@词"`（vd qa 查它在内容区里、字号 ≥37px）；推近的是图片里的字时，再写 `data-vd-zoom-text="<这行字在布局里的像素高>"`。

## 3. 引线标注

细线 + 圆点 + 标签，标签用粗等线字（`var(--hf-font-body)`，900）。

```js
HF.leader(tl, document.getElementById("s-line-1"), cue[0]);   // SVG line / path 从起点画到终点，0.4 秒
```

## 4. 字阶

| 层级 | 字号 | 字重 |
|---|---|---|
| 首帧大字 | 96–140px | 900 |
| 段标题 | 64–80px | 900 |
| 正文 | ≥40px | 700 |
| 大数字 | ≥200px | 900 |
| 标签 | 22–26px | 700 |

同一画面最大 / 主体 ≥1.6。字体只用 Noto Sans SC / Noto Serif SC / JetBrains Mono。每个文本变量在变量声明里写 `maxChars`，vd build 超了会提醒导演删字——镜头内部不要把超长文字缩成小字。

## 5. 颜色

只用主题变量，不写死色值（贴纸白边除外）：底 `--hf-bg`、字 `--hf-text`、辅助 `--hf-muted`、强调 `--hf-accent`；荧光笔底色 `var(--hf-custom-highlight, var(--hf-accent))`、错的 `var(--hf-custom-alert, var(--hf-accent))`（这两个只在 vd 用的 custom 主题下有值，其余主题回退到强调色，五主题测试照样能跑）。比例：底 60 / 主体 30 / 强调 10。荧光黄（highlight）只做"重点"，红（alert）只做"错的 / AI 编的"。

## 6. 动效

- 入场 `power3.out` 0.45–0.6 秒；退场更快（`power2.in` 0.25 秒）
- 重拍 `back.out(1.4)`，和 catalog 里声明的 `sfx` 同一拍
- 每 2–3 秒一次信息变化（新元素、推近、数字、反转）；不要靠呼吸动画撑静止

## 7. 平移转场

vd 在相邻两段之间写变量 `enter` / `exit`（`"pan-left:0.6"`）。每个镜头都要接：

```js
HF.panInOut(tl, root, { enter: v.enter, exit: v.exit, duration: HF.duration(root) });
```

## 8. 版面（抖音）

内容区 x 60–1020、y 230–1150；字幕带 y 1180–1440 不放东西；顶部 200、右侧 160（y 760 往下）、底部 480 是平台界面；左上角栏目标签全片都在，不能压。

## 9. seek 安全

每一帧是时间的纯函数：单条暂停的 GSAP 时间线，`immediateRender: false`，初态用 `gsap.set`；随机数要有种子。
