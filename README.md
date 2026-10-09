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
| dy-chapter-title | 章节标题("01 先说结论") | index, title, sub, accent | 3.5s |
| dy-countdown | 3-2-1 倒计时 + 结束文案 | from, label, accent | from+1s |
| dy-vs-compare | PK 对比表(胜方高亮) | leftName, rightName, rows(`项|左|右|L/R;`分行), leftColor, accent | 6s |
| dy-checklist | 要点清单逐条打勾 | title, items(`|`分隔), accent | 0.7+条数×1.2+1.2s |
| dy-product-card | 带货商品卡(价格滚动/优惠/库存条/小黄车引导) | tag, name, price, origin, coupon, stock, stockPct, hint | 5s |
| dy-progress-bar | 顶部章节进度条(覆盖全片) | labels(`|`分隔), duration(须等于挂载时长), accent | 全片 |
| dy-sticker-pop | 花字贴纸弹出 | text, emoji, color, rotate, x, y(百分比) | 2.5s |
| dy-poll | A/B 投票,引导评论区扣字 | question, optionA, optionB, pctA, cta | 6s |
| dy-chat-demo | AI 对话演示(提问打字→思考→回答打字) | prompt, reply, aiName, hold | 约 3+字数×0.05s |
| dy-prompt-card | 提示词模板卡(角色/任务/要求逐条出现) | title, fields(`名|内容;`), cta | 约 3+条数×0.8s |
| dy-bench-bars | AI 模型评测横向条形图(领先者高亮) | title, rows(`名|分;`), max, unit, note | 约 5s |
| dy-tool-card | AI 工具推荐卡 | name, logo, tagline, tags, rating, price, url | 5s |
| dy-code-block | 终端/代码块打字机 | file, code(`|`分行), speed | 约 3+字符数/speed s |
| dy-workflow-flow | AI 工作流纵向流程(AI 步骤高亮) | title, steps, aiSteps | 约 3+步数×0.7s |
| dy-concept-card | 名词解释卡(术语/人话/比方) | term, en, plain, analogy | 6s |
| dy-news-flash | AI 快讯卡 | tag, date, company, headline, points, source | 约 4+要点数×0.7s |
| dy-before-after | 效率对比(以前 vs 用 AI) | beforeValue, afterValue, gain | 5.5s |
| dy-ai-badge | "内容由 AI 辅助生成"角标(平台要求标注时用) | text | 全片 |
| dy-safe-zone | 抖音安全区参考线(仅设计时用) | - | - |

## 使用
在 `index.html` 里挂载,并用 `data-variable-values` 覆盖文案:

    <div id="t1" data-composition-id="dy-hook-title" data-composition-src="compositions/dy-hook-title.html"
         data-start="0" data-duration="4" data-width="1080" data-height="1920"
         data-variable-values='{"keyword":"爆款","line1":"这样拍视频"}'></div>

命令:`npm run dev` 预览 · `npm run check` 检查 · `npm run render` 输出 MP4(`--variables` 可全局覆盖)。

注意:字体使用系统中文字体(苹方/微软雅黑/思源黑体/文泉驿),渲染机器需安装其一;GSAP 已本地化在 `assets/`。
