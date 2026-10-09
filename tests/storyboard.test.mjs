// 画面清单校验测试:示例通过;每个错误样例报出对应错误码;口播比对只忽略空白;CLI 错误输出不带堆栈
// 渲染检查部分较慢(每个画面一次 hyperframes check)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "./lib.mjs";
import { validateFormat, renderCheck } from "../scripts/validate-storyboard.mjs";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const dir = path.join(ROOT, "tests/storyboards");
const read = f => fs.readFileSync(f, "utf8");
const catalog = JSON.parse(read(path.join(ROOT, "catalog/catalog.json")));
const example = JSON.parse(read(path.join(ROOT, "storyboards/example.json")));
const script = read(path.join(dir, "example-script.txt"));

const exIssues = validateFormat(example, catalog, { script });
ok(exIssues.length === 0, "example has issues: " + JSON.stringify(exIssues));

// script_too_long 样例同时改了口播,完整性比对用它自己的口播
const expect = {
  "bad-pending_missing_file.json": "unknown_component",
  "bad-script_too_long_recording.json": "script_too_long",
};
for (const f of fs.readdirSync(dir).filter(f => /^bad-.*\.json$/.test(f) && f !== "bad-json.json")) {
  const code = expect[f] || f.slice(4, -5);
  const sb = JSON.parse(read(path.join(dir, f)));
  const issues = validateFormat(sb, catalog, { script: f.startsWith("bad-script_too_long") ? undefined : script });
  ok(issues.some(i => i.code === code), `${f}: expected ${code}, got ${JSON.stringify(issues.map(i => i.code))}`);
}

ok(validateFormat(example, catalog, { script: read(path.join(dir, "mismatch-script.txt")) }).some(i => i.code === "script_mismatch"), "punctuation change not reported as script_mismatch");
ok(!validateFormat(example, catalog, { script: read(path.join(dir, "ok-whitespace.txt")) }).some(i => i.code === "script_mismatch"), "whitespace-only change reported as script_mismatch");

// 数字检查:中文数字(百/千/万/点/逐位读法/X个半)能对上;代码不参与;整数比对,不允许子串蒙混;漏填数字变量会报
const one = (script, scene) => validateFormat({ version: 1, theme: "neon", scenes: [{ id: "s01", script, transitionIn: null, overlays: [], needs: [], ...scene }] }, catalog, { script });
const codes = issues => issues.map(i => i.code);
const big = (script, value, extra = {}) => one(script, { component: "dy-scene-big-number", duration: 8, variables: { label: "", prefix: "", suffix: "", note: "", value, ...extra } });
ok(!codes(big("我们有一百万用户", 100)).includes("number_not_in_script"), "一百万 → 100 not matched");
ok(!codes(big("准确率达到百分之九十九点九", 99.9)).includes("number_not_in_script"), "九十九点九 → 99.9 not matched");
ok(!codes(big("一共三千五百人", 3500)).includes("number_not_in_script"), "三千五百 → 3500 not matched");
ok(!codes(big("二零二四年发布", 2024)).includes("number_not_in_script"), "二零二四 → 2024 not matched");
ok(!codes(big("以前要一个半小时", 1.5)).includes("number_not_in_script"), "一个半小时 → 1.5 not matched");
ok(codes(big("2024 年发布", 202)).includes("number_not_in_script"), "202 passed as substring of 2024");
ok(codes(big("大家一起来看", 1)).includes("number_not_in_script"), "1 passed because of 一起");
const code = one("用一行代码调用模型", { component: "dy-code-block", duration: 8, variables: { file: "demo.py", code: "x = os.getenv(\"K\", 0)", speed: 28 } });
ok(!codes(code).includes("number_not_in_script"), "code variable was number-checked: " + JSON.stringify(code));
const noValue = one("一年能省出不少时间", { component: "dy-scene-big-number", duration: 8, variables: { label: "一年能省出", prefix: "", suffix: "", note: "" } });
ok(codes(noValue).includes("default_text"), "omitted number variable (demo value) not reported");
const cmp = one("以前和现在对比一下", { component: "dy-scene-compare", duration: 8, variables: { leftTitle: "以前", rightTitle: "现在", left: "手动", right: "自动" } });
ok(!codes(cmp).includes("default_text"), "config variable layout reported as default_text");

const cli = (...args) => spawnSync("node", ["scripts/validate-storyboard.mjs", ...args], { cwd: ROOT, encoding: "utf8" });
const bj = cli("tests/storyboards/bad-json.json", "--no-render");
ok(bj.status === 1 && /bad_json/.test(bj.stdout + bj.stderr) && !/\n\s+at /.test(bj.stdout + bj.stderr), "bad-json CLI: " + bj.status + " " + (bj.stdout + bj.stderr).slice(0, 300));
const good = cli("storyboards/example.json", "--script", "tests/storyboards/example-script.txt", "--no-render");
ok(good.status === 0 && /storyboard OK/.test(good.stdout), "example CLI failed: " + good.stdout + good.stderr);

// 设置 STORYBOARD_SKIP_RENDER=1 可跳过较慢的渲染检查部分(调试格式检查时用)
if (!process.env.STORYBOARD_SKIP_RENDER) {
  // 渲染检查:示例全部通过(录屏 src 为空时用占位视频);超长文案的清单被报出;CLI 完整校验通过
  const rendered = renderCheck(example);
  ok(rendered.length === example.scenes.length && rendered.every(r => r.ok), "example render: " + JSON.stringify(rendered.filter(r => !r.ok).map(r => r.scene)));
  const over = renderCheck(JSON.parse(read(path.join(dir, "overflow.json"))));
  ok(over.some(r => !r.ok), "overflow storyboard passed render check");
  const full = cli("storyboards/example.json", "--script", "tests/storyboards/example-script.txt");
  ok(full.status === 0 && /storyboard OK/.test(full.stdout), "full CLI failed: " + full.stdout.slice(-500));
}

if (fails.length) { console.log("FAIL storyboard\n  - " + fails.join("\n  - ")); process.exit(1); }
console.log("PASS storyboard (format + render)");
