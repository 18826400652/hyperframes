# 口播稿分镜技能 dykit-storyboard 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 输入完整口播稿,输出通过校验的 JSON 画面清单;缺少的组件按规范生成,经用户确认后入库。

**Architecture:** 组件目录(`catalog/catalog.json`)由脚本从组件变量声明 + 人工说明生成;清单校验脚本分格式检查(纯 Node)与渲染检查(临时工程 + `hyperframes check --strict`);技能(`.claude/skills/dykit-storyboard/`)只描述流程与规则,判断交给模型,结果由校验脚本兜底。

**Tech Stack:** Node ≥18 ESM 脚本(无新依赖),HyperFrames CLI `npx --yes hyperframes@0.8.143`,现有 `tests/lib.mjs`。

**Spec:** `docs/superpowers/specs/2026-10-09-storyboard-skill-design.md`

## Global Constraints

- CLI 固定 `npx --yes hyperframes@0.8.143`(复用 `tests/lib.mjs` 的 `CLI`)。
- 主题只能是 `minimal` / `neon` / `editorial` / `bento`;清单默认 `neon`;`charsPerSecond` 默认 4。
- 画面 3~8 秒;叠加最多 2 个;转场只能是 `dy-tr-wipe` / `dy-tr-zoom` / `dy-tr-glitch`,第一个画面为 `null`。
- 主组件不能是转场、`dy-subtitle`、`dy-safe-zone`;另外 `dy-progress-bar`、`dy-ai-badge` 覆盖全片(kind `global`),既不能做主组件也不能做叠加(计划补充的决定,spec 未写明)。
- 主组件为叠加类(kind `overlay`)时,渲染检查在其下垫 `dy-scene-bg`;SKILL.md 写明组装时同样处理。
- 文案:标题 ≤16 字,要点 3~5 条每条 ≤14 字;数字只取自口播。
- 口播完整性:拼接全部 `script` 去空白后等于原稿去空白(`--script` 提供时检查)。
- 新组件在用户确认前不提交、不推送。
- 提交信息结尾附:`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 与 `Claude-Session: https://claude.ai/code/session_01UNWQgEM6njMuTXSvDpc6r2`;推送到 `feat/dy-ai-components`。

## Review Focus

1. 清单不是合法 JSON 或缺 `scenes` → 校验给出一条可读错误、退出码 1,不抛堆栈(Task 2 测 `bad-json`)。
2. 变量值类型不对(如 `number` 变量填了 `"12万"`)→ 报 `bad_variable_type`(Task 2 测)。
3. `needs` 声明的变量在清单里留空时,渲染检查用组件默认占位素材,不因空 src 失败(Task 3 测)。
4. 同一清单里新组件状态为 `pending`、但组件文件不存在 → 报 `unknown_component`(Task 2 测)。
5. 口播稿含换行、全角空格、标点差异时,完整性比对只忽略空白、不忽略标点(Task 2 测)。

---

### Task 1: 组件目录

**Files:**
- Create: `catalog/notes.json`, `scripts/build-catalog.mjs`, `tests/catalog.test.mjs`
- Generate: `catalog/catalog.json`
- Modify: `package.json`(脚本 `build:catalog`;`test` 前置 `node tests/catalog.test.mjs &&`)

**Interfaces:**
- Produces: `catalog/catalog.json` = `{ "version": 1, "components": [{ "id", "kind", "purpose", "suitableFor", "minDuration", "variables": [{ "id", "type", "label", "default" }] }] }`,按 id 排序。
- Produces: `export function buildCatalog(root: string): { catalog, errors: string[] }`(`scripts/build-catalog.mjs`);CLI `node scripts/build-catalog.mjs [--check]`。
- `notes.json` = `{ "<id>": { "kind": "scene"|"overlay"|"transition"|"ui"|"global", "purpose": string, "suitableFor": string, "minDuration": number } }`。

