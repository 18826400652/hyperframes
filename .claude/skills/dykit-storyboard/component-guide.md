# dykit 新组件编写规范

现有组件表达不了某段口播时,按本规范新建组件。新组件必须和现有组件一样:4 个主题都好看、长文案不溢出、通过全部测试;**用户确认对比图之前不提交、不推送**。

## 1. 从参考模板改起

| 类型 | 参考 | 特点 |
|---|---|---|
| 整屏场景(自带背景) | `compositions/dy-scene-points.html` | 有 `.hf-bg` 背景层;内容用 `HF.centerBox` 在安全区内居中 |
| 叠加组件(透明背景) | `compositions/dy-checklist.html` | 无背景;面板用 `.hf-panel`;用 `HF.fitBox` 保证不超出底部安全区 |

注意:`dy-checklist` 只参考版式(`.hf-panel` + `fitBox`);它的动画是写死的时间,**动画写法以 `dy-scene-points` 为准**(`HF.motion`、`HF.duration`,见第 5 节)。左右边距也以第 5 节为准(80 / 160),不照抄参考文件。

文件名与 id:`compositions/dy-<描述性名称>.html`,`data-composition-id` 与文件名一致,全部小写、用连字符,例如 `dy-scene-timeline`。

## 2. 文件骨架(必须)

- `<html data-composition-variables='[...]'>`:变量声明是 JSON,外层用单引号,**值里不能出现单引号 `'`**(会截断属性),需要时用 `\"`。
- 每个变量写 `id`、`type`、`label`(Studio 里显示的中文说明)、`default`。
- 必须声明 `{"id": "theme", "type": "string", "label": "主题(留空跟随全局)", "default": ""}` 和 `{"id": "accent", "type": "string", "label": "强调色(留空用主题色)", "default": ""}`;其他颜色变量同样默认 `""`。
- 内容放在 `<template>` 里;根元素 `<div id="root" data-composition-id="<id>" data-width="1080" data-height="1920">`。
- 脚本开头:
  ```js
  const v = Object.assign({ /* 与声明一致的默认值 */ }, window.__hyperframes.getVariables());
  const root = document.getElementById("root");
  HF.applyTheme(root, v);
  ```
- 结尾注册一条暂停的时间线:`window.__timelines["<id>"] = tl;`(`gsap.timeline({ paused: true })`)。

## 3. 只用主题变量

`<style>` 里不能出现十六进制颜色(测试会查)。可用变量:

- 颜色:`--hf-bg`、`--hf-bg-2`、`--hf-text`、`--hf-muted`、`--hf-accent`、`--hf-accent-2`、`--hf-on-accent`(强调色上的文字)、`--hf-on-accent-2`、`--hf-surface-border`
- 字体:`--hf-font-title`、`--hf-font-body`、`--hf-font-mono`、`--hf-title-weight`
- 形状与阴影:`--hf-radius`、`--hf-title-shadow`、`--hf-surface-shadow`
- 叠加面板底色:`--hf-panel`

现成的类:`.hf-title`(大标题)、`.hf-text`(正文)、`.hf-kicker`(小标签,各主题样式不同,不一定是色块;需要强调色色块标签时自己写 `background: var(--hf-accent); color: var(--hf-on-accent)`)、`.hf-em`(强调词)、`.hf-card`(整屏场景里的卡片)、`.hf-panel`(叠加在画面上的不透明面板)、`.hf-bg`(整屏背景,内含 `<i class="hf-bg-a"></i><i class="hf-bg-b"></i><i class="hf-bg-c"></i>`)。

叠加组件里直接压在画面上的文字:`color: var(--hf-text); -webkit-text-stroke: 8px var(--hf-bg); paint-order: stroke fill;`,在任意画面上都看得清。强调色底上的文字一律用 `--hf-on-accent`。

## 4. HF 工具(`assets/dykit/hf-kit.js`)

