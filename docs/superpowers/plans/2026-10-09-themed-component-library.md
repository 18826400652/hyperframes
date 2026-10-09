# 多主题组件库 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 4 主题(minimal / neon / editorial / bento)的样式系统,新增 13 个整屏、录屏、转场组件,并让现有 20 个内容组件接入主题。

**Architecture:** `assets/theme.css` 用 `[data-theme]` 定义设计变量和共享样式类;`assets/hf-kit.js` 提供组件公用的 JS 工具(`window.HF`);根合成 `index.html` 引入它们,并在根元素上设置 `data-theme`。每个组件仍是 `compositions/` 下的独立 HTML 子合成,只引用主题变量。测试脚本 `tests/run.mjs` 为每个组件、每个主题生成临时合成项目,用 `hyperframes check --strict` 判定是否通过,并输出 4 主题对比图。

**Tech Stack:** HyperFrames 0.8.143(CLI 固定版本)、GSAP(`assets/gsap.min.js`)、Node 22、ffmpeg(拼对比图、生成占位录屏)。

**Spec:** `docs/superpowers/specs/2026-10-09-themed-component-library-design.md`

## Global Constraints

- CLI 一律用 `npx --yes hyperframes@0.8.143 …`(与 `package.json` 一致)。
- 主题名固定:`minimal`(默认)、`neon`、`editorial`、`bento`。
- 字号只用 6 档:160 / 120 / 88 / 60 / 44 / 32 px。间距为 8px 的倍数。
- 安全区:顶部 200px、底部 400px、右侧 160px 不放关键信息;卡片上移下限 260px,底边上限 1520px。
- 场景内容区统一为 `left: 80px; right: 160px`(右侧给抖音互动栏留位);只有背景、录屏手机框和转场可以占满全宽。
- 动画:入场 0.4–0.6s,退场 0.3–0.4s,同组间隔 0.12–0.2s;场景在最后 0.35s 内完成退场。缓动从主题变量读取。
- 只用确定性逻辑:组件中禁止 `Math.random`、`Date.now`、网络请求。
- 主题化组件的 `<style>` 中禁止十六进制颜色字面量;颜色一律用 `var(--hf-*)`。变量声明里的默认值不受此限。
- 用户文案一律用 `textContent` 写入,不用 `innerHTML` 拼接用户文本。
- 每个组件提供 `theme`(string,默认 `""`)和 `accent`(string,默认 `""`)变量。非空时覆盖主题。
- 新组件统一 `dy-` 前缀(见 Task 3b);资源路径为 `assets/dykit/`。
- 模仿抖音界面的 7 个组件(`dy-action-bar`、`dy-comment-bubble`、`dy-follow-card`、`dy-product-card`、`dy-progress-bar`、`dy-ai-badge`、`dy-safe-zone`)不改。
- 每个阶段结束提交并 `git push origin feat/dy-ai-components`,把 4 主题对比图发给用户,用户确认后才进入下一阶段。

## Review Focus

1. **可选变量全部不填**(没有 `sub`、`em`、`focus` 等):不能出现空白色块或空标签,布局要自然收拢。→ 每个组件的 `sparse` 用例。
2. **文案含 `<b>`、`&`、引号**:按原样显示,不被解析成 HTML。→ 每个组件的 `long` 用例,文案里带 `<b>&"`。
3. **条目数超出建议**(要点 7 条、步骤 1 条):仍在安全区内,不溢出。→ 列表类组件的 `many` 用例。
4. **同一视频里同一组件挂两次、主题不同**:各自按自己的主题显示,互不影响。→ Task 1 的探针用例。
5. **录屏不是竖屏**(误传 16:9 视频):完整显示不裁切,标注仍落在视频画面上。→ Task 11 的 `landscape` 用例。

---

## 文件结构

