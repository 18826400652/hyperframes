// 磨镜头用:把一个用例的某个变体按自己的时长单独渲染成 mp4(custom 主题,浅色配色,带栏目标签)
// 用法: node tests/render-shot.mjs <用例id> <变体> <秒数> <输出.mp4> [--palette 0|1]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { CLI, buildFixture, loadCase } from "./lib.mjs";

const [id, variant, seconds, out, ...rest] = process.argv.slice(2);
if (!id || !variant || !(Number(seconds) > 0) || !out) {
  console.error("用法: node tests/render-shot.mjs <用例id> <变体> <秒数> <输出.mp4> [--palette 0|1]");
  process.exit(2);
}
const c = loadCase(id);
if (!c.variants[variant]) { console.error(`用例 ${id} 没有变体 ${variant}(有:${Object.keys(c.variants).join("、")})`); process.exit(2); }
const pi = rest.indexOf("--palette");
const one = { ...c, id: `${id}-${variant}`, duration: Number(seconds), variants: { [variant]: c.variants[variant] }, palette: pi >= 0 ? Number(rest[pi + 1]) : 0 };
const { dir } = buildFixture(one, "custom");
// FFmpeg 8.0 在 1080 宽时会把最右 8 列转成黑色:用 tests/ffmpeg-accurate 包装(自己设了 HYPERFRAMES_FFMPEG_PATH 就用你的)
const env = { ...process.env, HYPERFRAMES_FFMPEG_PATH: process.env.HYPERFRAMES_FFMPEG_PATH || path.join(path.dirname(new URL(import.meta.url).pathname), "ffmpeg-accurate") };
const r = spawnSync("npx", [...CLI, "render", dir, "-o", path.resolve(out), "--quiet"], { stdio: "inherit", env });
process.exit(r.status ?? 1);
