// 撑满检查:组件挂在一段长镜头(15 秒)上,段尾时内容还在,不提前退场(P-36b)。
// 有 cues 用例的(用例里写 "cues": { "vars": "1|7|12", "before": 4, "after": 13 }),
// 再查第 2 拍之前的画面明显比之后少——动作跟着 cues 走,不是一开始就全出来。
// 用法: node tests/fill.mjs [组件id ...]      只用 minimal 主题,每个组件一次 snapshot
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLI, OUT, ROOT, buildFixture, loadCase } from "./lib.mjs";

const LONG = 15;
const END = LONG - 1;              // 段尾前 1 秒:组件可以在最后不到 1 秒里退场,之前要一直在
const KEEP = 0.6;                  // 段尾内容至少是高峰时的这么多
const MIN_CONTENT = 30;            // 高峰时至少这么多个「非底色」像素(1/10 缩图),否则用例的 peak 不对
const FILL_KINDS = ["ui", "overlay", "scene"];
const W = 108, H = 192;            // 缩到 1/10 再数像素

const notes = JSON.parse(fs.readFileSync(path.join(ROOT, "catalog/notes.json"), "utf8"));

/** 画面里「不是底色」的像素数:底色取出现最多的颜色 */
function contentPixels(png) {
  const raw = spawnSync("ffmpeg", ["-loglevel", "error", "-i", png, "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: W * H * 3 + 1024 }).stdout;
  const count = new Map();
  for (let i = 0; i < raw.length; i += 3) { const k = (raw[i] >> 3) << 10 | (raw[i + 1] >> 3) << 5 | raw[i + 2] >> 3; count.set(k, (count.get(k) || 0) + 1); }
  const bg = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const [br, bgc, bb] = [(bg >> 10) << 3, ((bg >> 5) & 31) << 3, (bg & 31) << 3];
  let n = 0;
  for (let i = 0; i < raw.length; i += 3) if (Math.max(Math.abs(raw[i] - br), Math.abs(raw[i + 1] - bgc), Math.abs(raw[i + 2] - bb)) > 24) n++;
  return n;
}

function snapshots(c, vars, times) {
  const one = { ...c, id: `${c.id}-fill`, duration: LONG, variants: { normal: vars }, peaks: [c.peaks[0]] };
  const { dir } = buildFixture(one, "minimal");
  const snap = path.join(OUT, `${one.id}-snap`);
  fs.rmSync(snap, { recursive: true, force: true });
  const r = spawnSync("npx", [...CLI, "snapshot", dir, "--at", times.join(","), "--no-end", "-o", snap, "--describe", "false"], { encoding: "utf8" });
  const pngs = fs.existsSync(snap) ? fs.readdirSync(snap).filter(f => f.startsWith("frame-") && f.endsWith(".png")).sort() : [];
  if (r.status !== 0 || pngs.length !== times.length) throw new Error(`snapshot failed: ${(r.stderr || "").slice(-300)}`);
  return pngs.map(f => contentPixels(path.join(snap, f)));
}

const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : Object.keys(notes).filter(id => FILL_KINDS.includes(notes[id].kind)).sort();
let failed = 0;
fs.mkdirSync(OUT, { recursive: true });
for (const id of ids) {
  const file = path.join(ROOT, "tests/cases", id + ".json");
  const c = fs.existsSync(file) ? loadCase(id) : { id, component: id, src: `compositions/${id}.html`, peaks: [Math.min(notes[id].minDuration, 4) * 0.8], variants: { normal: {} } };
  const issues = [];
  if (c.fill?.skip) { console.log(`skip ${id}:${c.fill.skip}`); continue; }
  try {
    const peak = c.peaks[0];
    const [atPeak, atEnd] = snapshots(c, c.variants.normal || {}, [peak, END]);
    if (atPeak < MIN_CONTENT) issues.push(`高峰 ${peak}s 时画面上几乎没内容(${atPeak}),用例的 peak 不对,检查不出撑没撑满`);
    else if (atEnd < atPeak * KEEP) issues.push(`段尾 ${END}s 内容只剩高峰(${peak}s)的 ${Math.round(atEnd / Math.max(atPeak, 1) * 100)}%(${atEnd}/${atPeak})`);
    if (c.cues) {
      const [before, after] = snapshots(c, { ...(c.variants.normal || {}), cues: c.cues.vars }, [c.cues.before, c.cues.after]);
      if (before > after * 0.9) issues.push(`cues "${c.cues.vars}":${c.cues.before}s(${before})不比 ${c.cues.after}s(${after})少,动作没跟着 cues`);
    }
  } catch (e) { issues.push(e.message); }
  if (issues.length) { failed++; console.log(`FAIL ${id}\n  - ${issues.join("\n  - ")}`); }
  else console.log(`ok   ${id}`);
}
console.log(failed ? `\n${failed} 个组件没撑满或没跟 cues` : "\n全部撑满");
process.exit(failed ? 1 : 0);
