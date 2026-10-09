# 口播稿分镜技能 dykit-storyboard 设计文档

日期:2026-10-09 · 阶段 5 · 状态:待用户审阅

## 1. 目标

给一篇完整的口播稿,输出一份 JSON 画面清单:每个画面对应哪段口播、用哪个 dykit 组件、变量怎么填、建议时长、需要补充的素材。现有组件表达不了的内容,按主题生成新组件;新组件经用户看对比图确认后入库,以后直接复用,组件库越用越丰富。

**成功标准**
- 一篇约 1 分钟的口播稿,得到一份通过校验(格式 + 真实文案渲染检查)的清单,可直接接入用户已有的组装流程。
- 新组件入库后,同类口播再次出现时直接从目录中选中,不重复生成。

**不做的事**
- 不生成可直接导出的 `index.html` 工程(用户只要清单)。
- 不处理字幕(用户流程自动加字幕),清单不包含 `dy-subtitle`。
- 不做配音、不做时间轴对齐(时长为估算值,由用户流程按实际配音覆盖)。
- 不自动录屏;录屏标注坐标在用户提供录屏后再补。

## 2. 用户确认过的决定

| 问题 | 决定 |
|---|---|
| 输入 | 完整的口播稿 |
| 输出 | 只要每个画面用的组件清单,格式为 JSON |
| 新组件 | 测试通过后先给用户看 4 主题对比图,确认后才入库推送 |
| 字幕 | 用户流程负责,清单只管画面 |
| 方案 | 技能 + 组件目录 + 清单校验(不用关键词规则引擎,不默认出预览视频) |
| 切分节奏 | 每画面 3~8 秒;只在换话题时加转场 |

## 3. 清单格式

文件:`storyboards/<视频名>.json`

```json
{
  "version": 1,
  "title": "视频标题",
  "theme": "neon",
  "charsPerSecond": 4,
  "scenes": [
    {
      "id": "s01",
      "script": "这个画面对应的口播原文",
      "component": "dy-scene-title",
      "variables": { "title": "…" },
      "duration": 4.5,
      "overlays": [{ "component": "dy-sticker-pop", "variables": { "text": "…" }, "at": 1.5, "duration": 2.5 }],
      "transitionIn": "dy-tr-wipe",
      "needs": [{ "type": "recording", "variable": "src", "hint": "录制:…" }]
    }
  ],
  "newComponents": [{ "id": "dy-xxx", "status": "pending", "purpose": "…" }]
}
```

字段规则:
- `theme`:`minimal` / `neon` / `editorial` / `bento`,默认 `neon`,运行技能时可指定。
- `charsPerSecond`:时长估算用的语速,默认 4。
- `scenes[].id`:`s01` 起顺序编号。
- `scenes[].script`:按顺序拼接全部 `script`,去掉空白后必须与输入口播稿去掉空白后完全一致(不丢字、不改字)。
- `scenes[].component`:必须是组件目录中的组件,或本清单 `newComponents` 中的组件;不能是转场(`dy-tr-*`),也不能是 `dy-subtitle`、`dy-safe-zone`。
- `scenes[].variables`:只能使用该组件声明过的变量名;未填的变量用组件默认值。不得编造口播中没有的数字和事实。
- `scenes[].duration`:秒,取"字数 ÷ charsPerSecond"与组件最短时长中的较大者,保留 1 位小数。
- `scenes[].overlays`:最多 2 个;只能用叠加类组件;`at + duration` 不超过画面时长。
- `scenes[].transitionIn`:`null` 或 `dy-tr-wipe` / `dy-tr-zoom` / `dy-tr-glitch`;第一个画面必须为 `null`。转场挂在画面开始前 0.25 秒、时长 0.5 秒(由用户流程组装)。
- `scenes[].needs`:需要用户补充的素材。`type` 为 `recording`(录屏)或 `image`(截图);`variable` 为对应变量名;`hint` 说明要拍什么。对应变量在清单中可以留空。
- `newComponents[].status`:`pending`(待确认)或 `accepted`(已入库)。

## 4. 切分与选择规则

1. **按意思切分**:一个画面讲一件观众要记住的事(钩子、要点、步骤、数字、对比、金句等);每画面 3~8 秒(约 12~32 字);过长拆分,过短并入相邻画面。
2. **首尾固定**:第一个画面是钩子(`dy-scene-title` 或 `dy-hook-title`),前 3 秒亮出核心看点;最后一个画面是 `dy-scene-ending` 或 `dy-end-cta`。
3. **按目录选择**:依据目录中每个组件的"适合什么内容"选择最匹配的组件;都合适时优先整屏场景。
4. **避免单调**:同一组件最多连续 2 次;只在换话题处加转场,约每 3~4 个画面一次。
5. **新组件**:只有现有组件都表达不好时才生成(例如时间线、逐年排名变化、思维导图);生成前再查一遍目录;id 用 `dy-` 前缀加描述性名称;同一视频中类似内容复用它。
6. **文案提炼**:标题不超过 16 字;要点 3~5 条,每条不超过 14 字;数字必须来自口播;口播没有的值留空,不编造。

