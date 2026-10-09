// 用法: node tests/run.mjs [组件id ...] [--theme neon]
// 对每个组件 × 主题:静态检查 + hyperframes check --strict(含底部安全区)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { THEMES, CLI, OUT, loadCase, allCaseIds, buildFixture, staticIssues } from "./lib.mjs";

const args = process.argv.slice(2);
const ti = args.indexOf("--theme");
const themes = ti >= 0 ? [args[ti + 1]] : THEMES;
const ids = args.filter((a, i) => !a.startsWith("--") && !(ti >= 0 && i === ti + 1));
const targets = ids.length ? ids : allCaseIds();
const CAPTION_ZONE = "x0=0;y0=0.79;x1=1;y1=1;severity=error";

let failed = 0;
fs.mkdirSync(OUT, { recursive: true });
for (const id of targets) {
  const c = loadCase(id);
  const st = staticIssues(c);
  if (st.length) { failed++; console.log(`FAIL ${id} [static]\n  - ${st.join("\n  - ")}`); continue; }
  for (const theme of themes) {
    const { dir, at } = buildFixture(c, theme);
    const cmd = ["check", dir, "--strict", "--at", at.join(",")];
    if (c.captionZone !== false) cmd.push("--caption-zone", CAPTION_ZONE);
    const r = spawnSync("npx", [...CLI, ...cmd], { encoding: "utf8", maxBuffer: 64 << 20 });
    const log = (r.stdout || "") + (r.stderr || "");
    fs.writeFileSync(path.join(OUT, `${id}-${theme}.check.log`), log);
    if (r.status === 0) { console.log(`PASS ${id} [${theme}]`); continue; }
    failed++;
    const lines = log.split("\n").filter(l => /✗|⚠|error|Error|warning/i.test(l) && !/^npm/.test(l)).slice(0, 12);
    console.log(`FAIL ${id} [${theme}]\n  ${lines.join("\n  ")}`);
  }
}
console.log(failed ? `\n${failed} failure(s)` : "\nall passed");
process.exit(failed ? 1 : 0);
