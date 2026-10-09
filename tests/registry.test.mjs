// 用法: node tests/registry.test.mjs
// 1) registry 与源文件一致;2) 在本地 HTTPS 上模拟远程 registry,把组件装进空项目;3) 该项目 check 通过
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { ROOT, OUT, CLI } from "./lib.mjs";

const fail = msg => { console.log("FAIL registry: " + msg); process.exit(1); };
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20, ...opts });

// 1) registry 与源文件一致
const chk = run("node", [path.join(ROOT, "scripts/build-registry.mjs"), "--check"]);
if (chk.status !== 0) fail("build-registry --check: " + (chk.stdout + chk.stderr).trim().split("\n").slice(-5).join(" | "));

// 2) 本地 HTTPS 服务(自签证书)
const tmp = path.join(OUT, "registry-e2e");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const key = path.join(tmp, "key.pem"), cert = path.join(tmp, "cert.pem");
const ssl = run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1", "-keyout", key, "-out", cert]);
if (ssl.status !== 0) fail("openssl: " + ssl.stderr);
const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "https://x").pathname));
  if (!p.startsWith(path.join(ROOT, "registry")) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200); fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `https://localhost:${server.address().port}/registry`;

// 空的消费项目
const proj = path.join(tmp, "consumer");
fs.mkdirSync(path.join(proj, "assets"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "assets/gsap.min.js"), path.join(proj, "assets/gsap.min.js"));
for (const f of ["package.json", "meta.json"]) fs.copyFileSync(path.join(ROOT, f), path.join(proj, f));
fs.writeFileSync(path.join(proj, "hyperframes.json"), JSON.stringify({ registry: base, paths: { blocks: "compositions", components: "compositions/components", assets: "assets" } }, null, 2));

// 保留环境里原有的额外证书(如代理 CA),再追加本地自签证书;registry 缓存按地址区分,随机端口不会命中旧缓存
const bundle = path.join(tmp, "ca-bundle.pem");
const prev = process.env.NODE_EXTRA_CA_CERTS && fs.existsSync(process.env.NODE_EXTRA_CA_CERTS) ? fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS, "utf8") + "\n" : "";
fs.writeFileSync(bundle, prev + fs.readFileSync(cert, "utf8"));
const env = { ...process.env, NODE_EXTRA_CA_CERTS: bundle, NO_PROXY: "localhost,127.0.0.1", no_proxy: "localhost,127.0.0.1" };
const add = await new Promise(resolve => {
  const p = spawn("npx", [...CLI, "add", "dy-scene-title", "--dir", proj, "--no-clipboard"], { env });
  let out = ""; p.stdout.on("data", d => out += d); p.stderr.on("data", d => out += d);
  p.on("close", code => resolve({ code, out }));
});
server.close();
if (add.code !== 0) fail("hyperframes add: " + add.out.trim().split("\n").slice(-8).join(" | "));
for (const f of ["compositions/dy-scene-title.html", "assets/dykit/dykit.css", "assets/dykit/hf-kit.js", "assets/dykit/theme.css", "assets/dykit/fonts/fonts.css"]) {
  if (!fs.existsSync(path.join(proj, f))) fail("not installed: " + f);
}

// 3) 接入两行 + 挂载组件,check 通过
fs.writeFileSync(path.join(proj, "index.html"), `<!doctype html>
<html lang="zh-CN" data-resolution="portrait">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
  <link rel="stylesheet" href="assets/dykit/dykit.css" />
  <script src="assets/gsap.min.js"></script>
  <script src="assets/dykit/hf-kit.js"></script>
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } html, body { width: 1080px; height: 1920px; overflow: hidden; } #root { position: relative; width: 100%; height: 100%; overflow: hidden; }</style>
</head>
<body>
  <div id="root" data-composition-id="main" data-theme="neon" data-start="0" data-duration="4" data-width="1080" data-height="1920">
    <div id="t" data-composition-id="dy-scene-title" data-composition-src="compositions/dy-scene-title.html" data-start="0" data-duration="4" data-width="1080" data-height="1920" style="position:absolute;inset:0"></div>
  </div>
  <script>const tl = gsap.timeline({ paused: true }); tl.to({}, { duration: 4 }, 0); window.__timelines["main"] = tl;</script>
</body>
</html>
`);
const check = run("npx", [...CLI, "check", proj, "--strict", "--at", "2.5"]);
if (check.status !== 0) fail("check in consumer: " + (check.stdout + check.stderr).split("\n").filter(l => /✗|⚠/.test(l)).slice(0, 6).join(" | "));
console.log("PASS registry (check, install via https, consumer check)");
