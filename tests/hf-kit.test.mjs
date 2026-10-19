// hf-kit.js 的节拍工具:cues 变量(秒,| 分隔)→ 每一拍的时间;退场放到挂载时长的末尾
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ROOT } from "./lib.mjs";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/dykit/hf-kit.js"), "utf8"), { window, getComputedStyle: () => ({ getPropertyValue: () => "" }) });
const HF = window.HF;

eq(HF.cues("", 3, [0.7, 1.9, 3.1]), [0.7, 1.9, 3.1], "没写 cues 用默认节奏");
eq(HF.cues(undefined, 2, [1, 2]), [1, 2], "cues 缺省用默认节奏");
eq(HF.cues("2.5|6|11.2", 3, [0.7, 1.9, 3.1]), [2.5, 6, 11.2], "按 cues 出现");
eq(HF.cues("0.5| |x", 3, [0.7, 1.9, 3.1]), [0.5, 1.9, 3.1], "某一拍空着或写错,这一拍用默认");
eq(HF.cues("4|1", 2, [0, 5]), [4, 4], "后一拍不会早于前一拍");
eq(HF.cues("1|2|3|4", 2, [0, 0]), [1, 2], "多写的拍忽略");
eq(HF.cues("-1", 1, [0.5]), [0.5], "负数无效");

eq(HF.spread(3, 0.7, 12, 1.2), [0.7, 4.47, 8.23], "默认节奏铺开:间隔 = max(最小间隔, (D-首拍)/n),最后一拍也停留同样久");
eq(HF.spread(3, 0.7, 3, 1.2), [0.7, 1.9, 3.1], "段太短时按最小间隔,不压缩");
eq(HF.spread(1, 0.5, 10, 1), [0.5], "只有一拍");

ok(Math.abs(HF.exitAt(12, 0.4) - 11.6) < 1e-9, "退场在段尾前 0.4 秒开始");
ok(HF.exitAt(1, 0.4, 2) === 2, "段比演完还短时,退场不早于 notBefore");

// 镜头用的 helper:平移进出、镜头推拉、贴纸、引线(只往传入的时间线上加 tween,seek 安全)
const calls = [];
const fakeGsap = { set: (el, v) => calls.push(["set", el.id, v]) };
const tl = { to: (el, v, at) => calls.push(["to", el.id, v, at]) };
const w2 = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/dykit/hf-kit.js"), "utf8"), { window: w2, gsap: fakeGsap, getComputedStyle: () => ({ getPropertyValue: () => "" }) });
const K = w2.HF;
const plain = (x) => JSON.parse(JSON.stringify(x));

calls.length = 0;
K.panInOut(tl, { id: "root" }, { enter: "pan-left:0.6", exit: "pan-up:0.6", duration: 5.6 });
eq(plain(calls), [
  ["set", "root", { x: 1080, y: 0, filter: "blur(12px)" }],
  ["to", "root", { x: 0, y: 0, filter: "blur(0px)", duration: 0.6, ease: "power2.inOut" }, 0],
  ["to", "root", { x: 0, y: -1920, filter: "blur(12px)", duration: 0.6, ease: "power2.inOut" }, 5],
], "panInOut:pan-left 从右进;pan-up 在段尾前 0.6 秒往上出");
calls.length = 0;
K.panInOut(tl, { id: "root" }, { duration: 4 });
eq(calls, [], "没有 enter / exit 不动");
calls.length = 0;
K.panInOut(tl, { id: "root" }, { enter: "fade:1", duration: 4 });
eq(calls, [], "不认识的方向不动");

calls.length = 0;
K.camera(tl, { id: "stage" }, [{ t: 0, x: 0, y: 0, scale: 1 }, { t: 2, x: -300, y: -120, scale: 1.8 }, { t: 5, x: 0, y: 0, scale: 1, dur: 0.8 }]);
eq(plain(calls), [
  ["set", "stage", { x: 0, y: 0, scale: 1, transformOrigin: "0 0" }],
  ["to", "stage", { x: -300, y: -120, scale: 1.8, duration: 1, ease: "power2.inOut" }, 2],
  ["to", "stage", { x: 0, y: 0, scale: 1, duration: 0.8, ease: "power2.inOut" }, 5],
], "camera:第一个关键帧是初态,其余按 t 推拉平移,缺省 1 秒");

calls.length = 0;
K.camera(tl, { id: "stage" }, [{ t: 0, x: 0, y: 0, scale: 1 }, { t: 3, x: -10, y: -5, scale: 1.02, dur: 2, ease: "none" }]);
eq(plain(calls)[1], ["to", "stage", { x: -10, y: -5, scale: 1.02, duration: 2, ease: "none" }, 3], "camera:关键帧可以指定缓动(停留时匀速慢推)");

const added = [];
K.sticker({ classList: { add: (c) => added.push(c) } });
eq(added, ["hf-sticker"], "sticker 加贴纸样式类");

calls.length = 0;
const line = { id: "lead", style: {}, getTotalLength: () => 120 };
K.leader(tl, line, 1.5);
eq(plain(calls), [
  ["set", "lead", { strokeDasharray: 120, strokeDashoffset: 120 }],
  ["to", "lead", { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, 1.5],
], "leader:引线从起点画到终点");

if (fails.length) { console.error("FAIL hf-kit.test\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS hf-kit.test");
