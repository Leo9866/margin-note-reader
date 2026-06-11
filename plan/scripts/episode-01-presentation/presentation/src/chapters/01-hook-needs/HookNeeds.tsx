import { MaskReveal } from "../../components/MaskReveal";
import type { ChapterStepProps } from "../../registry/types";
import "./HookNeeds.css";

/**
 * Chapter 01 — Hook + Three Needs.
 *
 * Steps:
 *   0: Title card — vertical product hook
 *   1: Need #1 — 看到不懂的术语 (alt: ChatGPT / Claude / Gemini)
 *   2: Need #2 — 划重点、做笔记、收藏 (alt: Notion / Obsidian / Apple Notes)
 *   3: Need #3 — AI 得待在文档旁边 (alt: 弹窗聊天 / 浮动 widget / 侧边 tab)
 *   4: Product thesis — AI 在文档边上
 *   5: QR unlock CTA — 关注公众号 / 回复阅读 / 解锁 AI
 */

const NEEDS = [
  {
    num: "01",
    head: "看到不懂的术语",
    tail: "不想再切到 ChatGPT 复制粘贴。",
    alts: ["ChatGPT", "Claude", "Gemini"],
  },
  {
    num: "02",
    head: "划重点、做笔记、收藏",
    tail: "不想再跳到另一个软件里。",
    alts: ["Notion", "Obsidian", "Apple Notes"],
  },
  {
    num: "03",
    head: "AI 得待在文档旁边",
    tail: "不要打断我读字的节奏。",
    alts: ["弹窗聊天", "复制粘贴", "另开标签"],
  },
];

