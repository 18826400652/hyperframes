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

// 像素断言:case.pixels = [{ variant, at, points: [[x, y], ...], minChroma }]
// 在指定时刻截图,要求至少一个点的色度(max(R,G,B) - min(R,G,B))不低于 minChroma(用于确认视频/图片画面确实被绘制)
// all: true 时要求每个点都达标(用于确认转场在中点完全盖住画面)
// via: "render" 时改用真实渲染出的 MP4 取帧(渲染器的媒体管线与 snapshot 不同,多实例录屏等问题只在渲染时出现)
function pixelIssues(c, dir, theme) {
  const issues = [];
  const names = Object.keys(c.variants);
  let mp4 = null;
  for (const p of c.pixels || []) {
    const t = +(names.indexOf(p.variant) * c.duration + p.at).toFixed(3);
    let frame;
    if (p.via === "render") {
      if (!mp4) {
        mp4 = path.join(OUT, `${c.id}-${theme}-render.mp4`);
        fs.rmSync(mp4, { force: true });
        const r = spawnSync("npx", [...CLI, "render", dir, "-f", "4", "-q", "draft", "-o", mp4], { encoding: "utf8", maxBuffer: 64 << 20 });
        if (r.status !== 0 || !fs.existsSync(mp4)) { issues.push("render failed"); mp4 = ""; }
      }
      if (!mp4) continue;
      frame = path.join(OUT, `${c.id}-${theme}-render-${t}.png`);
      spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(t), "-i", mp4, "-frames:v", "1", frame]);
      if (!fs.existsSync(frame)) { issues.push(`frame extract failed at ${t}s`); continue; }
    } else {
      const snap = path.join(OUT, `${c.id}-${theme}-px`);
      fs.rmSync(snap, { recursive: true, force: true });
      const r = spawnSync("npx", [...CLI, "snapshot", dir, "--at", String(t), "--no-end", "-o", snap, "--describe", "false"], { encoding: "utf8" });
      const png = fs.existsSync(snap) && fs.readdirSync(snap).find(f => f.startsWith("frame-") && f.endsWith(".png"));
      if (r.status !== 0 || !png) { issues.push(`snapshot failed at ${t}s`); continue; }
      frame = path.join(snap, png);
    }
    const chroma = p.points.map(([x, y]) => {
      const raw = spawnSync("ffmpeg", ["-loglevel", "error", "-i", frame, "-vf", `crop=1:1:${x}:${y}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1024 });
      const [R, G, B] = raw.stdout; return Math.max(R, G, B) - Math.min(R, G, B);
    });
    const got = p.all ? Math.min(...chroma) : Math.max(...chroma);
    if (got < p.minChroma) issues.push(`${p.via === "render" ? "[render] " : ""}${p.variant}@${p.at}s: ${p.all ? "min" : "max"} chroma ${got} < ${p.minChroma} at ${JSON.stringify(p.points)} (${chroma.join(",")})`);
  }
  return issues;
}

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
    if (r.status === 0) {
      const px = pixelIssues(c, dir, theme);
      if (!px.length) { console.log(`PASS ${id} [${theme}]`); continue; }
      failed++; console.log(`FAIL ${id} [${theme}] [pixels]\n  - ${px.join("\n  - ")}`); continue;
    }
    failed++;
    const lines = log.split("\n").filter(l => /✗|⚠|error|Error|warning/i.test(l) && !/^npm/.test(l)).slice(0, 12);
    console.log(`FAIL ${id} [${theme}]\n  ${lines.join("\n  ")}`);
  }
}
console.log(failed ? `\n${failed} failure(s)` : "\nall passed");
process.exit(failed ? 1 : 0);
