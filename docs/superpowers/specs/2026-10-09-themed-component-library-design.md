# 多主题组件库设计

日期:2026-10-09 · 状态:待用户确认

## 1. 背景与目标

账号定位:抖音 AI 知识分享,无人出镜。画面由手机竖屏录屏演示、图文、动画组成,配音由第三方工具生成。
**视频拼装流程用户已有,本项目只负责组件库**,外加一个"按内容生成新组件"的技能(第 4 阶段)。

目标:
- 提供整屏场景、录屏、转场等新组件,补齐无人出镜视频的常用画面。
- 所有内容类组件支持 4 种视觉风格,在根合成上改一个属性就能整体切换。
- 每个组件达到统一的质量标准(见第 7 节),4 种风格下都好看、不溢出。

## 2. 范围

**包含**
1. 主题系统:`assets/theme.css`,含 4 套主题与共享样式类。
2. 13 个新组件(第 4 节)。
3. 现有 20 个内容类组件接入主题(第 6 节)。
4. 生成组件的技能(第 4 阶段,开始前单独确认细节)。

**不包含**
- 视频拼装流程、配音、配音对齐(用户已有)。
- 字幕时间轴生成。字幕由用户现有流程处理;现有 `dy-subtitle` 组件仅做主题接入。
- 模仿抖音原生界面的 7 个组件的风格化(第 6 节)。

## 3. 主题系统

### 3.1 四套主题

主题名对应用户选定的样张方向:

| 主题 | 名称 | 背景 | 文字与强调 | 标题字体 | 特征装饰 |
|---|---|---|---|---|---|
| `minimal` | 极简发布会 | 纯黑 | 白字,蓝紫渐变强调 | 黑体 800 | 大留白、细分隔线 |
| `neon` | 霓虹赛博 | 深蓝黑 | 白字青色发光,粉红强调 | 黑体 900 | 透视网格、扫描线、斜切边框、发光 |
| `editorial` | 杂志编辑 | 米色纸张 | 近黑字,红色强调,黄色荧光笔 | 宋体(衬线)900 | 纸张颗粒、粗细分隔线、刊头 |
| `bento` | 卡片科技 | 深紫黑 | 白字,紫青渐变强调 | 黑体 800 | 光斑、点阵、毛玻璃卡片 |

### 3.2 切换方式

在 `index.html` 的根合成元素上写 `data-theme="neon"`。不写时默认 `minimal`。

**前提(第 1 阶段先实测)**:根节点上的属性和 `theme.css` 中的样式能作用到子合成内部。
如果实测不能传递,改为每个组件提供 `theme` 变量,由拼装流程统一传入同一个值。组件写法不变,只是开关的位置不同。

### 3.3 设计变量

所有内容类组件只用以下变量,不写死颜色或字体:

| 变量 | 含义 |
|---|---|
| `--hf-bg` / `--hf-bg-2` | 背景主色 / 辅助色 |
| `--hf-surface` / `--hf-surface-border` / `--hf-surface-shadow` | 卡片底色 / 边框 / 阴影或发光 |
| `--hf-text` / `--hf-muted` | 正文 / 次要文字 |
| `--hf-accent` / `--hf-accent-2` / `--hf-on-accent` | 主强调 / 次强调 / 强调色上的文字色 |
| `--hf-font-title` / `--hf-font-body` / `--hf-font-mono` | 标题 / 正文 / 等宽字体 |
| `--hf-title-weight` / `--hf-radius` | 标题字重 / 圆角 |
| `--hf-ease` / `--hf-dur` | 统一缓动曲线 / 基础动画时长(供脚本读取) |

### 3.4 共享样式类

由 `theme.css` 按主题分别定义,组件直接使用:

- `.hf-em`:关键词强调。minimal 和 bento 为渐变字,neon 为粉色发光,editorial 为黄色荧光笔底。
- `.hf-card`:卡片。neon 为斜切发光框,bento 为毛玻璃卡,editorial 为细线分隔,minimal 为极简细边。
- `.hf-kicker`:小标签或刊头。
- `.hf-title` / `.hf-text`:标题和正文排版基准。

### 3.5 字号规范