```
assets/theme.css                 4 主题设计变量 + 共享类 .hf-em .hf-card .hf-kicker .hf-title .hf-text .hf-bg
assets/hf-kit.js                 window.HF 工具集
assets/fonts/fonts.css           追加 Noto Serif SC 的 @font-face
assets/fonts/noto-serif-sc/      衬线字体子集文件(101 个 woff2)+ LICENSE.txt
compositions/scene-*.html        8 个场景 + scene-bg
compositions/rec-phone.html      录屏组件
compositions/tr-*.html           3 个转场
tests/run.mjs                    测试入口:生成用例合成 → check → 静态检查
tests/sheet.mjs                  4 主题对比图(snapshot + ffmpeg 拼图)
tests/cases/<component>.json     每个组件的用例
tests/probe/theme-probe.html     主题传递探针组件
tests/media/rec-sample.mp4       占位竖屏录屏(886×1920,8 秒)
tests/media/rec-landscape.mp4    占位横屏录屏(1920×1080,8 秒)
tests/.out/                      生成物(加入 .gitignore)
```

## 测试约定(所有任务共用)

`tests/cases/<id>.json` 格式:

```json
{
  "component": "scene-title",
  "duration": 4,
  "peak": 2.5,
  "variants": {
    "normal": { "title": "3 个 AI 工具让你下班提前 2 小时", "em": "提前 2 小时" },
    "long":   { "title": "<b>&\" 如何用 AI 在一天之内做完原本需要一整周的工作量", "em": "一整周" },
    "sparse": { "title": "AI 提效" }
  }
}
```

`node tests/run.mjs <id> [--theme neon]` 的流程:
1. 在 `tests/.out/<id>-<theme>/` 生成项目:符号链接 `assets`、`compositions`,复制 `package.json`、`hyperframes.json`、`meta.json`。
2. 生成 `index.html`:根元素 `data-theme="<theme>"`;每个变体各占一个时段,时长为 `duration`,依次挂载。
3. 运行 `npx --yes hyperframes@0.8.143 check <dir> --strict --json --caption-zone "x0=0;y0=0.79;x1=1;y1=1;severity=error" --at <每个变体的起点+peak>`。只要有 error 或 warning,就退出码非 0,并打印问题。
4. 静态检查组件文件:不含 `Math.random`、`Date.now`;主题化组件 `<style>` 内无十六进制颜色;用户文案不经 `innerHTML`。
5. 不传 `--theme` 时依次跑 4 个主题,全部通过才算通过。

`node tests/sheet.mjs <id>` 在 4 个主题下各截取 `normal` 变体 `peak` 时刻的画面,用 ffmpeg `hstack` 横向拼成 `tests/.out/<id>-themes.png`。

"测试失败"在本项目中指:`run.mjs` 退出码非 0,原因包括组件不存在、check 报错或警告、静态检查不通过。

---

## 阶段 1:主题系统 + 开场标题

### Task 1: 测试脚手架 + 主题系统 + HF 工具集

**Files:**
- Create: `tests/run.mjs`, `tests/sheet.mjs`, `tests/probe/theme-probe.html`, `tests/cases/theme-probe.json`, `assets/theme.css`, `assets/hf-kit.js`, `assets/fonts/noto-serif-sc/*`
- Modify: `assets/fonts/fonts.css`(追加衬线字体),`package.json`(加 `"test": "node tests/run.mjs"`),`.gitignore`(加 `tests/.out/`),`index.html`(head 引入 `assets/theme.css` 和 `assets/hf-kit.js`,根元素加 `data-theme="minimal"`)

**Interfaces:**
- Produces(`window.HF`,由 `assets/hf-kit.js` 定义,须在 gsap 之后、子合成脚本之前加载):
  - `HF.applyTheme(root: HTMLElement, v: object): void`:`v.theme` 非空时设置 `root.dataset.theme`;`v.accent` / `v.accent2` 非空时设置 `--hf-accent` / `--hf-accent-2`。
  - `HF.motion(root: HTMLElement): {ease: string, easeOut: string, dur: number, stagger: number}`:读取 `--hf-ease`、`--hf-ease-out`、`--hf-dur`、`--hf-stagger`,缺省为 `"power3.out"`、`"power2.in"`、`0.5`、`0.15`。
  - `HF.fit(el, maxW, minPx)`、`HF.fitBox(el, bottom = 1520, minTop = 260)`:语义与现有组件内联的 `hfFit` / `hfFitBox` 相同。
  - `HF.refit(fn: () => void): void`:立即执行一次,并在 `document.fonts.ready` 后再执行一次。
  - `HF.split(s: string, sep = "|"): string[]`:切分、去空白、去空项。
  - `HF.pair(s: string): [string, string]`:按 `"::"` 拆成标题和说明;没有说明时第二项为 `""`。