- `HF.applyTheme(root, v)`:应用 `v.theme` / `v.accent` / `v.accent2`
- `HF.motion(root) → { ease, easeOut, dur, stagger }`:主题的动画参数
- `HF.duration(root, fallback)`:挂载时长(秒)
- `HF.fit(el, maxW, minPx)`:单行缩字号,缩到 `minPx` 仍放不下才换行;用于一行就该放下的大字(数字、名称、按钮)。`maxW` 传可用宽度(一般 840),传 0 表示以元素自身宽度为准
- `HF.fitLines(el, maxLines, minPx)`:多行文字超过 `maxLines` 行时缩字号,缩到 `minPx` 为止(之后允许多于 maxLines 行,由 fitBox / centerBox 兜底);用于标题、正文。常用下限:标题 44~60,正文 28~32
- `HF.fitBox(el, bottom = 1520, minTop = 260)`:超出底部安全区时上移,再缩小(最小 50%,仍放不下会发警告,测试判失败)
- `HF.centerBox(el, top = 260, bottom = 1520)`:在安全区内垂直居中,放不下时内部会调用 `fitBox`(居中的组件只调它一个即可)
- `HF.refit(fn)`:立即执行一次,字体加载后再执行一次(所有排版写在这里面)
- `HF.split(s, sep = "|")`、`HF.pair(s)`(拆 `标题::说明`)

## 5. 版式与动画

- 安全区:内容上沿 ≥ 260px,下沿 ≤ 1520px,左 80px、右留 160px(抖音右侧按钮)。画面高度 79% 以下(约 1517px)是字幕区,不能放文字。
- 文案为空时删掉对应元素(`el.remove()`),不留空框;动画只对仍存在的元素做。
- 可能出现长串英文 / 网址的文字加 `overflow-wrap: anywhere`。
- `.hf-panel` 上可以自己加 padding、边框、圆角。
- 入场:元素逐个出现,用 `HF.motion` 的 ease / dur / stagger。
- 退场:`tl.to(<容器>, { opacity: 0, duration: 0.3, ease: m.easeOut }, Math.max(<入场完成时刻>, D - 0.4))`,其中 `D = HF.duration(root, <建议时长>)`。不要写死退场时间。

## 6. 安全与确定性

- 用户文案只能经 `textContent` / `append(string)` 写入;`innerHTML` 只能用于不含变量的固定模板。
- 不能用 `Math.random`、`Date.now`、`performance.now`;需要"随机感"时用固定数组。
- 不能请求网络。

## 7. 测试用例

新建 `tests/cases/<id>.json`:

```json
{
  "component": "<id>",
  "duration": <建议时长>,
  "peak": <内容全部出现后的时刻>,
  "variants": {
    "normal": {},
    "long": { "<文案变量>": "<b>&\" 很长很长的文案……" },
    "real": { "<变量>": "本次口播里的真实文案" }
  }
}
```

- `duration`:组件建议时长;`peak`:所有元素入场完成之后的时刻,取 `duration × 0.6` 左右(各主题动画快慢不同,留足余量)。
- `long` 变体里把所有文案变量都写成超长。

运行 `node tests/run.mjs <id>`(4 个主题),全部 PASS 为止。注意:组件入库前 `npm test` 的 registry 一致性检查会因为多出一个组件而失败,这是正常的,入库时运行 `npm run build:registry` 即可。

## 8. 给用户看,确认后入库

1. 生成对比图:`node tests/sheet.mjs <id>` 与 `node tests/sheet.mjs <id> --variant long`,连同组件用途、变量说明、适合的口播内容发给用户。此时**不提交**。
2. 用户确认后:
   - 在 `catalog/notes.json` 写入 `kind`(`scene` 或 `overlay`)、`purpose`、`suitableFor`(口播里的什么信号适合用它)、`minDuration`;
   - `npm run build:catalog`、`npm run build:registry`;
   - 在 README 对应的组件表里加一行;
   - 提交并推送,把清单里该组件的 `status` 改为 `accepted`。
3. 用户要求修改:改完重新跑测试、重新出对比图。用户拒绝:删除组件文件与测试用例,清单里对应画面改用现有组件。
