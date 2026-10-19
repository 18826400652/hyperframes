# 抖音自媒体组件库 dykit (HyperFrames)

竖屏 1080×1920 的 HyperFrames 组件库，面向无真人出镜的 AI 知识类抖音视频：整屏场景模板、手机录屏演示、转场，以及可叠加在素材上的标题、字幕、卡片等组件。4 套预设主题一键切换,另有 custom 主题可套用自己的配色。

## 在其他 HyperFrames 项目中接入

1. 在项目的 `hyperframes.json` 中设置 registry:
   ```json
   { "registry": "https://raw.githubusercontent.com/18826400652/hyperframes/main/registry" }
   ```
2. 安装需要的组件(会自动安装依赖的 `dykit` 主题与资源包):
   ```bash
   npx hyperframes add dy-scene-title
   ```
3. 在 `index.html` 的 `<head>` 中加入两行(放在 gsap 之后),并在根合成元素上选择主题:
   ```html
   <link rel="stylesheet" href="assets/dykit/dykit.css" />
   <script src="assets/dykit/hf-kit.js"></script>
   <!-- <div id="root" data-composition-id="main" data-theme="neon" ...> -->
   ```

> registry 需要本仓库公开且合并到 `main` 分支后才能被其他项目访问。

## 从旧版组件升级

- `index.html` 的 `<head>` 需要换成上面第 3 步的两行(`dykit.css` + `hf-kit.js`);旧的 `assets/fonts/fonts.css` 已移到 `assets/dykit/fonts/`,不再单独引用。缺少 `hf-kit.js` 时组件会报错。
- 变量名都没变。颜色变量(`accent`、`keyColor`、`leftColor`、`colorB` 等)的默认值改为空,留空时跟随主题色;仍可传入颜色覆盖,组件会按颜色深浅自动选黑字或白字,非法颜色值会被忽略。
- 颜色变量在 Studio 里由颜色选择器变为文本框(空默认值才能表示"跟随主题")。

## 主题

在根合成元素上设置 `data-theme` 即可切换整片风格,不写时为 `minimal`:

| 主题 | 风格 | 底色 / 强调色 |
|---|---|---|
| `minimal` | 极简发布会:纯黑底、大字、克制的蓝紫强调 | 黑 / 蓝 `#2997ff`、紫 `#a259ff` |
| `neon` | 霓虹赛博:网格地面、发光描边、切角卡片 | 深蓝黑 / 青 `#25f4ee`、红 `#fe2c55` |
| `editorial` | 杂志编辑:米色纸张、衬线标题、荧光笔高亮 | 米白 / 红 `#c8201a`、黄 `#ffd43b` |
| `bento` | 卡片科技:深色玻璃卡片、圆角、柔光 | 深紫黑 / 紫 `#9d8bff`、青 `#25f4ee` |
| `custom` | 自定义配色:颜色、字体由你给,无装饰背景 | 默认米白 / 红 `#c8201a`、蓝 `#1f4fbf`,荧光笔黄 `#ffd84d` |

### custom(自定义配色)

给宿主元素(或它的外层)写 `data-theme="custom"` 和这些 CSS 变量,组件就按你的颜色和字体画,没写的用上表的默认值:

| 变量 | 含义 |
|---|---|
| `--hf-custom-bg` / `--hf-custom-text` / `--hf-custom-muted` | 底色 / 正文色 / 次要文字色 |
| `--hf-custom-accent` | 强调色。组件会把它当文字色、描边色用,和底色的对比度要 ≥ 3:1 |
| `--hf-custom-alert` | 第二强调色(警示、对比的另一边) |
| `--hf-custom-highlight` / `--hf-custom-on-highlight` | 荧光笔高亮的底色(可以是浅色)/ 高亮上的文字色 |
| `--hf-custom-on-accent` / `--hf-custom-on-alert` | 压在强调色色块上的文字色 |
| `--hf-custom-font-title` / `--hf-custom-font-body` | 标题 / 正文字体 |

深色底配浅色荧光笔时,折成两行的高亮词会被 `hyperframes check` 误报对比度不足(它按整块外框取底色),截图确认即可。

```html
<div data-composition-id="dy-scene-steps" data-composition-src="compositions/dy-scene-steps.html" data-theme="custom"
     style="--hf-custom-bg:#101114;--hf-custom-text:#f4f1ea;--hf-custom-accent:#ffd84d;--hf-custom-on-accent:#1c1a17" ...></div>
```

