// 生成组件目录 catalog/catalog.json:组件变量声明(来自 compositions/dy-*.html)+ 人工说明(catalog/notes.json)
// 用法: node scripts/build-catalog.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KINDS = ["scene", "overlay", "transition", "ui", "global", "subtitle", "tool"];

function readVariables(html) {
  const m = html.match(/data-composition-variables='([\s\S]*?)'/);
  if (!m) return [];
  return JSON.parse(m[1]).map(v => ({ id: v.id, type: v.type, label: v.label || "", default: v.default ?? "" }));
}

export function buildCatalog(root) {
  const errors = [];
  const notes = JSON.parse(fs.readFileSync(path.join(root, "catalog/notes.json"), "utf8"));
  const ids = fs.readdirSync(path.join(root, "compositions")).filter(f => /^dy-.*\.html$/.test(f)).map(f => f.slice(0, -5)).sort();
  const components = [];
  for (const id of ids) {
    const n = notes[id];
    if (!n) { errors.push(`missing notes: ${id}`); continue; }
    if (!KINDS.includes(n.kind)) errors.push(`bad kind for ${id}: ${n.kind}`);
    if (!n.purpose || !n.suitableFor || !(n.minDuration > 0)) errors.push(`incomplete notes: ${id}`);
    let variables = [];
    try { variables = readVariables(fs.readFileSync(path.join(root, "compositions", id + ".html"), "utf8")); }
    catch (e) { errors.push(`bad variable declaration in ${id}: ${e.message}`); }
    components.push({ id, kind: n.kind, purpose: n.purpose, suitableFor: n.suitableFor, minDuration: n.minDuration, variables });
  }
  for (const id of Object.keys(notes)) if (!ids.includes(id)) errors.push(`notes for unknown component: ${id}`);
  return { catalog: { version: 1, components }, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { catalog, errors } = buildCatalog(root);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  const text = JSON.stringify(catalog, null, 2) + "\n";
  const file = path.join(root, "catalog/catalog.json");
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) { console.error("catalog/catalog.json is out of date; run npm run build:catalog"); process.exit(1); }
    console.log("catalog/ is up to date");
  } else {
    fs.writeFileSync(file, text);
    console.log(`catalog/catalog.json: ${catalog.components.length} components`);
  }
}
