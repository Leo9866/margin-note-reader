# Video Outline

> **主题**：(待定，Checkpoint Plan 选定)
> **总时长**：约 2 分 10 秒（口播 ~520 单位，中文 + 英文术语合计）
> **章节数**：4 章 / 18 步

---

## 1. hook-needs — 钩子 + 三条需求清单（5 steps · ~37s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 产品名：Margin Note Reader —— 来源 README.md L1
- 核心原则："最有价值的 AI 阅读界面不是独立聊天框，而是一个理解当前段落、章节和读者笔记的 margin" —— 来源 plan/project-background.md L29
- 三条需求映射的产品功能：text-selection AI / highlight + bookmark + note / sidebar AI margin —— 来源 plan/project-background.md L82-100
- 撕裂对比意象：左屏文档 + 中屏 ChatGPT 复制粘贴 + 右屏 Notion/Obsidian 做笔记 —— 设计画面 hint
- 视觉锚词：vibe coding（黄/绿高亮可挂角标）/「老毛病」（手写感强调）/「同时做好」（红色否定底纹）

**开发计划**：

- step 1 (~10s) — Title card：大字"我用 vibe coding 做了一个新产品" + 副标"专门解决长文档阅读的老毛病"
- step 2 (~7s) — "一共三件事 ——" 标语浮出，数字 ① 揭示 + 第一条："看到不懂的术语，不想再切到 ChatGPT 复制粘贴"
- step 3 (~6s) — 数字 ② 揭示 + 第二条："划重点、做笔记、收藏，不想再跳到另一个软件里"
- step 4 (~6s) — 数字 ③ 揭示 + 第三条："AI 得待在文档旁边，不要打断我读字的节奏"
- step 5 (~8s) — 三条清单全部就位 + 下方浮出"市面上没一个工具能同时做好"否定底纹 → 收束到"所以我自己做了一个"大字定格

口播节选：
> "最近我用 vibe coding 做了一个新产品 …… 一共三件事 …… 所以我自己动手做了一个。"

---

## 2. background — 16,570 行的真实文档（3 steps · ~19s）

**信息池**：
- 文档名：AI Agent 技术文档（Hermes Agent docs）—— 来源 public/docs/
- 11 个文件清单：BRIEF.md / 00_ARCHITECTURE_OVERVIEW.md / PHASE_1 ~ PHASE_8 / REPORT_EXECUTIVE.md —— 来源 ls public/docs/
- 16,570 行 Markdown —— 来源 `wc -l public/docs/*.md`
- 1MB 纯文本（实测 1,053,036 bytes）—— 来源文件 size 汇总
- 单文件最长：PHASE_4_MEMORY_LEARNING.md 2,356 行 / 150KB —— 来源同上
- 文件 size 分布（可做柱图）：PHASE_1 121KB / PHASE_2 107KB / PHASE_3 134KB / PHASE_4 150KB / PHASE_5 141KB —— 来源 ls -l
- 视觉锚点：长滚动条暗示长度 / 11 个文件名 stack / "16,570" 占满整屏的 hero 数字

**开发计划**：

- step 1 (~7s) — 屏幕铺开"AI Agent 技术文档"标题 + 11 个文件名以堆叠列表形式列出（mono 字体）
- step 2 (~7s) — Hero 数字大字 "16,570" 占据 60% 屏幕 + 三个副标 chip："11 个文件 / Markdown / ~1MB" + 长滚动条暗示
- step 3 (~5s) — 数字淡出 + 一句话淡入"那天晚上，我开始动手" + 暗场收尾，准备切下一章

口播节选：
> "说说这个念头是怎么来的 …… 11 个文件，16,570 行 Markdown，差不多 1MB 纯文本 …… 那天晚上，我开始动手。"

---

## 3. vibe-coding — AI 全程参与的三层套娃（5 steps · ~38s）

**信息池**：
- 工作流三步：需求合规判断 → AI 扮演 PM 拆功能 → 照计划 vibe coding 写代码 —— 来源对话上下文 + plan/iteration-plan.md
- AI 角色三次切换：Consultant → PM → Coder —— 设计概念
- 技术栈：Vite + React + TypeScript —— 来源 package.json
- 代码量：App.tsx 1688 行 + styles.css 1252 行 + vite.config.ts 270 行 = 3210 行 —— 来源 `wc -l src/* vite.config.ts`
- 后端架构：Vite middleware 代理 OpenAI Responses API（密钥不暴露前端）—— 来源 README L80-87
- 数据存储：localStorage 本地优先 —— 来源 README L89-99
- 计划文档：plan/project-background.md + plan/iteration-plan.md（AI 当 PM 时产出的）—— 实物
- 视觉锚点：三层嵌套同心圆 / 矩形（外层 AI 想 / 中层 AI 写 / 内层产品里 AI 是主角）/ "三层套娃" 四字撑大定格

