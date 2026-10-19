// 组件目录测试:生成结果完整、缺少说明 / 多余说明报错、--check 发现过期目录
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "./lib.mjs";
import { buildCatalog } from "../scripts/build-catalog.mjs";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const { catalog, errors } = buildCatalog(ROOT);
ok(errors.length === 0, "unexpected errors: " + errors.join("; "));
const files = fs.readdirSync(path.join(ROOT, "compositions")).filter(f => /^dy-.*\.html$/.test(f));
ok(catalog.components.length === files.length, `components ${catalog.components.length} != files ${files.length}`);
const title = catalog.components.find(c => c.id === "dy-scene-title");
ok(title && title.variables.some(v => v.id === "title"), "dy-scene-title lacks variable title");
ok(catalog.components.every(c => c.suitableFor && c.purpose && c.kind && c.minDuration > 0), "component missing notes fields");

// 节拍:声明了 cues 变量的组件,说明里要写 beats(第几拍是什么),目录里带上;没有 cues 的不写
const withCues = catalog.components.filter(c => c.variables.some(v => v.id === "cues"));
ok(withCues.length > 0, "没有组件声明 cues 变量");
ok(withCues.every(c => Array.isArray(c.beats) && c.beats.length > 0), "声明了 cues 的组件缺 beats: " + withCues.filter(c => !(c.beats || []).length).map(c => c.id).join(" "));
ok(catalog.components.filter(c => !withCues.includes(c)).every(c => c.beats === undefined), "没有 cues 变量的组件不该有 beats");

// 临时副本:删掉一条说明、加一条不存在的说明
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-"));
fs.cpSync(path.join(ROOT, "compositions"), path.join(tmp, "compositions"), { recursive: true });
fs.mkdirSync(path.join(tmp, "catalog"));
const notes = JSON.parse(fs.readFileSync(path.join(ROOT, "catalog/notes.json"), "utf8"));
delete notes["dy-poll"];
notes["dy-nope"] = { kind: "overlay", purpose: "x", suitableFor: "x", minDuration: 1 };
fs.writeFileSync(path.join(tmp, "catalog/notes.json"), JSON.stringify(notes));
const bad = buildCatalog(tmp).errors;
ok(bad.includes("missing notes: dy-poll"), "missing-notes error not reported: " + bad.join("; "));
ok(bad.includes("notes for unknown component: dy-nope"), "unknown-notes error not reported: " + bad.join("; "));

// 镜头(kind shot):sfx 拍点和变量的 maxChars 带进目录;sfx 的 beat 超出 beats 报错
const shotTmp = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-shot-"));
fs.mkdirSync(path.join(shotTmp, "compositions"));
fs.mkdirSync(path.join(shotTmp, "catalog"));
const shotVars = [{ id: "title", type: "string", label: "标题", default: "", maxChars: 14 }, { id: "cues", type: "string", label: "节拍", default: "" }];
fs.writeFileSync(path.join(shotTmp, "compositions/dy-shot-x.html"), `<div data-composition-variables='${JSON.stringify(shotVars)}'></div>`);
const shotNote = { kind: "shot", purpose: "p", suitableFor: "s", minDuration: 3, beats: ["变红", "盖章"], sfx: [{ beat: 2, name: "error", volume: 0.6 }, { at: 0.4, name: "tick" }] };
fs.writeFileSync(path.join(shotTmp, "catalog/notes.json"), JSON.stringify({ "dy-shot-x": shotNote }));
const shotRes = buildCatalog(shotTmp);
ok(shotRes.errors.length === 0, "shot catalog errors: " + shotRes.errors.join("; "));
const shotC = shotRes.catalog.components[0] || {};
ok(shotC.kind === "shot", "shot kind not accepted");
ok(JSON.stringify(shotC.sfx) === JSON.stringify(shotNote.sfx), "sfx not carried into catalog");
ok((shotC.variables || []).find(v => v.id === "title")?.maxChars === 14, "maxChars not carried into catalog");
fs.writeFileSync(path.join(shotTmp, "catalog/notes.json"), JSON.stringify({ "dy-shot-x": { ...shotNote, sfx: [{ beat: 3, name: "error" }, { name: "" , at: 1 }] } }));
const shotBad = buildCatalog(shotTmp).errors;
ok(shotBad.some(e => /bad sfx: dy-shot-x.*beat 3/.test(e)), "sfx beat out of range not reported: " + shotBad.join("; "));
ok(shotBad.some(e => /bad sfx: dy-shot-x.*name/.test(e)), "sfx without name not reported: " + shotBad.join("; "));

// --check:目录过期时退出码非 0,恢复后为 0
const file = path.join(ROOT, "catalog/catalog.json");
const orig = fs.readFileSync(file, "utf8");
fs.writeFileSync(file, orig.replace('"version": 1', '"version": 1, "stale": true'));
const stale = spawnSync("node", ["scripts/build-catalog.mjs", "--check"], { cwd: ROOT, encoding: "utf8" });
fs.writeFileSync(file, orig);
ok(stale.status !== 0, "--check passed on a stale catalog");
const fresh = spawnSync("node", ["scripts/build-catalog.mjs", "--check"], { cwd: ROOT, encoding: "utf8" });
ok(fresh.status === 0, "--check failed on fresh catalog: " + fresh.stdout + fresh.stderr);

if (fails.length) { console.log("FAIL catalog\n  - " + fails.join("\n  - ")); process.exit(1); }
console.log("PASS catalog");
