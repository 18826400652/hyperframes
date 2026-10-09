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

const cli = (...args) => spawnSync("node", ["scripts/validate-storyboard.mjs", ...args], { cwd: ROOT, encoding: "utf8" });
const bj = cli("tests/storyboards/bad-json.json", "--no-render");
ok(bj.status === 1 && /bad_json/.test(bj.stdout + bj.stderr) && !/\n\s+at /.test(bj.stdout + bj.stderr), "bad-json CLI: " + bj.status + " " + (bj.stdout + bj.stderr).slice(0, 300));
const good = cli("storyboards/example.json", "--script", "tests/storyboards/example-script.txt", "--no-render");
ok(good.status === 0 && /storyboard OK/.test(good.stdout), "example CLI failed: " + good.stdout + good.stderr);

// 渲染检查:示例全部通过(录屏 src 为空时用占位视频);超长文案的清单被报出;CLI 完整校验通过
const rendered = renderCheck(example);
ok(rendered.length === example.scenes.length && rendered.every(r => r.ok), "example render: " + JSON.stringify(rendered.filter(r => !r.ok).map(r => r.scene)));
const over = renderCheck(JSON.parse(read(path.join(dir, "overflow.json"))));
ok(over.some(r => !r.ok), "overflow storyboard passed render check");
const full = cli("storyboards/example.json", "--script", "tests/storyboards/example-script.txt");
ok(full.status === 0 && /storyboard OK/.test(full.stdout), "full CLI failed: " + full.stdout.slice(-500));

if (fails.length) { console.log("FAIL storyboard\n  - " + fails.join("\n  - ")); process.exit(1); }
console.log("PASS storyboard (format + render)");