单个组件可以单独覆盖(写在挂载点的 `data-variable-values` 里):

- `"theme": "editorial"`:只让这一个组件用另一套主题;
- `"accent": "#ff6a00"`:覆盖强调色(留空用主题色)。部分组件还有第二个颜色变量(如 `dy-vs-compare` 的 `leftColor`、`dy-poll` 的 `colorB`、`dy-subtitle` 的 `keyColor`),留空同样跟随主题。

主题的全部取值集中在 `assets/dykit/theme.css`(CSS 变量 `--hf-*`),要新增或微调主题只改这一个文件。

**抖音界面类 7 个组件不跟随主题**(`dy-comment-bubble`、`dy-action-bar`、`dy-follow-card`、`dy-product-card`、`dy-progress-bar`、`dy-ai-badge`、`dy-safe-zone`):它们模仿抖音 App 自身的界面，保持原样才像。

## 组件

组件都在 `compositions/`,文案、颜色通过变量覆盖。"建议时长"即挂载点的 `data-duration`。

### 整屏场景(自带主题背景)

| 组件 | 用途 | 主要变量 | 建议时长 |
|---|---|---|---|
| dy-scene-bg | 纯主题背景(给叠加组件垫底) | variant(1 / 2) | 任意 |
| dy-scene-title | 开场标题页 | kicker, title, em(强调词), sub | 4s |
| dy-scene-points | 要点页(`标题::说明` 用 `\|` 分隔) | title, items | 6s |
| dy-scene-steps | 步骤页 | title, steps, active | 6s |
| dy-scene-image-text | 图文页(可放大图片局部) | src, caption, focus(x,y,w,h 百分比) | 6s |
| dy-scene-big-number | 数据大字页 | label, value, prefix, suffix, note | 4.5s |
| dy-scene-compare | 对比页(上下 / 左右) | leftTitle, rightTitle, left, right, layout | 6s |
| dy-scene-timeline | 时间线页(`时间::事件` 用 `\|` 分隔,逐个高亮;连续画面用 active 1、2、3… 接着讲) | title, items, active | 6s |
| dy-scene-quote | 金句页 | text, em, source | 4s |
| dy-scene-ending | 结尾页(三连 + 下期预告) | headline, cta, next | 4s |

### 录屏与转场

| 组件 | 用途 | 主要变量 | 建议时长 |
|---|---|---|---|
| dy-rec-phone | 手机框录屏,支持点击波纹 / 框选高亮 / 局部放大 | src(录屏路径), title, cues(JSON), ratio | 录屏时长 |
| dy-tr-wipe | 色带擦除转场 | direction(left / up) | 0.5s |
| dy-tr-zoom | 圆形放大转场 | - | 0.5s |
| dy-tr-glitch | 故障切片转场 | - | 0.5s |

`cues` 示例(坐标为录屏画面的百分比,`t` 为组件内秒数):

```json
[{"t":1.5,"dur":1.2,"type":"tap","x":82,"y":9},
 {"t":3,"dur":2,"type":"box","x":10,"y":40,"w":80,"h":12,"label":"在这里粘贴提示词"},
 {"t":5.4,"dur":2,"type":"zoom","x":10,"y":40,"w":80,"h":25}]
```

`ratio` 一般留空(自动读取录屏宽高比);手动填写时必须与录屏一致,否则画面会留黑边、标注位置对不上。

转场在 0.25 秒处完全盖住画面:把转场挂在两个场景的切换点前 0.25 秒(如场景在 4s 切换，转场 `data-start="3.75" data-duration="0.5"`),层级放在场景之上。同一视频里可以多次使用 `dy-rec-phone`,每个实例各自播放自己的录屏。

### 叠加组件(透明背景，跟随主题)

叠加在录屏、图片或 `dy-scene-bg` 上使用。文字用主题文字色加底色描边，面板用不透明的 `.hf-panel`,在任意画面上都可读。

