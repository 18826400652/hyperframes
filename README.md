# 抖音自媒体组件库 (HyperFrames)

竖屏 1080×1920,全部透明背景,可叠加在口播/素材视频上。组件都在 `compositions/`,文案、颜色通过变量覆盖。

| 组件 | 用途 | 主要变量 | 建议时长 |
|---|---|---|---|
| dy-hook-title | 前3秒钩子大标题(关键词高亮) | kicker, line1, before, keyword, accent | 4s |
| dy-subtitle | 逐字高亮字幕(`|` 分句) | lines, secondsPerLine, keyColor | 句数×每句秒数 |
| dy-lower-third | 人设条(姓名/头衔/标签) | name, title, tags, accent | 4s |
| dy-rank-item | 榜单/Top N 卡片 | rank, title, subtitle, accent | 4s |
| dy-stat-counter | 数据大字滚动 | label, value, prefix, suffix, delta | 4.5s |
| dy-comment-bubble | 评论区引用气泡 | nick, text, likes, pinned | 4s |
| dy-action-bar | 右侧点赞/评论/收藏/转发栏 | likes, comments, favs, shares | 5s |
| dy-follow-card | 关注引导卡(点击→已关注) | name, handle, fans, avatarText | 4.5s |
| dy-end-cta | 结尾引导(点赞关注+下期预告) | headline, sub, next | 4s |
| dy-safe-zone | 抖音安全区参考线(仅设计时用) | - | - |

## 使用
在 `index.html` 里挂载,并用 `data-variable-values` 覆盖文案:

    <div id="t1" data-composition-id="dy-hook-title" data-composition-src="compositions/dy-hook-title.html"
         data-start="0" data-duration="4" data-width="1080" data-height="1920"
         data-variable-values='{"keyword":"爆款","line1":"这样拍视频"}'></div>

命令:`npm run dev` 预览 · `npm run check` 检查 · `npm run render` 输出 MP4(`--variables` 可全局覆盖)。

注意:字体使用系统中文字体(苹方/微软雅黑/思源黑体/文泉驿),渲染机器需安装其一;GSAP 已本地化在 `assets/`。