## 5. 组件目录

- `catalog/notes.json`(人工维护):每个组件的 `purpose`(用途)、`suitableFor`(适合的口播内容)、`kind`(`scene` 整屏 / `overlay` 叠加 / `transition` 转场 / `ui` 抖音界面)、`minDuration`(最短时长,秒)。
- `scripts/build-catalog.mjs`:读取 `compositions/dy-*.html` 的变量声明(id、类型、标签、默认值),合并 `notes.json`,生成 `catalog/catalog.json`;支持 `--check`(目录不是最新时报错),纳入 `npm test`。
- 组件文件存在但 `notes.json` 缺少说明时,`build-catalog` 报错,保证每个入库组件都有"适合什么内容"。
- 技能只从 `catalog.json` 读取可选组件。

## 6. 清单校验

`scripts/validate-storyboard.mjs <清单路径>`(`npm run storyboard:check -- <路径>`),两步:

1. **格式检查**(不需要浏览器,秒级):逐条检查第 3 节的字段规则,包括口播完整性;报告每个问题所在的画面 id 与字段。可加 `--script <口播稿.txt>` 校验口播是否完整;不提供时跳过该项。
2. **渲染检查**:为每个画面生成临时工程(主组件 + 叠加组件,清单主题),用 `hyperframes check --strict` 检查真实文案是否溢出、被裁切、对比度不足、进入底部字幕区。`needs` 中留空的媒体变量用组件占位素材代替。可用 `--no-render` 只做格式检查。

全部通过时退出码为 0。

## 7. 新组件流程

1. 按 `.claude/skills/dykit-storyboard/component-guide.md`(新组件编写规范)编写,从最接近的参考模板(整屏场景 / 叠加组件)改起。规范要点:颜色字体只用主题变量;必须有 `theme`、`accent` 变量;用 HF 工具做长文案自适应;内容在安全区内、不进底部字幕区;退场时间跟随挂载时长;用户文案只经 `textContent` 写入;不用随机数和当前时间。
2. 同时写测试用例 `tests/cases/<id>.json`:正常文案、超长文案(含 `<b>&"`)、本次口播的真实文案三组;跑 4 主题测试直到通过。
3. 生成 4 主题对比图(正常 + 超长),连同用途、变量说明、适合内容发给用户;此时组件不提交、不推送,清单中状态为 `pending`。
4. 用户确认后:写入 `notes.json`,重新生成目录、registry、README 组件表,提交并推送,状态改为 `accepted`。用户要求修改则修改后重发对比图;用户拒绝则删除,清单中对应画面改用现有组件。

## 8. 文件结构

```
.claude/skills/dykit-storyboard/
  SKILL.md                 技能流程与规则(第 3、4、7 节)
  component-guide.md       新组件编写规范 + 两个参考模板的说明
catalog/
  notes.json               人工维护的组件说明
  catalog.json             生成的组件目录
scripts/
  build-catalog.mjs
  validate-storyboard.mjs
storyboards/
  example.json             示例清单
tests/
  catalog.test.mjs         目录生成 / --check
  storyboard.test.mjs      校验脚本:示例通过 + 一组故意写错的清单逐项报错
  storyboards/bad-*.json   错误清单样例
```

`package.json` 增加 `build:catalog`、`storyboard:check` 脚本;`npm test` 增加 `catalog.test.mjs`、`storyboard.test.mjs`。

## 9. 测试

1. **脚本测试**(`npm test`):
   - 目录:生成结果包含全部组件;`--check` 能发现过期目录;缺少说明时报错。
   - 校验:`example.json` 通过;错误样例分别触发"组件不存在""变量名错误""时长过短""口播不完整""叠加超出画面""第一个画面有转场""使用了转场或字幕组件作为主组件"等错误,每条错误都被报出。
   - 渲染检查:示例清单渲染检查通过;一份超长文案导致溢出的清单被报出。
2. **技能实测**(按 writing-skills 要求):
   - 先在不加载技能的情况下,让模型处理同一篇口播稿,记录问题(作为对照)。
   - 加载技能后处理同一篇约 1 分钟的 AI 知识口播稿,生成清单并通过校验,渲染样片发给用户看效果。
   - 若过程中生成新组件,完整走一遍"对比图 → 用户确认 → 入库"。

## 10. 风险

- **选择质量依赖模型判断**:靠 `suitableFor` 说明和第 4 节规则约束,并在实测中对照检查;发现误选就补充说明。
- **口播完整性**:模型可能改字;由校验脚本的拼接比对兜底。
- **渲染检查耗时**:每个画面一次 `check`,1 分钟视频约 12~15 个画面,预计数分钟;提供 `--no-render` 快速模式。