| 组件 | 用途 | 主要变量 | 建议时长 |
|---|---|---|---|
| dy-hook-title | 前 3 秒钩子大标题(关键词高亮) | kicker, line1, before, keyword | 4s |
| dy-subtitle | 逐字高亮字幕(`\|` 分句) | lines, secondsPerLine, keyColor | 句数×每句秒数 |
| dy-chapter-title | 章节标题("01 先说结论") | index, title, sub | 4s |
| dy-countdown | 3-2-1 倒计时 + 结束文案 | from, label | from+1s |
| dy-end-cta | 结尾引导(点赞关注 + 下期预告) | headline, sub, next | 4s |
| dy-lower-third | 人设条(姓名 / 头衔 / 标签) | name, title, tags | 4s |
| dy-rank-item | 榜单 / Top N 卡片 | rank, title, subtitle | 4s |
| dy-checklist | 要点清单逐条打勾 | title, items | 0.7+条数×1.2+1.2s |
| dy-prompt-card | 提示词模板卡 | title, fields(`名\|内容;`), cta, layout(留空 / inline:名称做圆标和内容同一行) | 约 3+条数×0.8s |
| dy-news-flash | AI 快讯卡 | tag, date, company, headline, points, source | 约 4+要点数×0.7s |
| dy-stat-counter | 数据大字滚动 | label, value, prefix, suffix, delta | 4.5s |
| dy-vs-compare | PK 对比表(胜方高亮) | leftName, rightName, rows(`项\|左\|右\|L/R;`), leftColor | 6s |
| dy-poll | A/B 投票 | question, optionA, optionB, pctA, cta, colorB | 6s |
| dy-bench-bars | AI 模型评测条形图(领先者高亮) | title, rows(`名\|分;`), max, unit, note | 约 5s |
| dy-before-after | 效率对比(以前 vs 用 AI) | beforeLabel, beforeValue, afterLabel, afterValue, gain | 6s |
| dy-chat-demo | AI 对话演示(提问打字→思考→回答打字) | prompt, reply, aiName, hold | 约 3+字数×0.05s |
| dy-tool-card | AI 工具推荐卡 | name, logo, tagline, tags, rating, price, url | 5s |
| dy-code-block | 代码块打字机(等宽字体) | file, code(`\|` 分行), speed | 约 3+字符数/speed s |
| dy-workflow-flow | AI 工作流纵向流程(AI 步骤高亮) | title, steps, aiSteps | 约 3+步数×0.7s |
| dy-receipt | AI 结果小票:编号明细逐行打出,圈出重复编号,合计标错 / 标对 | title, sub, rows(`名称::编号::数量`,`\|` 分隔), total, verdict(wrong / right), dup, check | 5s |
| dy-answer-check | AI 回答核对:出错的行标出并划掉、盖章、改成「待确认」 | title, lines(`\|` 分隔), wrong(行号), stamp, fix | 6s |
| dy-tick-grid | 1 到 N 编号格子逐个打勾 | title, count, cols | 5s |
| dy-stamp | 印章盖下来(下结论、拍板) | text, note, color, rotate | 2.5s |
| dy-concept-card | 名词解释卡(术语 / 人话 / 比方) | term, en, plain, analogy | 6s |
| dy-sticker-pop | 花字贴纸弹出(只有阴影色跟随主题) | text, emoji, color, rotate, x, y | 2.5s |

### 抖音界面类(不跟随主题)

| 组件 | 用途 | 主要变量 | 建议时长 |
|---|---|---|---|
| dy-comment-bubble | 评论区引用气泡 | nick, text, likes, pinned | 4s |
| dy-action-bar | 右侧点赞 / 评论 / 收藏 / 转发栏 | likes, comments, favs, shares | 5s |
| dy-follow-card | 关注引导卡(点击→已关注) | name, handle, fans, avatarText | 4.5s |
| dy-product-card | 带货商品卡 | tag, name, price, origin, coupon, stock, stockPct, hint | 5s |
| dy-progress-bar | 顶部章节进度条(覆盖全片,半透明黑底，浅色画面上也清晰;标签多时自动缩字号) | labels, duration(须等于挂载时长), accent | 全片 |
| dy-ai-badge | "内容由 AI 辅助生成"角标(位于进度条与内容区之间) | text | 全片 |
| dy-safe-zone | 抖音安全区参考线(仅设计时用) | - | - |

## 口播稿生成画面清单(dykit-storyboard 技能)

在 Claude Code 里打开本仓库,把完整口播稿发给 Claude,说"帮我出画面清单"(可指定主题和视频名)。技能 `.claude/skills/dykit-storyboard/` 会:

1. 把口播按意思切成 3~8 秒的画面,为每个画面从组件目录(`catalog/catalog.json`)里选组件、提炼文案;
2. 输出 `storyboards/<视频名>.json`,并用校验脚本检查到通过;
3. 现有组件表达不了的内容,按 `component-guide.md` 生成新组件,出 5 主题对比图给你确认,确认后才入库推送。

