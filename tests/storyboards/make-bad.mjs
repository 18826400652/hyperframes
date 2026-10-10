// 由 storyboards/example.json 生成错误样例:每个错误码一份,各只改一处。修改示例后运行 node tests/storyboards/make-bad.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ex = JSON.parse(fs.readFileSync(path.join(here, "../../storyboards/example.json"), "utf8"));
const mk = (code, fn) => { const s = structuredClone(ex); fn(s); fs.writeFileSync(path.join(here, `bad-${code}.json`), JSON.stringify(s, null, 2) + "\n"); };

mk("bad_top", s => { delete s.scenes; });
mk("bad_theme", s => { s.theme = "sunset"; });
mk("bad_scene_id", s => { s.scenes[2].id = "s07"; });
mk("unknown_component", s => { s.scenes[2].component = "dy-scene-nope"; });
mk("forbidden_main", s => { s.scenes[3].component = "dy-subtitle"; s.scenes[3].variables = {}; });
mk("unknown_variable", s => { s.scenes[0].variables.headline = "x"; });
mk("bad_variable_type", s => { s.scenes[2].variables.value = "5万"; });
mk("duration_too_short", s => { s.scenes[1].duration = 3; });
mk("duration_too_long", s => { s.scenes[1].duration = 45; });
mk("too_many_overlays", s => { const o = s.scenes[1].overlays[0]; s.scenes[1].overlays = [o, o, o]; });
mk("bad_overlay", s => { s.scenes[1].overlays[0].component = "dy-scene-quote"; });
mk("overlay_out_of_range", s => { s.scenes[1].overlays[0].at = 7; });
mk("bad_transition", s => { s.scenes[2].transitionIn = "dy-tr-spin"; });
mk("first_transition", s => { s.scenes[0].transitionIn = "dy-tr-wipe"; });
mk("bad_need", s => { s.scenes[1].needs[0].variable = "video"; });
mk("missing_script", s => { s.scenes[2].script = ""; });
mk("bad_new_component", s => { s.newComponents = [{ id: "dy-scene-title", status: "draft", purpose: "x" }]; });
mk("pending_missing_file", s => { s.newComponents = [{ id: "dy-timeline", status: "pending", purpose: "时间线" }]; s.scenes[2].component = "dy-timeline"; s.scenes[2].variables = {}; });
mk("default_text", s => { delete s.scenes[2].variables.label; });
mk("script_too_long", s => { s.scenes[3].script += "这里再多说很多很多很多很多很多很多很多很多很多很多的话。"; s.scenes[3].duration = 20; });
mk("number_not_in_script", s => { s.scenes[3].variables.gain = "效率提升 99 倍"; });
mk("script_too_long_recording", s => { s.scenes[1].script += "然后再继续说很多很多很多很多很多很多很多很多很多很多很多很多很多很多很多很多很多的操作说明。"; s.scenes[1].duration = 25; });
console.log("bad samples written");