export default function HookNeedsChapter({ step }: ChapterStepProps) {
  /* ─── Step 0: Title card ─── */
  if (step === 0) {
    return (
      <div className="hn-scene scene-pad">
        <header className="masthead">
          <span className="brand">Margin Note Reader</span>
          <span className="issue">Episode · 01 — Vibe Coding 复盘</span>
        </header>
        <hr className="rule rule-grow in" style={{ marginTop: "var(--space-5)" }} />

        <div className="hn-cover">
          <div className="kicker hn-fade" style={{ animationDelay: "100ms" }}>
            9:16 · Vibe Coding 复盘
          </div>
          <h1 className="hn-cover-title">
            <span className="hn-line">
              <MaskReveal show duration={1100}>
                <span className="serif-cn">我做了一个</span>
              </MaskReveal>
            </span>
            <span className="hn-line">
              <MaskReveal show delay={520} duration={1100}>
                <span className="serif-cn hn-accent">AI 阅读工具</span>
              </MaskReveal>
            </span>
          </h1>
          <div className="hn-cover-sub">
            <MaskReveal show delay={1500} duration={1100}>
              <span className="serif-cn">专门解决长文档阅读的</span>
            </MaskReveal>
            <MaskReveal show delay={1900} duration={1100}>
              <span className="serif-cn hn-accent">老毛病</span>
            </MaskReveal>
            <MaskReveal show delay={2300} duration={1100}>
              <span className="serif-cn">。</span>
            </MaskReveal>
          </div>
          <div className="hn-cover-visual hn-fade" style={{ animationDelay: "3000ms" }}>
            <div className="hn-doc-phone">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="hn-margin-ai">
              <span>AI Margin</span>
              <b>解释选区</b>
              <b>总结章节</b>
            </div>
          </div>
        </div>

        <div className="hn-cover-foot label-mono hn-fade" style={{ animationDelay: "3600ms" }}>
          <span className="dot-accent" />
          <span className="hn-foot-text">Margin Note Reader · vertical cut</span>
        </div>
      </div>
    );
  }

  /* ─── Step 1, 2, 3: One need each ─── */
  if (step === 1 || step === 2 || step === 3) {
    const idx = step - 1;
    const need = NEEDS[idx];
    return (
      <div className="hn-scene scene-pad" key={`need-${idx}`}>
        <header className="masthead">
          <span className="brand">Margin Note Reader</span>
          <span className="issue">一共三件事</span>
        </header>
        <hr className="rule" style={{ marginTop: "var(--space-5)" }} />

        <div className="hn-need">
          <div className="hn-need-num hero-num">
            <MaskReveal show duration={900}>
              <span>{need.num}</span>
            </MaskReveal>
          </div>

          <div className="hn-need-body">
            <div className="kicker hn-fade" style={{ animationDelay: "100ms" }}>
              需求 #{need.num}
            </div>
            <h2 className="hn-need-title">
              <span className="hn-line">
                <MaskReveal show delay={350} duration={1100}>
                  <span className="serif-cn">{need.head}，</span>
                </MaskReveal>
              </span>
              <span className="hn-line">
                <MaskReveal show delay={900} duration={1100}>
                  <span className="serif-cn hn-accent">{need.tail}</span>
                </MaskReveal>
              </span>
            </h2>

            <div className="hn-need-alts">
              <span className="label-mono hn-alts-label">不再使用</span>
              {need.alts.map((alt, i) => (
                <span
                  key={alt}
                  className="hn-alt-chip"
                  style={{ animationDelay: `${1700 + i * 180}ms` }}
                >
                  <span className="hn-alt-text">{alt}</span>
                  <span className="hn-alt-strike" />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="hn-progress">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={
                "hn-dot " +
                (i < idx ? "is-past" : i === idx ? "is-current" : "is-future")
              }
            />
          ))}
        </div>
      </div>
    );
  }

  /* ─── Step 4: Product thesis ─── */
  if (step === 4) {
    return (
      <div className="hn-scene scene-pad">
        <header className="masthead">
          <span className="brand">Margin Note Reader</span>
          <span className="issue">核心判断</span>
        </header>
        <hr className="rule" style={{ marginTop: "var(--space-5)" }} />

        <div className="hn-thesis">
          <div className="hn-thesis-copy">
            <div className="kicker hn-fade" style={{ animationDelay: "120ms" }}>
              不是另一个聊天框
            </div>
            <h2>
              <span className="hn-line">
                <MaskReveal show delay={320} duration={1100}>
                  <span className="serif-cn">AI 必须在</span>
                </MaskReveal>
              </span>
              <span className="hn-line">
                <MaskReveal show delay={900} duration={1100}>
                  <span className="serif-cn hn-accent">文档边上</span>
                </MaskReveal>
              </span>
            </h2>
            <p className="hn-fade" style={{ animationDelay: "1900ms" }}>
              问题不是 AI 不够强，是阅读工作流被打断了。
            </p>
          </div>

          <div className="hn-thesis-board">
            <div className="hn-doc-sheet">
              <span className="wide" />
              <span />
              <span />
              <span className="short" />
              <span />
              <span className="wide" />
            </div>
            <div className="hn-chat-popover">
              <b>弹窗聊天</b>
              <span>遮住正文</span>
            </div>
            <div className="hn-side-ai">
              <b>AI 边栏</b>
              <span>跟着选区走</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Step 5: QR unlock CTA ─── */
  return (
    <div className="hn-scene scene-pad">
      <header className="masthead">
        <span className="brand">Margin Note Reader</span>
        <span className="issue">线上解锁</span>
      </header>
      <hr className="rule" style={{ marginTop: "var(--space-5)" }} />

      <div className="hn-unlock">
        <div className="hn-unlock-copy">
          <div className="kicker hn-fade" style={{ animationDelay: "120ms" }}>
            公开访问时，AI 先锁住
          </div>
          <h2>
            <span className="hn-line">
              <MaskReveal show delay={320} duration={1100}>
                <span className="serif-cn">关注公众号</span>
              </MaskReveal>
            </span>
            <span className="hn-line">
              <MaskReveal show delay={920} duration={1100}>
                <span className="serif-cn hn-accent">回复「阅读」</span>
              </MaskReveal>
            </span>
            <span className="hn-line">
              <MaskReveal show delay={1500} duration={1100}>
                <span className="serif-cn">解锁 AI 边栏。</span>
              </MaskReveal>
            </span>
          </h2>
        </div>

        <div className="hn-unlock-card hn-fade" style={{ animationDelay: "2100ms" }}>
          <div className="hn-qr">
            <span />
            <span />
            <span />
            <i />
          </div>
          <div className="hn-unlock-steps">
            <b>扫码关注</b>
            <b>后台回复「阅读」</b>
            <b>输入数字口令</b>
            <strong>AI 已解锁</strong>
          </div>
        </div>

        <div className="hn-unlock-note label-mono hn-fade" style={{ animationDelay: "3200ms" }}>
          reader.youbeat.cn · Margin Note Reader
        </div>
      </div>
    </div>
  );
}
