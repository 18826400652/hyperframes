// 测试公用:读取用例、为 (组件, 主题) 生成临时 HyperFrames 项目
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = path.join(ROOT, "tests/.out");
export const THEMES = ["minimal", "neon", "editorial", "bento", "custom"];
// custom 主题的测试配色:一套浅色、一套深色(深色用来查对比度),按组件名交替使用。
// 深色配色的荧光笔用深蓝:hyperframes check 对折行的高亮词按整块外框取底色,深底 + 浅色荧光笔会误报
export const CUSTOM_PALETTES = [
  { bg: "#F1ECE2", text: "#1C1A17", muted: "#6E675C", accent: "#B3261E", alert: "#1F4FBF", highlight: "#FFD84D", onHighlight: "#1C1A17", onAccent: "#FFFFFF", title: '"Noto Serif SC Variable", serif', body: '"Noto Sans SC Variable", sans-serif' },
  { bg: "#101114", text: "#F4F1EA", muted: "#8A8D96", accent: "#FFD84D", alert: "#FF5A5F", highlight: "#2B59C3", onHighlight: "#FFFFFF", onAccent: "#1C1A17", title: '"Noto Sans SC Variable", sans-serif', body: '"Noto Sans SC Variable", sans-serif' },
];
export const customStyle = p => `--hf-custom-bg:${p.bg};--hf-custom-text:${p.text};--hf-custom-muted:${p.muted};--hf-custom-accent:${p.accent};--hf-custom-alert:${p.alert};--hf-custom-highlight:${p.highlight};--hf-custom-on-highlight:${p.onHighlight};--hf-custom-on-accent:${p.onAccent};--hf-custom-on-alert:#FFFFFF;--hf-custom-font-title:${p.title};--hf-custom-font-body:${p.body}`;
export const customPalette = id => CUSTOM_PALETTES[[...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % CUSTOM_PALETTES.length];
export const CLI = ["--yes", "hyperframes@0.8.143"];

export function loadCase(id) {
  const file = path.join(ROOT, "tests/cases", id + ".json");
  if (!fs.existsSync(file)) throw new Error("no test case: " + file);
  const c = JSON.parse(fs.readFileSync(file, "utf8"));
  c.id = id;
  c.src = c.src || `compositions/${c.component}.html`;
  c.peaks = c.peaks || [c.peak];
  return c;
}

export function allCaseIds() {
  return fs.readdirSync(path.join(ROOT, "tests/cases")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)).sort();
}

const attr = s => s.replace(/&/g, "&amp;").replace(/'/g, "&#39;");

// 每个变体占一个时段;变体值为对象(单实例)或数组(多实例同时挂载)
export function buildFixture(c, theme, sheetVariant = "normal") {
  const dir = path.join(OUT, `${c.id}-${theme}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const d of ["assets", "compositions", "tests"]) fs.symlinkSync(path.join(ROOT, d), path.join(dir, d));
  for (const f of ["package.json", "hyperframes.json", "meta.json"]) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  const names = Object.keys(c.variants);
  const total = names.length * c.duration;
  let hosts = "", n = 0;
  names.forEach((name, i) => {
    const mounts = [].concat(c.variants[name]);
    for (const vars of mounts) {
      hosts += `    <div id="h${n}" data-composition-id="${c.component}" data-composition-src="${c.src}" data-start="${i * c.duration}" data-duration="${c.duration}" data-track-index="${n + 1}" data-width="1080" data-height="1920" data-variable-values='${attr(JSON.stringify(vars))}' style="position:absolute;inset:0;z-index:${n + 2}"></div>\n`;
      n++;
    }
  });
  const rootStyle = theme === "custom" ? ` style="${customStyle(customPalette(c.component)).replaceAll('"', "&quot;")}"` : "";
  const html = `<!doctype html>
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
  <div id="root" data-composition-id="main" data-theme="${theme}"${rootStyle} data-start="0" data-duration="${total}" data-width="1080" data-height="1920">
    <div id="base"></div>
${hosts}  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.to("#base", { opacity: 1, duration: ${total} }, 0);
    window.__timelines["main"] = tl;
  </script>
</body>
</html>
`;
  fs.writeFileSync(path.join(dir, "index.html"), html);
  const at = names.flatMap((_, i) => c.peaks.map(p => +(i * c.duration + p).toFixed(3)));
  const normalIdx = Math.max(0, names.indexOf(sheetVariant));
  return { dir, at, sheetAt: +(normalIdx * c.duration + c.peaks[0]).toFixed(3) };
}

// 静态检查:返回问题列表
export function staticIssues(c) {
  const file = path.join(ROOT, c.src);
  if (!fs.existsSync(file)) return [`component file missing: ${c.src}`];
  const s = fs.readFileSync(file, "utf8");
  const issues = [];
  if (/Math\.random|Date\.now/.test(s)) issues.push("uses Math.random / Date.now");
  if (/innerHTML\s*=[^;]*\bv\./.test(s)) issues.push("writes user variables through innerHTML");
  if (c.themed !== false) {
    const styles = [...s.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
    const hex = styles.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hex) issues.push("hard-coded colors in <style>: " + [...new Set(hex)].join(" "));
  }
  return issues;
}