- Produces(`theme.css`):设计变量 `--hf-bg --hf-bg-2 --hf-surface --hf-surface-border --hf-surface-shadow --hf-text --hf-muted --hf-accent --hf-accent-2 --hf-on-accent --hf-font-title --hf-font-body --hf-font-mono --hf-title-weight --hf-radius --hf-ease --hf-ease-out --hf-dur --hf-stagger`;共享类 `.hf-em .hf-card .hf-kicker .hf-title .hf-text`;背景结构 `.hf-bg > i.hf-bg-a, i.hf-bg-b, i.hf-bg-c`(支持 `data-variant="1|2"`)。`:root` 与 `[data-theme="minimal"]` 取同一组值。各主题取值以 `scratchpad` 样张为准:minimal 纯黑加蓝紫渐变;neon `#06060d` 加青色发光加粉色强调,网格、扫描线、光晕;editorial `#f2ede3` 纸张颗粒、红色 `#d7261e`、黄色荧光笔 `#ffd43b`、衬线标题;bento `#0a0a12` 紫青光斑加点阵加毛玻璃。

- [ ] **Step 1: 写探针组件和用例(会失败的测试)**
  `tests/probe/theme-probe.html`:子合成。脚本读取 `getComputedStyle(root).getPropertyValue("--hf-bg")`,若为空就 `throw new Error("theme vars not inherited")`;再检查一个 `.hf-em` 元素的计算样式在当前主题下是否符合预期(neon 下 `text-shadow` 不为 `none`;editorial 下 `::before` 存在荧光笔底色),不符合就抛错。`tests/cases/theme-probe.json` 的组件路径指向 `tests/probe/`。另加一个"双实例"变体:同一时段挂两个探针,第二个传 `{"theme":"editorial"}`,探针校验自己的 `dataset.theme` 与计算出的 `--hf-bg` 一致。
- [ ] **Step 2: 写 `tests/run.mjs` 和 `tests/sheet.mjs`,运行 `node tests/run.mjs theme-probe`**
  预期:FAIL(`theme.css` 和 `hf-kit.js` 还不存在,探针抛错)。
- [ ] **Step 3: 实现 `assets/theme.css`、`assets/hf-kit.js`;加入衬线字体并在 `fonts.css` 中声明 `'Noto Serif SC Variable'`;修改 `index.html`、`package.json`、`.gitignore`**
  衬线字体来自 `npm pack @fontsource-variable/noto-serif-sc@5.3.0`,`url()` 路径改为 `noto-serif-sc/`。
- [ ] **Step 4: 运行 `node tests/run.mjs theme-probe`**
  预期:4 个主题全部 PASS。若主题无法传入子合成,`HF.applyTheme` 已提供按组件传主题的方式;此时把"由拼装流程给每个组件传 `theme`"写入 README,并在本任务记录结论。
- [ ] **Step 5: 运行 `npm run check`**
  预期:Check passed(现有演示不受影响)。
- [ ] **Step 6: Commit**
  `git add assets tests package.json .gitignore index.html && git commit -m "主题系统、HF 工具集与测试脚手架"`

### Task 2: `scene-bg`

**Files:** Create `compositions/scene-bg.html`, `tests/cases/scene-bg.json`

**Interfaces:**
- Consumes: `.hf-bg` 结构、`HF.applyTheme`
- Produces: 变量 `variant`(`"1"` | `"2"`,默认 `"1"`)、`theme`、`accent`。其他场景直接复用 `.hf-bg` 结构,不嵌套本组件。

