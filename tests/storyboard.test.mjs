// 画面清单校验测试:示例通过;每个错误样例报出对应错误码;口播比对只忽略空白;CLI 错误输出不带堆栈
// 加 --render 时另跑渲染检查(Task 3)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "./lib.mjs";
import { validateFormat } from "../scripts/validate-storyboard.mjs";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const dir = path.join(ROOT, "tests/storyboards");
const read = f => fs.readFileSync(f, "utf8");
const catalog = JSON.parse(read(path.join(ROOT, "catalog/catalog.json")));
const example = JSON.parse(read(path.join(ROOT, "storyboards/example.json")));
const script = read(path.join(dir, "example-script.txt"));

const exIssues = validateFormat(example, catalog, { script });
ok(exIssues.length === 0, "example has issues: " + JSON.stringify(exIssues));

const expect = {
  "bad-pending_missing_file.json": "unknown_component",
};
for (const f of fs.readdirSync(dir).filter(f => /^bad-.*\.json$/.test(f) && f !== "bad-json.json")) {
  const code = expect[f] || f.slice(4, -5);
  const issues = validateFormat(JSON.parse(read(path.join(dir, f))), catalog, { script });
  ok(issues.some(i => i.code === code), `${f}: expected ${code}, got ${JSON.stringify(issues.map(i => i.code))}`);
}

ok(validateFormat(example, catalog, { script: read(path.join(dir, "mismatch-script.txt")) }).some(i => i.code === "script_mismatch"), "punctuation change not reported as script_mismatch");
ok(!validateFormat(example, catalog, { script: read(path.join(dir, "ok-whitespace.txt")) }).some(i => i.code === "script_mismatch"), "whitespace-only change reported as script_mismatch");

const cli = (...args) => spawnSync("node", ["scripts/validate-storyboard.mjs", ...args], { cwd: ROOT, encoding: "utf8" });
const bj = cli("tests/storyboards/bad-json.json", "--no-render");
ok(bj.status === 1 && /bad_json/.test(bj.stdout + bj.stderr) && !/\n\s+at /.test(bj.stdout + bj.stderr), "bad-json CLI: " + bj.status + " " + (bj.stdout + bj.stderr).slice(0, 300));
const good = cli("storyboards/example.json", "--script", "tests/storyboards/example-script.txt", "--no-render");
ok(good.status === 0 && /storyboard OK/.test(good.stdout), "example CLI failed: " + good.stdout + good.stderr);

if (fails.length) { console.log("FAIL storyboard format\n  - " + fails.join("\n  - ")); process.exit(1); }
console.log("PASS storyboard format");
