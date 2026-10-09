// 用法: node tests/sheet.mjs <组件id> [--variant long]  → tests/.out/<id>[-<variant>]-themes.png(4 主题横向拼图)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { THEMES, CLI, OUT, loadCase, buildFixture } from "./lib.mjs";

const id = process.argv[2];
const vi = process.argv.indexOf("--variant");
const variant = vi > 0 ? process.argv[vi + 1] : "normal";
if (!id) { console.error("usage: node tests/sheet.mjs <id>"); process.exit(2); }
const c = loadCase(id);
const frames = [];
for (const theme of THEMES) {
  const { dir, sheetAt } = buildFixture(c, theme, variant);
  const snapDir = path.join(OUT, `${id}-${theme}-snap`);
  fs.rmSync(snapDir, { recursive: true, force: true });
  const r = spawnSync("npx", [...CLI, "snapshot", dir, "--at", String(sheetAt), "--no-end", "-o", snapDir, "--describe", "false"], { encoding: "utf8" });
  const png = fs.existsSync(snapDir) && fs.readdirSync(snapDir).find(f => f.startsWith("frame-") && f.endsWith(".png"));
  if (r.status !== 0 || !png) { console.error(`snapshot failed for ${theme}\n${r.stdout}${r.stderr}`); process.exit(1); }
  frames.push(path.join(snapDir, png));
}
const out = path.join(OUT, `${id}${variant === "normal" ? "" : "-" + variant}-themes.png`);
const inputs = frames.flatMap(f => ["-i", f]);
const filter = frames.map((_, i) => `[${i}]scale=540:-1[s${i}]`).join(";") + ";" + frames.map((_, i) => `[s${i}]`).join("") + `hstack=inputs=${frames.length}`;
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, out], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(out);