- [ ] **Step 1: 写测试 `tests/catalog.test.mjs`**(同仓库其他测试的风格:顶层 await,失败 `process.exit(1)`):
  - `buildCatalog(ROOT)` 无错误;`components.length` 等于 `compositions/dy-*.html` 数量;`dy-scene-title` 的 `variables` 含 id `title`;每项都有非空 `suitableFor`。
  - 在临时目录复制 `compositions/` 与 `catalog/notes.json`,删去 `dy-poll` 的说明 → errors 含 `missing notes: dy-poll`;多加一条不存在的 `dy-nope` → errors 含 `notes for unknown component: dy-nope`。
  - `node scripts/build-catalog.mjs --check` 在目录过期(临时改写 `catalog.json`)时退出码非 0。
- [ ] **Step 2: 运行 `node tests/catalog.test.mjs`**,预期 FAIL(模块不存在)。
- [ ] **Step 3: 写 `notes.json`**:为 `compositions/` 下全部 41 个组件写 kind / purpose / suitableFor / minDuration。kind:9 个 `dy-scene-*` 与 `dy-rec-phone` 为 `scene`;3 个 `dy-tr-*` 为 `transition`;20 个已接入主题的内容组件为 `overlay`;`dy-comment-bubble`、`dy-action-bar`、`dy-follow-card`、`dy-product-card`、`dy-safe-zone` 为 `ui`;`dy-progress-bar`、`dy-ai-badge` 为 `global`。minDuration 取 README"建议时长"的固定值;随内容变化的(清单、打字机等)取其公式的最小值。suitableFor 写成口播里的信号,例如大字页"口播强调一个具体数字或倍数"。
- [ ] **Step 4: 实现 `scripts/build-catalog.mjs`**:变量声明从 `<html ... data-composition-variables='…'>` 解析 JSON;`--check` 与 `build-registry.mjs --check` 相同语义(字节比较,打印 `catalog/ is up to date`)。
- [ ] **Step 5: 生成目录并运行测试**:`node scripts/build-catalog.mjs && node tests/catalog.test.mjs`,预期 `PASS catalog`。
- [ ] **Step 6: Commit** `组件目录:notes.json + build-catalog`

### Task 2: 清单格式检查

**Files:**
- Create: `scripts/validate-storyboard.mjs`, `storyboards/example.json`, `tests/storyboard.test.mjs`, `tests/storyboards/*.json`(错误样例), `tests/storyboards/example-script.txt`
- Modify: `package.json`(脚本 `"storyboard:check": "node scripts/validate-storyboard.mjs"`;`test` 加 `node tests/storyboard.test.mjs &&`)

**Interfaces:**
- Consumes: `catalog/catalog.json`(Task 1)。
- Produces: `export function validateFormat(sb: object, catalog: object, opts?: { script?: string }): Issue[]`,`Issue = { scene: string|null, field: string, code: string, message: string }`。
- Produces: CLI `node scripts/validate-storyboard.mjs <清单> [--script <稿.txt>] [--no-render]`:先格式检查,有问题则逐条打印 `[<scene>] <field>: <message> (<code>)` 并退出 1;通过后(未加 `--no-render`)执行 Task 3 的渲染检查;全部通过打印 `storyboard OK` 退出 0。
- 错误码(测试按此断言):`bad_json`、`bad_top`(缺 scenes / version≠1)、`bad_theme`、`bad_scene_id`(非 s01 起连续)、`unknown_component`、`forbidden_main`(transition / dy-subtitle / dy-safe-zone / global)、`unknown_variable`、`bad_variable_type`(number 变量非有限数字,string 变量非字符串)、`duration_too_short`(< max(minDuration, 去空白字数 ÷ cps) − 0.05)、`duration_too_long`(> 30)、`too_many_overlays`、`bad_overlay`(组件非 overlay/ui kind)、`overlay_out_of_range`(at < 0 或 at+duration > 画面时长)、`bad_transition`、`first_transition`、`bad_need`(type 非 recording/image,或 variable 不属于该组件)、`script_mismatch`(提供 script 时)、`bad_new_component`(status 非 pending/accepted)。
- 组件存在性:catalog 中有,或在 `newComponents` 中且 `compositions/<id>.html` 存在。