**开发计划**：

- step 1 (~7s) — 标语"我没自己埋头写，全程和 AI 一起" + 三个空圆点占位，等填充
- step 2 (~6s) — 第一层揭示：圆点①点亮 + 标签"AI as Consultant" + 副标"和 AI 聊需求，让它判断合规和可行"
- step 3 (~7s) — 第二层揭示：圆点②点亮 + 标签"AI as PM" + 副标"扮演产品经理，拆功能 / 列优先级 / 出迭代计划"
- step 4 (~6s) — 第三层揭示：圆点③点亮 + 标签"AI as Coder" + 副标"照计划 vibe coding，写每一行代码"
- step 5 (~12s) — 三个圆点收束成同心三环 + "三层套娃" 四字定格大字 + 副标 "AI 想 / AI 写 / AI 还是主角"

口播节选：
> "我没自己埋头硬写 …… 三步 …… AI 帮我想，AI 帮我写，做出来的产品里 AI 还是核心功能。三层套娃。"

---

## 4. thesis-close — 边栏 vs 弹窗 + 收尾金句（5 steps · ~33s）

**信息池**：
- 核心判断："AI 必须做成边栏，不能做成弹窗聊天" —— 来源对话 + plan/project-background.md L24-30
- 反 chatbot 论原文："The most valuable AI reading interface is not a separate chatbot. It is a margin that understands the current passage, surrounding section, and the reader's own notes." —— 来源 plan/project-background.md L29
- 关键判断："问题不是 AI 不够强，是工作流被打断" —— 来源对话提炼
- 数据点：1 天 / 3000+ 行代码 / MIT License / 已开源 GitHub —— 来源 git log + LICENSE
- 仓库：margin-note-reader —— 来源 README.md
- 视觉对比意象：左 = 文档主体 + 中央弹出聊天框遮挡正文；右 = 文档主体 + 右侧 margin 浮出 AI（margin 中可填高亮 / 笔记 / 问答）
- 视觉锚词：金句 "在文档边上" 衬线大字撑满整屏 / GitHub icon 做 CTA

**开发计划**：

- step 1 (~8s) — 左右对比布局：左 "弹窗聊天" 示意（聊天框压住正文，否定意象）/ 右 "边栏 AI" 示意（margin 浮在文档右侧，肯定意象）+ 大字提问"哪个更顺？"
- step 2 (~6s) — 对比图淡出，一句话答案大字 "问题不是 AI 不够强 —— 是工作流被打断了"
- step 3 (~6s) — 数据卡片：三张 chip "1 天 / 3000+ 行代码 / 已开源" + GitHub icon + "MIT License" 小字
- step 4 (~8s) — 金句压满全屏 "最有价值的 AI 阅读界面，不在另一个标签页里，在文档边上" —— 衬线大字 + 慢节奏定格 + 视觉重音落在"在文档边上"
- step 5 (~5s) — CTA 屏 "如果你也在啃长文档，欢迎来用" + 仓库名"Margin Note Reader" + GitHub URL 占位（用户提供）/ 二维码 placeholder

口播节选：
> "AI 一定要做成边栏 …… 问题不是 AI 不够强，是工作流被打断 …… 一天时间，3000 多行代码，开源 …… 最有价值的 AI 阅读界面，不在另一个标签页里，在文档边上。"

---

## 素材清单

### 1. hook-needs
- ⚠️ 数字 ① ② ③ 的字体/装饰处理（用主题字体 token 即可，无外部素材）
- ✓ 三条需求文字（口播稿自带）
- ⚠️ "市面上没一个工具能同时做好"的否定底纹（CSS 即可）

### 2. background
- ✓ 11 个文件名清单（已知数据，agent 可硬编码）
- ⚠️ "16,570" hero 数字的视觉处理（用主题 hero token，无外部素材）
- ⚠️ 滚动条长度暗示效果（纯 CSS）

### 3. vibe-coding
- ⚠️ 三层套娃的几何图示（同心圆/同心矩形，纯 CSS / SVG 实现）
- ⚠️ "三层套娃" 四字 hero 定格（主题字体）

### 4. thesis-close
- ⚠️ 边栏 vs 弹窗对比图（纯 CSS box / 占位条即可，无需真截图）
- ⚠️ GitHub URL（用户提供，目前用 placeholder）
- ⚠️ 二维码（可选，发布前生成）
- ⚠️ 金句"在文档边上"的衬线大字处理（用主题字体 token）

> **整片无需外部图片素材** —— 全部可用 CSS / SVG / 主题 token 渲染。这让录屏时整套 dev server 自带视觉，无需后期合图。