- [ ] **Step 1: 写用例** `normal`:`{}`;`v2`:`{"variant":"2"}`;`override`:`{"theme":"neon"}`。duration 4,peak 2。
- [ ] **Step 2: `node tests/run.mjs scene-bg`**,预期 FAIL(组件不存在)。
- [ ] **Step 3: 实现组件**:只有 `.hf-bg` 和三层装饰;动画为装饰层缓慢漂移(4 秒内位移不超过 40px),无文字。
- [ ] **Step 4: `node tests/run.mjs scene-bg`**,预期 PASS。
- [ ] **Step 5: Commit** `git commit -m "scene-bg 主题背景"`

### Task 3: `scene-title` + 阶段 1 验收

**Files:** Create `compositions/scene-title.html`, `tests/cases/scene-title.json`

**Interfaces:**
- Consumes: `HF.applyTheme`、`HF.motion`、`HF.fit`、`HF.refit`、`.hf-bg`、`.hf-kicker`、`.hf-title`、`.hf-em`
- Produces: 变量 `kicker`、`title`、`em`(强调词,须是 `title` 的子串;不是子串时追加到标题末尾)、`sub`、`theme`、`accent`

- [ ] **Step 1: 写用例**:即"测试约定"中的示例,另加 `kicker`、`sub`。duration 4,peak 2.5。
- [ ] **Step 2: `node tests/run.mjs scene-title`**,预期 FAIL。
- [ ] **Step 3: 实现**:版式参照样张(标题字号 120,左对齐,纵向位置约 600–1150px);`em` 拆分后用 `<span class="hf-em">` 包裹,设置 `textContent`,并保持不换行;标题用 `HF.fit(title, 0, 88)`;`kicker`、`sub` 为空时移除对应元素。动画:kicker、标题、副标题依次入场,最后 0.35s 退场。
- [ ] **Step 4: `node tests/run.mjs scene-title`**,预期 PASS。
- [ ] **Step 5: `node tests/sheet.mjs scene-title`**,并渲染 4 秒 MP4 样片:`npx --yes hyperframes@0.8.143 render tests/.out/scene-title-neon -o tests/.out/scene-title-neon.mp4`。
- [ ] **Step 6: Commit + push**:`git commit -m "scene-title 开场标题页" && git push origin feat/dy-ai-components`
- [ ] **Step 7: 阶段 1 验收**:把 `scene-bg`、`scene-title` 的对比图和 MP4 发给用户,等用户确认后再继续。

### Task 3b: 模块化 dykit + registry 分发(用户追加需求,见 Spec 第 10 节)

**Files:**
- Move: `assets/theme.css`、`assets/hf-kit.js`、`assets/fonts/` → `assets/dykit/`;Create `assets/dykit/dykit.css`(`@import` 字体与主题)
- Rename: `compositions/scene-bg.html` → `dy-scene-bg.html`,`scene-title.html` → `dy-scene-title.html`(composition id 与 `__timelines` 键同步改),`tests/cases/` 同步
- Create: `scripts/build-registry.mjs`、`registry/`(生成物)、`tests/registry.test.mjs`
- Modify: `tests/lib.mjs`(用例项目引入 `assets/dykit/dykit.css` 与 `assets/dykit/hf-kit.js`)、`index.html`、`package.json`(`"test"` 先跑 registry 测试)、README(接入说明)

**Interfaces:**
- Produces: 之后所有新组件命名为 `dy-<名称>`,文件 `compositions/dy-<名称>.html`,composition id 同名;Task 4–12 中的 `scene-*`、`rec-phone`、`tr-*` 一律加 `dy-` 前缀。
- Produces: registry 条目:`dykit`(资源包,类型 block,仅含 `assets/dykit/**` 资源文件)+ 每个 `compositions/dy-*.html` 一个 block(文件类型 `hyperframes:composition`,目标 `compositions/<名称>.html`,`registryDependencies: ["dykit"]`)。

