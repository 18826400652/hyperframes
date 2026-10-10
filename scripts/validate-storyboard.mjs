// 画面清单校验
// 用法: node scripts/validate-storyboard.mjs <清单.json> [--script <口播稿.txt>] [--no-render]
// 先做格式检查(validateFormat),通过后做渲染检查(renderCheck);全部通过打印 "storyboard OK"
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readVariables } from "./build-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES = ["minimal", "neon", "editorial", "bento"];
const TRANSITIONS = ["dy-tr-wipe", "dy-tr-zoom", "dy-tr-glitch"];
const MAIN_KINDS = ["scene", "overlay", "ui"];
const OVERLAY_KINDS = ["overlay", "ui"];
const NEED_TYPES = ["recording", "image"];
const STATUSES = ["pending", "accepted"];
const MAX_DURATION = 30;

const strip = s => String(s).replace(/\s/g, "");
const COLOR_VAR = /^(theme|accent|accent2|leftColor|colorB|keyColor|color)$/;
// 配置类变量:不是显示给观众的文字/数字,不要求显式填写,也不做数字检查
const CONFIG_VARS = new Set(["cues", "ratio", "focus", "x", "y", "rotate", "speed", "max", "hold", "secondsPerLine", "from", "active", "variant", "layout", "direction"]);
// 另外不做数字检查的变量:序号、名次、代码、链接、文件名
const NUMBER_EXEMPT = new Set([...CONFIG_VARS, "index", "rank", "code", "url", "file"]);
const MAX_SCENE_SECONDS = 8.5, MAX_RECORDING_SECONDS = 12.5;

// 中文数字转阿拉伯数字:含 十/百/千 的按位值计算("三千五百" → 3500,"一百万" → "100万"),
// 不含单位的逐位读("二零二四" → 2024),"点"后为小数("九十九点九" → 99.9),"X个半" → X.5;
// "一起""一些"等习惯用语里的"一"不当数字
const CN_DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };
function cnInt(run) {
  if (!/[十百千]/.test(run)) return [...run].map(c => CN_DIGIT[c]).join("");
  let total = 0, cur = 0;
  for (const c of run) {
    if (c in CN_UNIT) { total += (cur || 1) * CN_UNIT[c]; cur = 0; } else cur = CN_DIGIT[c];
  }
  return String(total + cur);
}
function normalizeNumbers(text) {
  return String(text)
    .replace(/一(?=[起些样直定般切下边旦])/g, "")
    .replace(/([零〇一二两三四五六七八九十百千]+)(?:点([零〇一二三四五六七八九]+))?/g, (_, i, d) => cnInt(i) + (d ? "." + [...d].map(c => CN_DIGIT[c]).join("") : ""))
    .replace(/(\d),(?=\d{3})/g, "$1")
    .replace(/(\d+)个半/g, "$1.5");
}
const numbersIn = v => (normalizeNumbers(typeof v === "number" ? String(v) : v).match(/\d+(?:\.\d+)?/g) || []).map(n => String(Number(n)));
const chars = s => Array.from(strip(s)).length;
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

// 组件查找:目录中的组件,或清单 newComponents 中且文件存在的新组件(新组件视为整屏或叠加均可)
function lookup(catalog, sb, root) {
  const map = new Map(catalog.components.map(c => [c.id, c]));
  for (const n of Array.isArray(sb.newComponents) ? sb.newComponents : []) {
    if (!n || map.has(n.id)) continue;
    const file = path.join(root, "compositions", `${n.id}.html`);
    if (typeof n.id === "string" && fs.existsSync(file)) {
      map.set(n.id, { id: n.id, kind: "new", minDuration: 1, variables: readVariables(fs.readFileSync(file, "utf8")) });
    }
  }
  return id => map.get(id);
}

function checkVariables(comp, vars, scene, field, issues) {
  if (vars === undefined) return;
  if (!isObj(vars)) { issues.push({ scene, field, code: "bad_variable_type", message: "variables 必须是对象" }); return; }
  for (const [k, v] of Object.entries(vars)) {
    const decl = comp.variables.find(d => d.id === k);
    if (!decl) { issues.push({ scene, field: `${field}.${k}`, code: "unknown_variable", message: `${comp.id} 没有变量 ${k}` }); continue; }
    const okType = decl.type === "number" ? typeof v === "number" && Number.isFinite(v)
      : decl.type === "boolean" ? typeof v === "boolean"
      : typeof v === "string";
    if (!okType) issues.push({ scene, field: `${field}.${k}`, code: "bad_variable_type", message: `${k} 应为 ${decl.type}` });
  }
}