- [ ] **Step 1: 写示例与错误样例**:`storyboards/example.json` 用 `example-script.txt`(约 120 字的 AI 工具口播)切成 4~5 个画面,覆盖 scene 主组件、overlay 主组件、叠加、转场、录屏 needs。每个错误码一份 `tests/storyboards/bad-<code>.json`(由 example 改一处),外加 `bad-json.json`(非法 JSON)。`script_mismatch` 样例改一个标点,另备 `ok-whitespace.txt`(只多换行与全角空格,应通过)。
- [ ] **Step 2: 写测试 `tests/storyboard.test.mjs`**:example 用 `validateFormat` 返回 `[]`(带 script);每个 `bad-<code>` 至少返回一条该 code;`ok-whitespace.txt` 无 `script_mismatch`;CLI 对 `bad-json.json` 退出码 1 且输出含 `bad_json`、不含 `at `(无堆栈)。
- [ ] **Step 3: 运行**,预期 FAIL。
- [ ] **Step 4: 实现 `validateFormat` 与 CLI 骨架**(渲染部分先留到 Task 3,本任务中 CLI 遇到未加 `--no-render` 时调用的函数由 Task 3 提供;本任务测试全部用 `--no-render`)。
- [ ] **Step 5: 运行 `node tests/storyboard.test.mjs`**,预期 `PASS storyboard format`。
- [ ] **Step 6: Commit** `清单格式校验与示例清单`

### Task 3: 清单渲染检查

**Files:**
- Modify: `scripts/validate-storyboard.mjs`, `tests/storyboard.test.mjs`
- Create: `tests/storyboards/overflow.json`

**Interfaces:**
- Consumes: `validateFormat`(Task 2),`CLI` / `ROOT`(`tests/lib.mjs`)。
- Produces: `export function renderCheck(sb: object, opts?: { outDir?: string }): { scene: string, ok: boolean, log: string }[]`。

- [ ] **Step 1: 写测试**:`renderCheck(example)` 全部 `ok`;`overflow.json`(一个画面的标题塞 400 字、`dy-scene-points` 塞 12 条长要点,使其超出安全区)至少一个 `ok:false`;example 中录屏画面 `src` 为空串时仍 `ok`;CLI 不加 `--no-render` 跑 example 退出 0、输出 `storyboard OK`。
- [ ] **Step 2: 运行**,预期 FAIL。
- [ ] **Step 3: 实现 `renderCheck`**:每个画面在 `opts.outDir ?? tests/.out/storyboard/<scene>` 建临时工程(与 `tests/lib.mjs` 的 `buildFixture` 同样的软链与 head),`data-theme` 取清单主题;主组件挂载时长 = 画面 duration;主组件 kind 为 overlay 时其下垫 `dy-scene-bg`;叠加按 `at`/`duration` 挂载在主组件之上;变量中值为空串的键不写入(使用组件默认/占位);运行 `check <dir> --strict --at <主组件 duration × 0.6> --caption-zone "x0=0;y0=0.79;x1=1;y1=1;severity=error"`,退出码 0 即 ok。CLI 打印失败画面的 ✗/⚠ 行。
- [ ] **Step 4: 运行测试**,预期 PASS。
- [ ] **Step 5: Commit** `清单渲染检查`

### Task 4: 新组件编写规范

**Files:**
- Create: `.claude/skills/dykit-storyboard/component-guide.md`

**Interfaces:**
- Consumes: 现有组件约定(`assets/dykit/theme.css` 变量、`assets/dykit/hf-kit.js` API、`tests/cases` 格式)。
- Produces: 规范文档,供 Task 5 的 SKILL.md 引用。

