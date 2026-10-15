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

if (fails.length) { console.error("FAIL hf-kit.test\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS hf-kit.test");
