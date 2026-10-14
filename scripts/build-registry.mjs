// 从 compositions/dy-*.html 与 assets/dykit/ 生成 HyperFrames registry(registry/)
// 用法: node scripts/build-registry.mjs          生成
//       node scripts/build-registry.mjs --check  仅检查 registry/ 是否与源文件一致(不一致退出码 1)
//       --asset-base <url>  资源包文件的下载地址前缀(默认本仓库 main 分支,测试时指向本地服务)
//       --out <dir>         输出目录(默认 registry/)
// 资源包(assets/dykit/)不复制进 registry,registry-item.json 里用 file.url 指向仓库中的源文件,避免重复存放字体
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KIT = "assets/dykit";
const SCHEMA = "https://hyperframes.heygen.com/schema";
// block 类型必须声明画面尺寸与参考时长
const FRAME = { dimensions: { width: 1080, height: 1920 }, duration: 4 };
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const ASSET_BASE = arg("--asset-base") ?? "https://raw.githubusercontent.com/18826400652/hyperframes/main/";

function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]).sort();
}

const json = o => JSON.stringify(o, null, 2) + "\n";
const themed = file => fs.readFileSync(path.join(ROOT, "compositions", file), "utf8").includes("HF.applyTheme");

function build(outDir) {
  const write = (rel, data) => { const p = path.join(outDir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
  const copy = (src, rel) => write(rel, fs.readFileSync(path.join(ROOT, src)));
  const items = [];

  // 资源包:所有组件的共同依赖
  const kitFiles = walk(KIT);
  write("blocks/dykit/registry-item.json", json({
    $schema: `${SCHEMA}/registry-item.json`, name: "dykit", type: "hyperframes:block", ...FRAME,
    title: "dykit 主题与资源包",
    description: "dykit 组件共用的主题样式(minimal / neon / editorial / bento / custom)、HF 工具集与中文字体。安装后在 index.html 的 <head> 引入 assets/dykit/dykit.css 与 assets/dykit/hf-kit.js。",
    tags: ["dykit"],
    files: kitFiles.map(f => ({ path: f, url: new URL(f, ASSET_BASE).href, target: f, type: f.endsWith(".css") ? "hyperframes:style" : "hyperframes:asset" })),
  }));
  items.push({ name: "dykit", type: "hyperframes:block" });

  // 每个 dy-* 组件一个 block
  for (const file of fs.readdirSync(path.join(ROOT, "compositions")).filter(f => /^dy-.*\.html$/.test(f)).sort()) {
    const name = file.slice(0, -5);
    copy(`compositions/${file}`, `blocks/${name}/${file}`);
    write(`blocks/${name}/registry-item.json`, json({
      $schema: `${SCHEMA}/registry-item.json`, name, type: "hyperframes:block", ...FRAME,
      title: name, description: `dykit 抖音竖屏组件 ${name}(1080×1920${themed(file) ? ",支持 5 种主题" : ""})。`,
      tags: ["dykit", "douyin", "portrait"],
      registryDependencies: ["dykit"],
      files: [{ path: file, target: `compositions/${file}`, type: "hyperframes:composition" }],
    }));
    items.push({ name, type: "hyperframes:block" });
  }

  write("registry.json", json({
    $schema: `${SCHEMA}/registry.json`, name: "dykit",
    homepage: "https://github.com/18826400652/hyperframes", items,
  }));
}

function same(a, b) {
  const list = d => fs.existsSync(d) ? walkAbs(d).map(p => path.relative(d, p)) : [];
  const walkAbs = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walkAbs(path.join(d, e.name)) : [path.join(d, e.name)]).sort();
  const la = list(a), lb = list(b);
  const diff = la.filter(x => !lb.includes(x)).concat(lb.filter(x => !la.includes(x)));
  for (const f of la.filter(x => lb.includes(x))) if (!fs.readFileSync(path.join(a, f)).equals(fs.readFileSync(path.join(b, f)))) diff.push(f);
  return diff;
}

const out = path.resolve(ROOT, arg("--out") ?? "registry");
if (process.argv.includes("--check")) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dykit-registry-"));
  build(tmp);
  const diff = same(tmp, out);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (diff.length) { console.log("registry/ is out of date (run: node scripts/build-registry.mjs):\n  " + diff.slice(0, 20).join("\n  ")); process.exit(1); }
  console.log("registry/ is up to date");
} else {
  fs.rmSync(out, { recursive: true, force: true });
  build(out);
  console.log("registry/ written");
}
