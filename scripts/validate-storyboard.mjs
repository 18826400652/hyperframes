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
    if (comp) checkVariables(comp, s.variables, id, "variables", issues);

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
// 主组件为叠加类时在其下垫 dy-scene-bg;值为空串的变量不传入(使用组件默认值 / 占位素材)
const CLI = ["--yes", "hyperframes@0.8.143"];
const CAPTION_ZONE = "x0=0;y0=0.79;x1=1;y1=1;severity=error";
const attr = s => s.replace(/&/g, "&amp;").replace(/'/g, "&#39;");
const filled = vars => Object.fromEntries(Object.entries(isObj(vars) ? vars : {}).filter(([, v]) => v !== ""));

function host(id, component, start, duration, vars, z) {
  return `    <div id="${id}" data-composition-id="${component}" data-composition-src="compositions/${component}.html" data-start="${start}" data-duration="${duration}" data-width="1080" data-height="1920" data-variable-values='${attr(JSON.stringify(filled(vars)))}' style="position:absolute;inset:0;z-index:${z}"></div>`;
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
    hosts.push(host("main", s.component, 0, D, s.variables, 2));
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