// 显示文字的变量必须显式填写(空串表示不显示),否则会露出组件自带的示例文案
function checkDefaults(comp, vars, needVars, scene, field, issues) {
  for (const d of comp.variables) {
    const shows = (d.type === "string" && d.default !== "") || (d.type === "number" && d.default !== "" && d.default !== null);
    if (!shows || COLOR_VAR.test(d.id) || CONFIG_VARS.has(d.id) || needVars.has(d.id)) continue;
    if (!isObj(vars) || !(d.id in vars)) issues.push({ scene, field: `${field}.${d.id}`, code: "default_text", message: `未填写 ${d.id},会显示组件示例${d.type === "number" ? "数字" : "文案"}「${String(d.default).slice(0, 20)}」;请填写或设为 ""` });
  }
}

function checkNumbers(vars, scriptNumbers, scene, field, issues) {
  for (const [k, v] of Object.entries(isObj(vars) ? vars : {})) {
    if (COLOR_VAR.test(k) || NUMBER_EXEMPT.has(k) || (typeof v !== "string" && typeof v !== "number")) continue;
    for (const n of numbersIn(v)) {
      if (!scriptNumbers.has(n)) issues.push({ scene, field: `${field}.${k}`, code: "number_not_in_script", message: `数字 ${n} 在口播里找不到;数字只能来自口播` });
    }
  }
}