- [ ] **Step 1: 写测试 `tests/registry.test.mjs`**:(1) `node scripts/build-registry.mjs --check` 退出码为 0;(2) 用 openssl 生成 localhost 自签证书,起本地 HTTPS 服务托管仓库根目录;建一个空项目(含 `assets/gsap.min.js`、`hyperframes.json` 的 registry 指向本地服务),运行 `npx --yes hyperframes@0.8.143 add dy-scene-title --dir <tmp> --no-clipboard`(环境变量 `NODE_EXTRA_CA_CERTS`、`NO_PROXY=localhost,127.0.0.1`);断言 `compositions/dy-scene-title.html`、`assets/dykit/dykit.css`、`assets/dykit/hf-kit.js`、`assets/dykit/fonts/fonts.css` 存在;(3) 在该项目 `index.html` 加两行引入并挂载组件,`check --strict` 通过。
- [ ] **Step 2: 运行 `node tests/registry.test.mjs`**,预期 FAIL(构建脚本不存在)。
- [ ] **Step 3: 迁移目录、改名,实现 `scripts/build-registry.mjs`**,生成 `registry/`。
- [ ] **Step 4: 运行 `node tests/registry.test.mjs` 和 `node tests/run.mjs`**,预期全部 PASS;`npm run check` 通过。
- [ ] **Step 5: Commit + push** `模块化 dykit 与 registry 分发`

## 阶段 2:其余 7 个场景

Task 4–10 结构相同:写用例 → `run.mjs` FAIL → 实现 → `run.mjs` PASS → `sheet.mjs` → commit。下面只列每个组件的差异项。所有场景都包含 `.hf-bg`、使用 `HF.motion` 和 `HF.refit`,文案为空的可选元素要移除。

### Task 4: `scene-points`
- 变量:`title`、`items`(用 `|` 分隔;每项可写 `标题::说明`,用 `HF.pair` 拆分)、`theme`、`accent`。
- 每项为 `.hf-card`,带序号 01–0N;逐项入场。列表外层容器用 `HF.fitBox`。
- 用例:`normal` 3 项;`long` 5 项,每项都带长说明和 `<b>&"`;`sparse` 1 项无说明;`many` 7 项。duration 6,peak 5。
- Commit:`scene-points 要点页`

### Task 5: `scene-steps`
- 变量:`title`、`steps`(用 `|` 分隔)、`active`(number,0 表示按时间依次高亮,1..N 表示固定高亮第 N 步)、`theme`、`accent`。
- 竖向步骤条加连接线。`active=0` 时高亮在时间轴上平均推进。
- 用例:`normal` 3 步;`long` 5 步长文案;`sparse` 1 步;`fixed`:`active=2`。duration 6,peak 5.5。
- Commit:`scene-steps 步骤页`

### Task 6: `scene-image-text`
- 变量:`src`(相对项目根的图片路径)、`caption`、`focus`(`"x,y,w,h"`,图片的百分比坐标,可选)、`theme`、`accent`。
- 图片在 `.hf-card` 中按 `object-fit: contain` 显示,最大高度 1000px。有 `focus` 时,从 1.0 秒开始在 1.2 秒内放大到该区域,并显示主题色描边框。
- 测试素材:`tests/media/sample-shot.png`(用 ffmpeg `testsrc2` 生成 1080×1600 单帧,并写入网格文字)。
- 用例:`normal`(有 focus)、`long`(长 caption)、`sparse`(仅 src)。duration 5,peak 3。
- Commit:`scene-image-text 图文页`

### Task 7: `scene-big-number`
- 变量:`label`、`value`(number)、`prefix`、`suffix`、`note`、`theme`、`accent`。
- 数字字号 160,按最终数值用 `HF.fit(num, 920, 88)` 适配(沿用 `dy-stat-counter` 的"先放最终文本测量,再恢复"做法);0.3 秒起滚动 1.6 秒。
- 用例:`normal` 1286 万;`long`:value=123456789,label 很长;`sparse`:只有 value。duration 4.5,peak 3.5。
- Commit:`scene-big-number 数据页`

### Task 8: `scene-quote`
- 变量:`text`、`em`、`source`、`theme`、`accent`。
- 大字居中;editorial 主题下显示大号引号装饰(由 `.hf-kicker` 的主题样式控制,组件内不判断主题)。`em` 规则同 Task 3。
- 用例:`normal`、`long`(80 字)、`sparse`(只有 text)。duration 4,peak 3。
- Commit:`scene-quote 金句页`