只用 6 档字号:160 / 120 / 88 / 60 / 44 / 32 px。间距按 8px 网格。

## 4. 新组件(13 个)

所有场景组件为 1080×1920,占满画面,自带主题背景。

| 组件 | 用途 | 主要变量 | 建议时长 |
|---|---|---|---|
| `scene-bg` | 主题背景层。也可单独垫在录屏或图片下 | `variant`(各主题 1 到 2 种) | 任意 |
| `scene-title` | 开场标题页 | `kicker`, `title`, `em`(强调词), `sub` | 3–5s |
| `scene-points` | 要点页,逐条出现 | `title`, `items`(用 `\|` 分隔,3 到 5 条,每条可写"标题::说明") | 4–8s |
| `scene-steps` | 步骤教程页,带进度 | `title`, `steps`(用 `\|` 分隔), `active`(高亮第几步) | 4–8s |
| `scene-image-text` | 图文页,可放大图片局部 | `src`, `caption`, `focus`(x,y,w,h,单位为图片百分比,可选) | 3–6s |
| `scene-big-number` | 数据页,数字滚动 | `label`, `value`, `prefix`, `suffix`, `note` | 3–5s |
| `scene-quote` | 金句或重点页 | `text`, `em`, `source` | 3–5s |
| `scene-compare` | 对比页 | `leftTitle`, `rightTitle`, `left`, `right`(用 `\|` 分隔), `layout`(`vertical` 或 `horizontal`) | 4–8s |
| `scene-ending` | 结尾页 | `headline`, `cta`, `next` | 3–5s |
| `rec-phone` | 手机框中播放竖屏录屏,支持标注 | `src`, `title`, `cues`(见 4.1) | 跟随录屏 |
| `tr-wipe` | 色块擦除转场 | `direction` | 0.5s |
| `tr-zoom` | 缩放闪白转场 | — | 0.5s |
| `tr-glitch` | 故障风转场(确定性实现,不用随机数) | — | 0.5s |

转场使用方式:放在两个场景的切换点,前后各盖住约 0.25 秒。转场颜色跟随主题强调色。

### 4.1 `rec-phone` 标注格式

`cues` 为 JSON 数组。时间以组件开始为 0,坐标为录屏画面的百分比(0–100):

```json
[
  {"t": 2.0, "dur": 1.2, "type": "tap",  "x": 82, "y": 9},
  {"t": 3.5, "dur": 2.0, "type": "box",  "x": 10, "y": 40, "w": 80, "h": 12, "label": "在这里粘贴提示词"},
  {"t": 6.0, "dur": 2.5, "type": "zoom", "x": 10, "y": 40, "w": 80, "h": 25}
]
```

- `tap`:点击波纹。
- `box`:框选高亮,框外变暗,可附文字说明和箭头。
- `zoom`:镜头推近到该区域,结束后拉回。

标注位置由 Claude 截取录屏对应帧后确定。
录屏视频静音(配音由拼装流程提供)。若录屏比例不是 9:19.5 左右,按"完整显示、不裁切"处理。

## 5. 动画规范

- 入场 0.4–0.6 秒,退场 0.3–0.4 秒,全部使用 `--hf-ease`。
- 同组元素逐个出现,间隔 0.12–0.2 秒。
- 每个场景在最后 0.35 秒内完成退场,方便与转场衔接。
- 只用确定性逻辑:不用 `Math.random`、`Date.now`。故障风等效果用固定种子的伪随机或预设关键帧。

## 6. 现有组件处理

| 类别 | 组件 | 处理 |
|---|---|---|
| 模仿抖音界面(7 个) | `dy-action-bar`, `dy-comment-bubble`, `dy-follow-card`, `dy-product-card`, `dy-progress-bar`, `dy-ai-badge`, `dy-safe-zone` | 不跟随主题,保持原样 |
| 内容展示(20 个) | `dy-hook-title`, `dy-subtitle`, `dy-lower-third`, `dy-rank-item`, `dy-stat-counter`, `dy-end-cta`, `dy-chapter-title`, `dy-countdown`, `dy-vs-compare`, `dy-checklist`, `dy-poll`, `dy-chat-demo`, `dy-prompt-card`, `dy-bench-bars`, `dy-tool-card`, `dy-code-block`, `dy-workflow-flow`, `dy-concept-card`, `dy-news-flash`, `dy-before-after` | 写死的颜色和字体改为主题变量与共享样式类;版式不变 |
| 花字 | `dy-sticker-pop` | 保持综艺花字风格,只有强调色跟随主题 |