export function validateFormat(sb, catalog, opts = {}) {
  const issues = [];
  const top = (code, field, message) => issues.push({ scene: null, field, code, message });
  if (!isObj(sb) || sb.version !== 1 || !Array.isArray(sb.scenes) || !sb.scenes.length) {
    top("bad_top", "scenes", "需要 version: 1 和非空的 scenes 数组");
    return issues;
  }
  if (sb.theme !== undefined && !THEMES.includes(sb.theme)) top("bad_theme", "theme", `主题只能是 ${THEMES.join(" / ")}`);
  const cps = sb.charsPerSecond ?? 4;
  if (!(typeof cps === "number" && cps > 0)) top("bad_top", "charsPerSecond", "charsPerSecond 必须是正数");
  for (const n of Array.isArray(sb.newComponents) ? sb.newComponents : []) {
    if (!n || !STATUSES.includes(n.status)) top("bad_new_component", "newComponents", `${n && n.id}: status 只能是 pending / accepted`);
  }
  const find = lookup(catalog, sb, opts.root || ROOT);
  const scriptNumbers = new Set(numbersIn((typeof opts.script === "string" ? opts.script : sb.scenes.map(x => (isObj(x) && typeof x.script === "string" ? x.script : "")).join("")).replace(/\s/g, "")));

  sb.scenes.forEach((s, i) => {
    const want = "s" + String(i + 1).padStart(2, "0");
    const id = isObj(s) && typeof s.id === "string" ? s.id : want;
    const add = (field, code, message) => issues.push({ scene: id, field, code, message });
    if (!isObj(s)) { add("", "bad_top", "画面必须是对象"); return; }
    if (s.id !== want) add("id", "bad_scene_id", `应为 ${want}`);
    if (typeof s.script !== "string" || !strip(s.script)) add("script", "missing_script", "缺少口播原文");

    const comp = find(s.component);
    if (!comp) add("component", "unknown_component", `组件不存在: ${s.component}`);
    else if (comp.kind !== "new" && !MAIN_KINDS.includes(comp.kind)) add("component", "forbidden_main", `${s.component}(${comp.kind})不能作为画面主组件`);
    const needVars = new Set((Array.isArray(s.needs) ? s.needs : []).map(n => n && n.variable));
    if (comp) {
      checkVariables(comp, s.variables, id, "variables", issues);
      checkDefaults(comp, s.variables, needVars, id, "variables", issues);
    }
    checkNumbers(s.variables, scriptNumbers, id, "variables", issues);
    const limit = s.component === "dy-rec-phone" ? MAX_RECORDING_SECONDS : MAX_SCENE_SECONDS;
    if (typeof s.script === "string" && chars(s.script) / cps > limit) {
      add("script", "script_too_long", `这段口播约 ${Math.round(chars(s.script) / cps)} 秒,超过 ${Math.floor(limit)} 秒,请拆成多个画面`);
    }

    const min = Math.max(comp ? comp.minDuration : 0, typeof s.script === "string" ? chars(s.script) / cps : 0);
    if (typeof s.duration !== "number" || !(s.duration > 0)) add("duration", "duration_too_short", "缺少时长");
    else if (s.duration < min - 0.05) add("duration", "duration_too_short", `至少 ${Math.round(min * 10) / 10} 秒`);
    else if (s.duration > MAX_DURATION) add("duration", "duration_too_long", `不超过 ${MAX_DURATION} 秒`);

    const overlays = s.overlays ?? [];
    if (!Array.isArray(overlays)) add("overlays", "bad_overlay", "overlays 必须是数组");
    else {
      if (overlays.length > 2) add("overlays", "too_many_overlays", "叠加组件最多 2 个");
      overlays.forEach((o, k) => {
        const f = `overlays[${k}]`;
        const oc = isObj(o) && find(o.component);
        if (!oc) { add(f, "unknown_component", `组件不存在: ${o && o.component}`); return; }
        if (oc.kind !== "new" && !OVERLAY_KINDS.includes(oc.kind)) add(f, "bad_overlay", `${o.component}(${oc.kind})不能作为叠加组件`);
        checkVariables(oc, o.variables, id, `${f}.variables`, issues);
        checkDefaults(oc, o.variables, new Set(), id, `${f}.variables`, issues);
        checkNumbers(o.variables, scriptNumbers, id, `${f}.variables`, issues);
        if (!(typeof o.at === "number" && o.at >= 0 && typeof o.duration === "number" && o.duration > 0 && o.at + o.duration <= s.duration + 1e-6)) {
          add(f, "overlay_out_of_range", "at 与 duration 必须落在画面时长内");
        }
      });
    }

    const tr = s.transitionIn ?? null;
    if (tr !== null && !TRANSITIONS.includes(tr)) add("transitionIn", "bad_transition", `转场只能是 ${TRANSITIONS.join(" / ")}`);
    if (i === 0 && tr !== null) add("transitionIn", "first_transition", "第一个画面不能有转场");

    const needs = s.needs ?? [];
    if (!Array.isArray(needs)) add("needs", "bad_need", "needs 必须是数组");
    else needs.forEach((n, k) => {
      if (!isObj(n) || !NEED_TYPES.includes(n.type) || !(comp && comp.variables.some(v => v.id === n.variable))) {
        add(`needs[${k}]`, "bad_need", "type 只能是 recording / image,variable 必须是该组件的变量");
      }
    });
  });

  if (typeof opts.script === "string") {
    const joined = strip(sb.scenes.map(s => (isObj(s) && typeof s.script === "string" ? s.script : "")).join(""));
    const want = strip(opts.script);
    if (joined !== want) {
      let k = 0; while (k < joined.length && joined[k] === want[k]) k++;
      top("script_mismatch", "script", `口播与原稿不一致,从第 ${k + 1} 个字起不同:原稿「${want.slice(k, k + 12)}」/ 清单「${joined.slice(k, k + 12)}」`);
    }
  }
  return issues;
}