### Task 9: `scene-compare`
- 变量:`leftTitle`、`rightTitle`、`left`、`right`(都用 `|` 分隔)、`layout`(`"vertical"` 默认 | `"horizontal"`)、`theme`、`accent`。
- 两个 `.hf-card`,右侧(或下方)卡片用强调色边框;中间放 VS 或箭头。两侧条数不同时按较多的一侧排版。
- 用例:`normal` 各 3 条;`long` 各 5 条长文案;`sparse` 各 1 条;`horizontal`。duration 6,peak 5。
- Commit:`scene-compare 对比页`

### Task 10: `scene-ending` + 阶段 2 验收
- 变量:`headline`、`cta`(默认 `"点赞 · 关注 · 收藏"`)、`next`、`theme`、`accent`。
- 用例:`normal`、`long`、`sparse`(只有 headline)。duration 4,peak 3。
- 完成后:`node tests/run.mjs`(不带参数,跑全部组件),预期全部 PASS;commit `scene-ending 结尾页`;push;把 Task 4–10 的对比图发给用户,等确认。

## 阶段 3:录屏与转场

### Task 11: `rec-phone`

**Files:** Create `compositions/rec-phone.html`, `tests/cases/rec-phone.json`, `tests/media/rec-sample.mp4`, `tests/media/rec-landscape.mp4`

**Interfaces:**
- Produces: 变量 `src`、`title`、`cues`(JSON 字符串;格式见 Spec 4.1)、`theme`、`accent`。
- 标注坐标基准为**视频实际显示区域**(`object-fit: contain` 后的矩形),不是手机框。

- [ ] **Step 1: 生成占位录屏**:用 ffmpeg 以 `testsrc2` 生成竖屏 886×1920、横屏 1920×1080,各 8 秒,`-an`(无音轨),画面上叠加 10% 间隔的坐标网格(`drawgrid`),方便核对标注位置。
- [ ] **Step 2: 写用例**:`normal` 竖屏,包含 tap、box、zoom 各 1 条;`landscape` 横屏,同样的 cues;`sparse` 无 cues、无 title;`long`:title 很长,box 的 label 很长。duration 8,peak 分别取 2.6(tap 中)、4.5(box 中)、7.0(zoom 中)。cases 支持 `peaks` 数组。
- [ ] **Step 3: `node tests/run.mjs rec-phone`**,预期 FAIL。
- [ ] **Step 4: 实现**
  - 手机框:圆角 64px,宽 820px,居中,顶部留出 title 区域;框体颜色取 `--hf-surface` 和 `--hf-surface-border`。
  - `<video muted playsinline>`,`object-fit: contain`,不加 `data-has-audio`。
  - `tap`:在 (x,y) 处画两圈扩散波纹,时长为 dur。
  - `box`:四块半透明遮罩围出高亮区域(不用 `mix-blend`),加主题色描边框;有 label 时显示指示箭头和 `.hf-card` 说明,说明位置自动放在框的上方或下方,以留在屏内的一侧为准。
  - `zoom`:对视频容器做 `scale` 和 `transform-origin` 补间,0.5 秒推近,保持,0.5 秒拉回;放大倍数为 `min(2.5, 100 / max(w, h))`。
  - 根据视频的 `videoWidth` / `videoHeight` 计算显示矩形。元数据未加载时,按竖屏 886×1920 计算,并在 `loadedmetadata` 后重新定位。
- [ ] **Step 5: `node tests/run.mjs rec-phone`**,预期 PASS;再用 `npx --yes hyperframes@0.8.143 snapshot … --zoom ".rec-screen"` 检查 tap 中心是否落在网格 (82%, 9%) 处,box 是否框住指定的网格区域。
- [ ] **Step 6: sheet + Commit** `rec-phone 录屏组件`

### Task 12: 转场 `tr-wipe` / `tr-zoom` / `tr-glitch` + 阶段 3 验收

**Files:** Create `compositions/tr-wipe.html`, `compositions/tr-zoom.html`, `compositions/tr-glitch.html`, `tests/cases/tr-*.json`