清单每个画面包含:口播原文 `script`、组件 `component` 与变量 `variables`、估算时长 `duration`(每秒 4 字,可由配音实际时长覆盖)、叠加组件 `overlays`、转场 `transitionIn`、需要你补的素材 `needs`(录屏 / 截图)。主组件为叠加类(透明背景)时,组装时在下面垫 `dy-scene-bg`;转场挂在画面开始前 0.25 秒、时长 0.5 秒。

手动校验一份清单:

    npm run storyboard:check -- storyboards/<视频名>.json --script storyboards/<视频名>.txt          # 格式 + 渲染检查
    npm run storyboard:check -- storyboards/<视频名>.json --no-render                               # 只查格式(秒级)

校验内容:组件与变量是否存在、显示文字的变量是否都填写(漏填会露出组件示例文案)、数字是否都来自口播、口播是否逐字完整、时长与叠加是否合理;渲染检查把每个画面的真实文案装进组件,检查溢出、遮挡、对比度和底部字幕区。

新组件入库后,运行 `npm run build:catalog` 更新目录(`catalog/notes.json` 里写明它适合什么口播内容),以后同类口播会直接选中它。

## 使用

在 `index.html` 里挂载，并用 `data-variable-values` 覆盖文案:

    <div id="t1" data-composition-id="dy-scene-title" data-composition-src="compositions/dy-scene-title.html"
         data-start="0" data-duration="4" data-width="1080" data-height="1920"
         data-variable-values='{"title":"3 个 AI 工具让你下班提前 2 小时","em":"提前 2 小时"}'></div>

本仓库的 `index.html` 是全部组件的演示:0–132.5s 为叠加组件,132.5s 之后为整屏场景、录屏与转场。

命令:`npm run dev` 预览 · `npm run check` 检查 · `npm run render` 输出 MP4(`--variables` 可全局覆盖)。

## 开发与测试

- `npm test`:registry 一致性 + 端到端安装测试，以及全部组件 × 5 主题的检查(custom 主题按组件交替用一套浅色、一套深色测试配色)(静态检查、`hyperframes check --strict`、底部字幕安全区、录屏与转场的像素断言)。
- 测试用例在 `tests/cases/<组件>.json`:每个组件至少有正常文案和超长文案(含 `<b>&"`)两组。
- `node tests/run.mjs <组件> [--theme neon]` 只测部分组件;`node tests/sheet.mjs <组件> [--variant long]` 生成 5 主题对比图到 `tests/.out/`。
- 修改 `compositions/dy-*.html` 或 `assets/dykit/` 后运行 `npm run build:registry` 重新生成 `registry/`(测试会检查是否已同步)。
- `registry/` 里只有组件和清单;资源包(`assets/dykit/` 下的字体、样式、脚本)不复制进去,清单用 `url` 直接指向本仓库 `main` 分支的源文件。所以移动或删除 `assets/dykit/` 里的文件会让已发布的 registry 安装失败。

## 字体

中文字体已随项目打包在 `assets/dykit/fonts/`(Noto Sans SC、Noto Serif SC 可变字体 + 代码块用 JetBrains Mono,均为 SIL OFL 开源许可),在任何机器(包括云端渲染)上效果一致。根合成必须在 `<head>` 里引入一次 `assets/dykit/dykit.css`。GSAP 已本地化在 `assets/`。

## 长文案自适应

- 单行大字(钩子标题、数据大字、花字、术语、工具名、对比数值等)放不下时自动缩小字号，缩到下限仍放不下才换行。
- 多行文字超过限定行数时缩小字号;卡片超出底部安全区(距底 400px,抖音文案 / 按钮区)时，先整体上移，仍放不下再等比缩小。
- 内容再多也不会被裁切，但缩得太小就不好读了。单张卡片建议不超过 5 条，每条一两行。

## 注意

- emoji(🔥👇🚀 等)依赖渲染机自带的彩色 emoji 字体，本机渲染一般正常;云端渲染可能显示为方块，介意的话文案里不用 emoji。
- 打字机类组件(`dy-chat-demo`、`dy-code-block`)和清单类组件的时长随内容变化，挂载的 `data-duration` 要不小于表中估算值，否则退场动画会被截掉。
- `dy-rec-phone` 的录屏请用静音视频(组件以静音播放);配音用单独的 `<audio>`。