// 渲染检查:每个画面生成一个临时工程(主组件 + 叠加组件,清单主题),用 hyperframes check --strict 检查真实文案
// 主组件为叠加类时在其下垫 dy-scene-bg
const CLI = ["--yes", "hyperframes@0.8.143"];
const CAPTION_ZONE = "x0=0;y0=0.79;x1=1;y1=1;severity=error";
const attr = s => s.replace(/&/g, "&amp;").replace(/'/g, "&#39;");
// 待补素材(needs)的变量为空串时不传入,改用组件占位素材;其他空串照常传入(表示不显示)
const filled = (vars, needVars = new Set()) => Object.fromEntries(Object.entries(isObj(vars) ? vars : {}).filter(([k, v]) => !(v === "" && needVars.has(k))));

function host(id, component, start, duration, vars, z, needVars) {
  return `    <div id="${id}" data-composition-id="${component}" data-composition-src="compositions/${component}.html" data-start="${start}" data-duration="${duration}" data-width="1080" data-height="1920" data-variable-values='${attr(JSON.stringify(filled(vars, needVars)))}' style="position:absolute;inset:0;z-index:${z}"></div>`;
}

export function renderCheck(sb, opts = {}) {
  const root = opts.root || ROOT;
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog/catalog.json"), "utf8"));
  const find = lookup(catalog, sb, root);
  const theme = sb.theme || "neon";
  const outDir = opts.outDir || path.join(root, "tests/.out/storyboard");
  return sb.scenes.map(s => {
    const dir = path.join(outDir, s.id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    // compositions 复制而不是软链:软链时 hyperframes 打包器会跳过子合成(当作空文件),lint 不检查组件本身
    for (const d of ["assets", "tests"]) fs.symlinkSync(path.join(root, d), path.join(dir, d));
    fs.cpSync(path.join(root, "compositions"), path.join(dir, "compositions"), { recursive: true });
    for (const f of ["package.json", "hyperframes.json", "meta.json"]) fs.copyFileSync(path.join(root, f), path.join(dir, f));
    const D = s.duration;
    const hosts = [];
    if (find(s.component)?.kind === "overlay") hosts.push(host("bg", "dy-scene-bg", 0, D, {}, 1));
    hosts.push(host("main", s.component, 0, D, s.variables, 2, new Set((s.needs || []).map(n => n.variable))));
    (s.overlays || []).forEach((o, k) => hosts.push(host(`ov${k}`, o.component, o.at, o.duration, o.variables, 3 + k)));
    fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html>
<html lang="zh-CN" data-resolution="portrait">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <link rel="stylesheet" href="assets/dykit/dykit.css" />
  <script src="assets/gsap.min.js"></script>
  <script src="assets/dykit/hf-kit.js"></script>
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } html, body { width: 1080px; height: 1920px; overflow: hidden; } #root { position: relative; width: 100%; height: 100%; overflow: hidden; } #base { position: absolute; inset: 0; background: var(--hf-bg); }</style>
</head>
<body>
  <div id="root" data-composition-id="main" data-theme="${theme}" data-start="0" data-duration="${D}" data-width="1080" data-height="1920">
    <div id="base"></div>
${hosts.join("\n")}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.to("#base", { opacity: 1, duration: ${D} }, 0);
    window.__timelines["main"] = tl;
  </script>
</body>
</html>
`);
    const at = [D * 0.6, ...(s.overlays || []).map(o => o.at + o.duration * 0.5)].map(t => +t.toFixed(2));
    const r = spawnSync("npx", [...CLI, "check", dir, "--strict", "--at", at.join(","), "--caption-zone", CAPTION_ZONE], { encoding: "utf8", maxBuffer: 64 << 20 });
    return { scene: s.id, ok: r.status === 0, log: (r.stdout || "") + (r.stderr || "") };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--script");
  const si = args.indexOf("--script");
  if (!file) { console.error("用法: node scripts/validate-storyboard.mjs <清单.json> [--script <口播稿.txt>] [--no-render]"); process.exit(2); }
  const fail = lines => { console.log(lines.join("\n")); process.exit(1); };
  let sb;
  try { sb = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { fail([`[-] file: 无法读取或不是合法 JSON:${e.message} (bad_json)`]); }
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "catalog/catalog.json"), "utf8"));
  const script = si >= 0 ? fs.readFileSync(args[si + 1], "utf8") : undefined;
  const issues = validateFormat(sb, catalog, { script });
  if (issues.length) fail(issues.map(i => `[${i.scene || "-"}] ${i.field}: ${i.message} (${i.code})`));
  if (!args.includes("--no-render")) {
    const results = renderCheck(sb);
    const bad = results.filter(r => !r.ok);
    if (bad.length) fail(bad.flatMap(r => [`[${r.scene}] render: 检查未通过`, ...r.log.split("\n").filter(l => /✗|⚠/.test(l)).slice(0, 6).map(l => "    " + l.trim())]));
  }
  console.log("storyboard OK");
}
