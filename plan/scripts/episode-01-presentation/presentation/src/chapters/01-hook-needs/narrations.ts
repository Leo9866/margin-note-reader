import type { Narration } from "../../registry/types";

/**
 * Chapter 01 — Hook + Three Needs
 *
 * Length === 6, matching the steps in HookNeeds.tsx (step 0..5).
 * Text is sourced from script.md, segmented by `---` boundaries.
 */
export const narrations: Narration[] = [
  // step 0 — title card
  "最近我用 vibe coding 做了一个 AI 阅读工具，专门解决自己读长文档时遇到的几个老毛病。",
  // step 1 — need #1
  "一共三件事。第一，看到不懂的术语，不想再切到 ChatGPT 复制粘贴。",
  // step 2 — need #2
  "第二，划重点、做笔记、收藏，不想再跳到另一个软件里。",
  // step 3 — need #3
  "第三，AI 得待在文档旁边，不要打断我读字的节奏。",
  // step 4 — product thesis
  "中间有一个判断是我自己拍板的，AI 一定要做成边栏，不能做成弹窗聊天。问题不是 AI 不够强，是工作流被打断了。",
  // step 5 — QR unlock CTA
  "线上公开访问时，AI 能力默认锁住。关注公众号，后台回复阅读，输入返回的数字，就能解锁 AI 边栏。",
];