**Interfaces:**
- Produces: 变量 `theme`、`accent`;`tr-wipe` 另有 `direction`(`"left"` 默认 | `"up"`)。时长 0.5 秒:前 0.25 秒盖满画面,后 0.25 秒揭开。
- `tr-glitch` 的切片偏移用固定数组,例如 `[12,-30,45,-8,22,-40,16,-24]`,不用随机数。

- [ ] **Step 1: 写用例**:每个转场挂在两个纯色块之间。duration 1,peak 0.5。另用 `npx --yes hyperframes@0.8.143 snapshot tests/.out/<id>-neon --at 0.5 --no-end` 截图,人工确认 0.5 秒时画面被完全覆盖。
- [ ] **Step 2: `node tests/run.mjs tr-wipe tr-zoom tr-glitch`**,预期 FAIL。
- [ ] **Step 3: 实现三个转场**:颜色取 `--hf-accent`、`--hf-accent-2`、`--hf-bg`。
- [ ] **Step 4: 运行测试**,预期 PASS。
- [ ] **Step 5: Commit + push**;拼一段演示:scene-title → tr-wipe → rec-phone → tr-glitch → scene-ending,在 neon 和 editorial 下各渲染一次 MP4,发给用户验收。

## 阶段 4:现有 20 个内容组件接入主题

每个组件的改造规则相同:
1. 删除内联的 `hfFit` / `hfFitBox` 定义,改用 `HF.fit`、`HF.fitBox`、`HF.refit`。
2. `<style>` 内所有十六进制颜色和字体名改为 `var(--hf-*)`;卡片改用 `.hf-card`,关键词改用 `.hf-em`。
3. 变量声明增加 `theme`;原有颜色变量(`accent`、`keyColor`、`leftColor`、`colorB` 等)默认值改为 `""`,非空时由脚本覆盖对应的主题变量。
4. 版式、动画节奏、变量名不变(保持兼容)。
5. `tests/cases/<id>.json` 中:`normal` 用组件当前的默认值;`long` 沿用 2026-10-09 压测时的超长文案(含 `<b>&"`)。

每个批次:写用例 → 在**改造前**运行 `run.mjs`,预期 FAIL(静态检查发现十六进制颜色)→ 改造 → PASS → `sheet.mjs` → commit。

### Task 13: 批次 A(文字主体类)
`dy-hook-title`, `dy-subtitle`, `dy-chapter-title`, `dy-countdown`, `dy-end-cta`。Commit:`接入主题:标题与字幕类`

### Task 14: 批次 B(卡片列表类)
`dy-lower-third`, `dy-rank-item`, `dy-checklist`, `dy-prompt-card`, `dy-news-flash`。Commit:`接入主题:卡片列表类`

### Task 15: 批次 C(数据对比类)
`dy-stat-counter`, `dy-vs-compare`, `dy-poll`, `dy-bench-bars`, `dy-before-after`。Commit:`接入主题:数据对比类`

### Task 16: 批次 D(AI 演示类)+ 花字
`dy-chat-demo`, `dy-tool-card`, `dy-code-block`(等宽字体用 `--hf-font-mono`), `dy-workflow-flow`, `dy-concept-card`;`dy-sticker-pop` 只把 `accent` 默认值改为 `""` 并回退到 `--hf-accent`。Commit:`接入主题:AI 演示类与花字`

### Task 17: 演示与文档 + 阶段 4 验收
- `index.html`:把 13 个新组件加入演示时间线;顶部注释说明如何切换 `data-theme`。
- `README.md`:新增"主题"一节(切换方式、4 个主题的说明、组件级覆盖方式)、新组件表、`npm test` 用法,以及"抖音界面类 7 个组件不跟随主题"的说明。
- 运行 `npm test`(全部组件 × 4 主题)和 `npm run check`,预期全部通过。
- Commit + push;把阶段 4 的对比图发给用户验收。

## 阶段 5(不在本计划内)

生成组件的技能:按 Spec,开始前单独与用户确认范围和使用方式,另写计划。