各组件现有的 `accent` 等颜色变量保留:用户显式传值时覆盖主题,不传则用主题色。

## 7. 质量标准(每个组件都要满足)

1. 使用打包字体:Noto Sans SC,另加 Noto Serif SC(editorial 用)和 JetBrains Mono;根合成引入 `assets/fonts/fonts.css`。
2. 长文案自适应:单行大字自动缩字号;卡片超出安全区时先上移再缩放。沿用现有 `hfFit` / `hfFitBox`。
3. 避开抖音安全区:顶部约 200px、底部约 400px、右侧约 160px 不放关键信息。
4. `npm run check` 通过:0 错误;警告逐条审查。
5. 压测:正常文案和超长文案各截图一次。
6. **4 种主题对比截图**:每个组件在 4 种主题下各截一张关键帧,拼成对比图交用户确认。

## 8. 交付阶段与验收

| 阶段 | 内容 | 验收方式 |
|---|---|---|
| 1 | 主题系统 + 主题传递实测 + `scene-bg` + `scene-title` | 4 种主题对比图 + 几秒的动态样片 |
| 2 | 其余 7 个场景 | 每个组件的 4 主题对比图 |
| 3 | `rec-phone` + 3 种转场 | 用生成的占位录屏做演示片段;有真实录屏后再验证一次 |
| 4 | 现有 20 个内容组件接入主题 | 4 主题对比图 |
| 5 | 生成组件的技能 | 开始前单独确认技能的范围和使用方式 |

每个阶段完成后提交并推送到 `feat/dy-ai-components` 分支,用户确认后再进入下一阶段。

## 9. 风险与对策

- **主题无法传入子合成**:第 1 阶段先实测;不行则改用组件变量传主题(见 3.2)。
- **仓库体积**:新增衬线字体约 6MB,字体合计约 11MB。可以接受;如果介意,可以只保留标题常用字重。
- **录屏素材**:测试阶段用 ffmpeg 生成占位竖屏视频;标注定位效果需要用户的真实录屏最终验证。
- **审美偏差**:每阶段都给用户看图确认,用户反馈的偏好写进第 5 阶段技能的规范里。

## 10. 模块化与分发(2026-10-09 补充)

用户要求组件库能被其他 HyperFrames 项目快速接入,且仓库将公开。采用 HyperFrames 官方 registry 机制:

- **命名空间**:组件库称为 `dykit`。资源统一放在 `assets/dykit/`(`dykit.css` 入口、`theme.css`、`hf-kit.js`、`fonts/`);所有组件文件名和 `data-composition-id` 以 `dy-` 开头(新组件如 `dy-scene-title`、`dy-rec-phone`、`dy-tr-wipe`)。
- **接入方式**:消费项目在 `hyperframes.json` 中设置 `"registry": "https://raw.githubusercontent.com/18826400652/hyperframes/main/registry"`,运行 `npx hyperframes add dy-scene-title` 即可安装组件,依赖的 `dykit` 资源包会自动一并安装;然后在 `index.html` 的 `<head>` 加两行:
  `<link rel="stylesheet" href="assets/dykit/dykit.css" />`、`<script src="assets/dykit/hf-kit.js"></script>`。
- **registry 目录**:`registry/` 由 `scripts/build-registry.mjs` 从 `compositions/` 和 `assets/dykit/` 生成并提交。组件 html 复制进 `blocks/<名称>/`;资源包文件不复制,`registry-item.json` 用 `file.url`(官方字段,允许从绝对 https 地址下载)指向本仓库 `main` 分支的 `assets/dykit/`,避免字体在仓库里存两份。`--check` 模式用于确认 registry 与源文件一致。
- **验收**:端到端测试在本地 HTTPS 服务上模拟远程 registry,把组件安装进一个空项目,并在该项目上 `check` 通过。
- registry 要等仓库公开、并合并到 `main` 分支后,其他项目才能真正使用。
