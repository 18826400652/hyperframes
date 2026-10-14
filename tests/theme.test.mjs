// 主题文件测试:每套主题声明同一组变量(嵌套时不漏外层装饰);custom 的颜色和字体来自 --hf-custom-*
import fs from "node:fs";
import path from "node:path";
import { ROOT, THEMES } from "./lib.mjs";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const css = fs.readFileSync(path.join(ROOT, "assets/dykit/theme.css"), "utf8");
const block = t => { const m = css.match(new RegExp(`\\[data-theme="${t}"\\] \\{([\\s\\S]*?)\\n\\}`)); return m ? m[1] : null; };
const vars = b => [...new Set(b.match(/--hf-[a-z0-9-]+(?=:)/g))].sort();

const base = vars(block("minimal"));
for (const t of THEMES) {
  const b = block(t);
  ok(b, `theme.css 没有 [data-theme="${t}"]`);
  if (!b) continue;
  const v = vars(b);
  const missing = base.filter(x => !v.includes(x)), extra = v.filter(x => !base.includes(x) && !x.startsWith("--hf-custom-"));
  ok(!missing.length, `${t} 缺少变量:${missing.join(" ")}`);
  ok(!extra.length, `${t} 多出变量:${extra.join(" ")}`);
}

const custom = block("custom") || "";
for (const [hf, src] of [["bg", "bg"], ["text", "text"], ["muted", "muted"], ["accent", "accent"], ["accent-2", "alert"], ["font-title", "font-title"], ["font-body", "font-body"]])
  ok(new RegExp(`--hf-${hf}: var\\(--hf-custom-${src},`).test(custom), `custom 的 --hf-${hf} 没有读 --hf-custom-${src}`);
ok(/--hf-em-bg: [^;]*var\(--hf-custom-highlight,/.test(custom), "custom 的荧光笔底色没有读 --hf-custom-highlight");
ok(/--hf-em-fill: var\(--hf-custom-on-highlight,/.test(custom), "custom 的荧光笔文字色没有读 --hf-custom-on-highlight");
ok(/--hf-on-accent: var\(--hf-custom-on-accent,/.test(custom), "custom 的 --hf-on-accent 没有读 --hf-custom-on-accent");
ok(/--hf-bg-a-opacity: 0;/.test(custom), "custom 应关闭装饰背景层");

if (fails.length) { console.error("FAIL theme.test\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS theme.test");