- [ ] **Step 1: 写规范**,内容逐条对应 spec 第 7 节:文件骨架(变量声明含 `theme`、`accent`;`HF.applyTheme`;`window.__timelines["<id>"]`);可用主题变量与 `.hf-*` 类清单(从 `theme.css` 摘录名称);HF API 一行一个签名;安全区(内容 top ≥ 260、底 ≤ 1520、左 80 右 160;底部 0.79 以下为字幕区);退场 `Math.max(<入场完成时间>, D − 0.4)`;禁止 `Math.random`/`Date.now`/用户值进 `innerHTML`;两个参考模板分别指向 `compositions/dy-scene-points.html`(整屏)与 `compositions/dy-checklist.html`(叠加);测试用例三组(normal / long 含 `<b>&"` / real);入库步骤(notes.json → build-catalog → build-registry → README 组件表 → commit/push)。
- [ ] **Step 2: 验证**:按规范在临时目录试写一个最小组件 `dy-tmp-guide-check`(一行标题叠加组件),跑 `node tests/run.mjs dy-tmp-guide-check` 4 主题通过后删除该组件与用例(不提交)。规范中有任何步骤导致失败,先修规范。
- [ ] **Step 3: Commit** `新组件编写规范`

### Task 5: 技能 SKILL.md(含基线对照)

**Files:**
- Create: `.claude/skills/dykit-storyboard/SKILL.md`, `tests/storyboards/eval-script.txt`(约 1 分钟、约 250 字的 AI 知识口播稿,含数字、对比、操作步骤、一段现有组件不擅长的内容如时间线)
- Create: `docs/superpowers/evals/storyboard-eval.md`(对照记录)

**Interfaces:**
- Consumes: `catalog/catalog.json`、`scripts/validate-storyboard.mjs`、`component-guide.md`。

- [ ] **Step 1: 基线(RED)**:派一个不加载技能、只被告知"仓库有 dykit 组件,按口播稿输出 JSON 画面清单(spec 第 3 节格式)"的子代理处理 `eval-script.txt`,保存其清单,用 `validate-storyboard --script` 校验;在 `storyboard-eval.md` 记录失败项与选择问题(口播改字、编造数字、单调、遗漏 needs 等)。
- [ ] **Step 2: 写 SKILL.md**:frontmatter `name: dykit-storyboard`,`description` 以"当用户提供口播稿并要求分镜 / 画面清单 / 选组件时使用"开头;正文:输入输出、步骤(读 catalog → 切分 → 选择 → 提炼 → 写清单 → 校验 → 修到通过)、spec 第 4 节规则原文、叠加类主组件需垫 `dy-scene-bg`、新组件流程(引用 `component-guide.md`,强调确认前不提交)、录屏标注坐标留空待补。
- [ ] **Step 3: 带技能复测(GREEN)**:同一子代理设置但加载 SKILL.md,处理同一口播稿;清单须一次或修正后通过完整校验(含渲染);在对照记录中写明改进与残留问题,残留问题回补到 SKILL.md 后再测一次。
- [ ] **Step 4: Commit** `dykit-storyboard 技能`

### Task 6: 实测交付

**Files:**
- Create: `storyboards/eval.json`(Task 5 最终清单)
- Modify: `README.md`(新增"口播稿生成画面清单"一节:如何调用技能、清单字段、校验命令、新组件确认流程)

- [ ] **Step 1: 渲染样片**:按 `storyboards/eval.json` 组装临时 `index.html`(主题取清单主题,画面首尾相接,转场在画面开始前 0.25 秒),渲染 MP4,发给用户看效果。
- [ ] **Step 2: 新组件**:若 Task 5 产生了 `pending` 新组件,生成其 4 主题对比图(正常 + 超长)发给用户,等用户确认后按规范入库(此步骤以用户回复为准,不确认则不提交)。
- [ ] **Step 3: 全量验证**:`npm test` 全部通过(含 catalog、storyboard、registry 与全部组件)。
- [ ] **Step 4: Commit + push** `README:口播稿生成画面清单`,把清单与样片交给用户验收。
