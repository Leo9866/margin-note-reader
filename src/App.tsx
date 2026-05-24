import {
  Article,
  BookmarkSimple,
  Brain,
  CaretRight,
  Export,
  HighlighterCircle,
  MagnifyingGlass,
  Moon,
  NotePencil,
  Plus,
  SidebarSimple,
  Sparkle,
  Sun,
  TextAa,
  Trash,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "margin-note-reader.hermes.v1";
const LAYOUT_VERSION = 4;
const DEFAULT_FONT_SIZE = 20;
const DEFAULT_MEASURE = 108;
const MIN_READER_FONT_SIZE = 19;
const DEFAULT_STUDY_WIDTH = 430;
const MIN_STUDY_WIDTH = 340;
const MAX_STUDY_WIDTH = 680;

const DOCS: ReaderDoc[] = [
  { file: "00_ARCHITECTURE_OVERVIEW.md", title: "架构总览", group: "概览" },
  { file: "PHASE_1_AGENT_CORE.md", title: "阶段一：Agent Core 主循环", group: "八层 Phase 深入" },
  { file: "PHASE_2_PROVIDER_TRANSPORT.md", title: "阶段二：Provider / Transport", group: "八层 Phase 深入" },
  { file: "PHASE_3_CONTEXT_STATE.md", title: "阶段三：Context & State ★", group: "八层 Phase 深入" },
  { file: "PHASE_4_MEMORY_LEARNING.md", title: "阶段四：Memory & Learning ★★★", group: "八层 Phase 深入" },
  { file: "PHASE_5_CAPABILITY.md", title: "阶段五：Capability 工具系统", group: "八层 Phase 深入" },
  { file: "PHASE_6_EXECUTION_ENV.md", title: "阶段六：Execution Environment", group: "八层 Phase 深入" },
  { file: "PHASE_7_INTERFACE.md", title: "阶段七：Interface 接入层", group: "八层 Phase 深入" },
  { file: "PHASE_8_CROSS_CUTTING.md", title: "阶段八：Cross-cutting 横切能力", group: "八层 Phase 深入" },
  { file: "BRIEF.md", title: "5 分钟极速版", group: "汇报材料" },
  { file: "REPORT_EXECUTIVE.md", title: "汇报成稿 30 分钟版", group: "汇报材料" },
];

type BlockType = "heading" | "paragraph" | "list" | "quote" | "code" | "table" | "rule";
type AnnotationKind = "highlight" | "note" | "bookmark" | "ai" | "term";
type AiMode = "explain" | "summarize" | "question" | "term";
type Theme = "light" | "dark";

interface ReaderDoc {
  file: string;
  title: string;
  group: string;
}

interface DocBlock {
  id: string;
  type: BlockType;
  markdown: string;
  text: string;
  headingPath: string[];
  level?: number;
  items?: string[];
  ordered?: boolean;
  lang?: string;
  rows?: string[][];
  header?: string[];
}

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface Annotation {
  id: string;
  docFile: string;
  blockId: string;
  kind: AnnotationKind;
  selectedText: string;
  note: string;
  createdAt: string;
}

interface SelectionState {
  blockId: string;
  text: string;
}

interface AiThread {
  id: string;
  docFile: string;
  mode: AiMode;
  prompt: string;
  answer: string;
  blockId: string | null;
  selectedText: string;
  createdAt: string;
  status?: "streaming" | "done" | "error";
}

interface PersistedState {
  layoutVersion: number;
  currentDocFile: string;
  annotations: Annotation[];
  aiThreads: AiThread[];
  theme: Theme;
  fontSize: number;
  measure: number;
  studyWidth: number;
}

export default function App() {
  const articleRef = useRef<HTMLElement | null>(null);
  const [currentDocFile, setCurrentDocFile] = useState(DOCS[0].file);
  const [markdownByFile, setMarkdownByFile] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [aiThreads, setAiThreads] = useState<AiThread[]>([]);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [query, setQuery] = useState("");
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [measure, setMeasure] = useState(DEFAULT_MEASURE);
  const [theme, setTheme] = useState<Theme>("light");
  const [studyWidth, setStudyWidth] = useState(DEFAULT_STUDY_WIDTH);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [progress, setProgress] = useState(0);

  const currentDoc = DOCS.find((doc) => doc.file === currentDocFile) ?? DOCS[0];
  const markdown = markdownByFile[currentDocFile] ?? "";
  const parsed = useMemo(() => parseMarkdown(markdown), [markdown]);
  const currentAnnotations = annotations.filter((item) => item.docFile === currentDocFile);
  const currentThreads = aiThreads.filter((item) => item.docFile === currentDocFile);
  const activeBlock =
    (selection ? parsed.blocks.find((block) => block.id === selection.blockId) : null) ??
    parsed.blocks.find((block) => block.id === activeBlockId) ??
    null;
  const activeSection = useMemo(
    () => getSectionMarkdown(parsed.blocks, activeBlock?.id),
    [activeBlock?.id, parsed.blocks],
  );
  const searchTerms = useMemo(
    () => query.trim().split(/\s+/).filter(Boolean).slice(0, 5),
    [query],
  );
  const matchingBlocks = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return 0;
    return parsed.blocks.filter((block) => block.text.toLowerCase().includes(value)).length;
  }, [parsed.blocks, query]);
  const selectedAnnotations = selection
    ? currentAnnotations.filter((item) => item.blockId === selection.blockId)
    : [];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<PersistedState>;
      if (stored.currentDocFile && DOCS.some((doc) => doc.file === stored.currentDocFile)) {
        setCurrentDocFile(stored.currentDocFile);
      }
      if (Array.isArray(stored.annotations)) setAnnotations(stored.annotations);
      if (Array.isArray(stored.aiThreads)) setAiThreads(stored.aiThreads);
      const hasCurrentLayout = stored.layoutVersion === LAYOUT_VERSION;
      if ((stored.theme === "dark" || stored.theme === "light") && hasCurrentLayout) {
        setTheme(stored.theme);
      }
      if (typeof stored.fontSize === "number" && hasCurrentLayout) {
        setFontSize(Math.max(MIN_READER_FONT_SIZE, stored.fontSize));
      }
      if (typeof stored.measure === "number" && hasCurrentLayout) {
        setMeasure(Math.max(DEFAULT_MEASURE, stored.measure));
      }
      if (typeof stored.studyWidth === "number" && hasCurrentLayout) {
        setStudyWidth(clamp(stored.studyWidth, MIN_STUDY_WIDTH, MAX_STUDY_WIDTH));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const hashDoc = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (hashDoc && DOCS.some((doc) => doc.file === hashDoc)) {
      setCurrentDocFile(hashDoc);
    }
  }, []);

  useEffect(() => {
    const data: PersistedState = {
      layoutVersion: LAYOUT_VERSION,
      currentDocFile,
      annotations,
      aiThreads,
      theme,
      fontSize,
      measure,
      studyWidth,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [aiThreads, annotations, currentDocFile, fontSize, measure, studyWidth, theme]);

  useEffect(() => {
    if (markdownByFile[currentDocFile]) return;
    let cancelled = false;
    setLoadError("");
    fetch(`/docs/${currentDocFile}`)
      .then((response) => {
        if (!response.ok) throw new Error(`无法读取文档：${currentDocFile}`);
        return response.text();
      })
      .then((value) => {
        if (!cancelled) {
          setMarkdownByFile((current) => ({ ...current, [currentDocFile]: value }));
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDocFile, markdownByFile]);

  useEffect(() => {
    window.history.replaceState(null, "", `#${currentDocFile}`);
    setSelection(null);
    setActiveBlockId(null);
    setProgress(0);
    articleRef.current?.scrollTo({ top: 0 });
  }, [currentDocFile]);

  const captureSelection = useCallback(() => {
    const selected = window.getSelection();
    const text = selected?.toString().trim() ?? "";
    if (!selected || text.length === 0) return;
    const anchorNode = selected.anchorNode;
    const anchorElement =
      anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement ?? null;
    const blockElement = anchorElement?.closest<HTMLElement>("[data-block-id]");
    const blockId = blockElement?.dataset.blockId;
    if (!blockId) return;
    setSelection({ blockId, text: text.slice(0, 5000) });
    setActiveBlockId(blockId);
  }, []);

  const addAnnotation = useCallback(
    (kind: AnnotationKind, note = "") => {
      if (!selection) return;
      setAnnotations((current) => [
        {
          id: crypto.randomUUID(),
          docFile: currentDocFile,
          blockId: selection.blockId,
          kind,
          selectedText: selection.text,
          note,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setNoteDraft("");
    },
    [currentDocFile, selection],
  );

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((current) => current.filter((item) => item.id !== id));
  }, []);

  const jumpToBlock = useCallback((blockId: string, selectedText?: string) => {
    const element = document.getElementById(blockId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveBlockId(blockId);
    if (selectedText) setSelection({ blockId, text: selectedText });
  }, []);

  const runAi = useCallback(
    async (mode: AiMode) => {
      if (!selection && mode !== "summarize") return;
      const prompt =
        mode === "question"
          ? questionDraft.trim()
          : mode === "term"
            ? "生成概念卡"
            : mode === "explain"
              ? "解释选区"
              : "总结章节";
      if (mode === "question" && !prompt) return;
      setAiBusy(true);
      setAiError("");
      const threadId = crypto.randomUUID();
      setAiThreads((current) => [
        {
          id: threadId,
          docFile: currentDocFile,
          mode,
          prompt,
          answer: "",
          blockId: selection?.blockId ?? activeBlock?.id ?? null,
          selectedText: selection?.text ?? "",
          createdAt: new Date().toISOString(),
          status: "streaming",
        },
        ...current,
      ]);
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            prompt,
            docTitle: currentDoc.title,
            sectionTitle: activeBlock?.headingPath.at(-1) ?? parsed.title,
            selectedText: selection?.text ?? "",
            sectionMarkdown: activeSection,
            notes: selectedAnnotations.map((item) => item.note || item.selectedText),
          }),
        });
        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `AI 请求失败：HTTP ${response.status}`);
        }
        await readAiStream(response, {
          onDelta: (text) => {
            setAiThreads((current) =>
              current.map((thread) =>
                thread.id === threadId
                  ? { ...thread, answer: `${thread.answer}${text}` }
                  : thread,
              ),
            );
          },
          onError: (message) => {
            throw new Error(message);
          },
        });
        setAiThreads((current) =>
          current.map((thread) =>
            thread.id === threadId ? { ...thread, status: "done" } : thread,
          ),
        );
        setQuestionDraft("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 请求失败。";
        setAiError(message);
        setAiThreads((current) =>
          current.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  answer: thread.answer || `### 请求失败\n- ${message}`,
                  status: "error",
                }
              : thread,
          ),
        );
      } finally {
        setAiBusy(false);
      }
    },
    [
      activeBlock,
      activeSection,
      currentDoc.title,
      currentDocFile,
      parsed.title,
      questionDraft,
      selectedAnnotations,
      selection,
    ],
  );

  const saveAiAsNote = useCallback((thread: AiThread) => {
    if (!thread.blockId) return;
    setAnnotations((current) => [
      {
        id: crypto.randomUUID(),
        docFile: thread.docFile,
        blockId: thread.blockId!,
        kind: thread.mode === "term" ? "term" : "ai",
        selectedText: thread.selectedText || thread.prompt,
        note: thread.answer,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }, []);

  const exportNotes = useCallback(() => {
    const lines = [
      `# ${currentDoc.title} 阅读笔记`,
      "",
      ...currentAnnotations.map((item) => {
        const block = parsed.blocks.find((candidate) => candidate.id === item.blockId);
        return [
          `## ${annotationLabel(item.kind)} - ${block?.headingPath.join(" / ") || parsed.title}`,
          "",
          `> ${item.selectedText.replace(/\n/g, " ")}`,
          "",
          item.note || "_未填写笔记。_",
          "",
        ].join("\n");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${slugify(currentDoc.title)}-阅读笔记.md`;
    a.click();
    URL.revokeObjectURL(href);
  }, [currentAnnotations, currentDoc.title, parsed.blocks, parsed.title]);

  const onReaderScroll = useCallback(() => {
    const element = articleRef.current;
    if (!element) return;
    const max = element.scrollHeight - element.clientHeight;
    setProgress(max <= 0 ? 100 : Math.round((element.scrollTop / max) * 100));

    const readerTop = element.getBoundingClientRect().top;
    let candidate: string | null = null;
    for (const block of Array.from(element.querySelectorAll<HTMLElement>("[data-block-id]"))) {
      const top = block.getBoundingClientRect().top - readerTop;
      if (top <= 150) candidate = block.dataset.blockId ?? candidate;
      else break;
    }
    if (candidate) setActiveBlockId(candidate);
  }, []);

  const docsByGroup = useMemo(() => {
    return DOCS.reduce<Record<string, ReaderDoc[]>>((groups, doc) => {
      groups[doc.group] = [...(groups[doc.group] ?? []), doc];
      return groups;
    }, {});
  }, []);

  const startResizeStudyRail = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = studyWidth;
    document.body.classList.add("is-resizing-rail");

    const onMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setStudyWidth(clamp(nextWidth, MIN_STUDY_WIDTH, MAX_STUDY_WIDTH));
    };
    const onUp = () => {
      document.body.classList.remove("is-resizing-rail");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }, [studyWidth]);

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <button className="topbar-icon" type="button" aria-label="菜单">
          ≡
        </button>
        <div className="brand">
          <span className="brand-script">Hermes</span>
          <span className="brand-separator">/</span>
          <strong>阅读工作台</strong>
        </div>
        <div className="topbar-current">{currentDoc.title}</div>
        <div className="topbar-actions">
          <label className="topbar-search">
            <MagnifyingGlass size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索当前文档"
            />
          </label>
          <div className="font-controls" title="字号">
            <button type="button" onClick={() => setFontSize((value) => Math.max(MIN_READER_FONT_SIZE, value - 1))}>
              A−
            </button>
            <button type="button" onClick={() => setFontSize(DEFAULT_FONT_SIZE)}>
              A
            </button>
            <button type="button" onClick={() => setFontSize((value) => Math.min(24, value + 1))}>
              A+
            </button>
          </div>
          <button
            aria-label="切换主题"
            className="topbar-icon"
            type="button"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button className="topbar-icon" type="button" aria-label="导出笔记" onClick={exportNotes}>
            <Export size={16} />
          </button>
        </div>
      </header>

      <main className="workspace" style={{ "--study-width": `${studyWidth}px` } as React.CSSProperties}>
        <aside className="doc-rail">
          <nav aria-label="Hermes 文档">
            {Object.entries(docsByGroup).map(([group, docs]) => (
              <section key={group} className="nav-group">
                <h2>{group}</h2>
                {docs.map((doc) => (
                  <button
                    key={doc.file}
                    className={doc.file === currentDocFile ? "doc-link active" : "doc-link"}
                    type="button"
                    onClick={() => setCurrentDocFile(doc.file)}
                  >
                    {doc.title}
                  </button>
                ))}
              </section>
            ))}
          </nav>
          <div className="rail-note">
            <strong>基于 v0.13.0 文档快照</strong>
            <span>笔记、概念卡和 AI 答案都保存在浏览器本地。</span>
          </div>
        </aside>

        <section className="reader-shell">
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <article
            ref={articleRef}
            className="reader"
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
            onScroll={onReaderScroll}
          >
            <div className="reader-inner" style={{ maxWidth: `${measure}ch`, fontSize }}>
              {loadError ? (
                <div className="reader-error">{loadError}</div>
              ) : markdown ? (
                <>
                  <div className="doc-meta">
                    <span>约 {Math.max(1, Math.round(markdown.length / 800))} 分钟</span>
                    <span>{DOCS.findIndex((doc) => doc.file === currentDocFile) + 1} / {DOCS.length}</span>
                    <span>{parsed.blocks.length} 个阅读块</span>
                    {query.trim() ? <span>{matchingBlocks} 个匹配块</span> : null}
                  </div>
                  {parsed.blocks.map((block) => (
                    <MarkdownBlock
                      key={block.id}
                      block={block}
                      annotations={currentAnnotations.filter((item) => item.blockId === block.id)}
                      searchTerms={searchTerms}
                      selected={selection?.blockId === block.id}
                    />
                  ))}
                </>
              ) : (
                <div className="reader-loading">正在载入文档...</div>
              )}
            </div>
          </article>
        </section>

        <aside className="study-rail">
          <div
            className="rail-resizer"
            role="separator"
            aria-label="拖拽调整右侧学习栏宽度"
            aria-orientation="vertical"
            onPointerDown={startResizeStudyRail}
          />
          <section className="panel-section toc-panel">
            <div className="section-kicker">本文目录</div>
            <Outline toc={parsed.toc} activeBlockId={activeBlockId} onJump={jumpToBlock} />
          </section>

          <section className="panel-section selected-card">
            <div className="section-kicker">当前选区</div>
            {selection ? (
              <>
                <p>{selection.text}</p>
                <div className="context-line">
                  {activeBlock?.headingPath.join(" / ") || parsed.title}
                </div>
              </>
            ) : (
              <div className="empty-state">在正文中选中一句话、关键词或段落，就可以做笔记和提问。</div>
            )}
          </section>

          <section className="panel-section action-grid">
            <button disabled={!selection} type="button" onClick={() => addAnnotation("highlight")}>
              <HighlighterCircle size={16} />
              标重点
            </button>
            <button disabled={!selection} type="button" onClick={() => addAnnotation("bookmark")}>
              <BookmarkSimple size={16} />
              收藏
            </button>
          </section>

          <section className="panel-section">
            <label className="field-label" htmlFor="note-draft">
              我的理解
            </label>
            <textarea
              id="note-draft"
              className="note-input"
              value={noteDraft}
              disabled={!selection}
              placeholder="写下这段为什么重要、你哪里还没想通，或它和别处的关系"
              onChange={(event) => setNoteDraft(event.target.value)}
            />
            <button
              className="primary-button"
              disabled={!selection || !noteDraft.trim()}
              type="button"
              onClick={() => addAnnotation("note", noteDraft.trim())}
            >
              <NotePencil size={16} />
              保存笔记
            </button>
          </section>

          <section className="panel-section ai-box">
            <div className="section-title-row">
              <div>
                <div className="section-kicker">AI 边栏</div>
                <h2>围绕上下文提问</h2>
              </div>
              <Brain size={21} weight="duotone" />
            </div>
            <div className="ai-actions">
              <button disabled={!selection || aiBusy} type="button" onClick={() => void runAi("explain")}>
                {aiBusy ? "请求中..." : "解释选区"}
              </button>
              <button disabled={aiBusy} type="button" onClick={() => void runAi("summarize")}>
                总结章节
              </button>
              <button disabled={!selection || aiBusy} type="button" onClick={() => void runAi("term")}>
                生成概念卡
              </button>
            </div>
            <label className="ask-row">
              <input
                value={questionDraft}
                disabled={aiBusy}
                onChange={(event) => setQuestionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void runAi("question");
                }}
                placeholder="例如：它和普通 RAG 有什么区别？"
              />
              <button
                aria-label="提问"
                disabled={aiBusy || !questionDraft.trim()}
                type="button"
                onClick={() => void runAi("question")}
              >
                <CaretRight size={17} weight="bold" />
              </button>
            </label>
            {aiError ? <div className="error-line">{aiError}</div> : null}
            <div className="hint-line">已接入 Responses API；文档内容只会在你点击 AI 操作时发送。</div>
          </section>

          <section className="panel-section notes-feed">
            <div className="section-title-row">
              <div>
                <div className="section-kicker">学习笔记</div>
                <h2>{currentAnnotations.length + currentThreads.length} 条沉淀</h2>
              </div>
              <Plus size={18} />
            </div>
            <div className="feed-list">
              {currentThreads.map((thread) => (
                <AiCard
                  key={thread.id}
                  thread={thread}
                  onJump={() => thread.blockId && jumpToBlock(thread.blockId, thread.selectedText)}
                  onSave={() => saveAiAsNote(thread)}
                />
              ))}
              {selectedAnnotations.map((annotation) => (
                <AnnotationCard
                  key={annotation.id}
                  annotation={annotation}
                  onJump={() => jumpToBlock(annotation.blockId, annotation.selectedText)}
                  onRemove={() => removeAnnotation(annotation.id)}
                />
              ))}
              {currentAnnotations
                .filter((item) => !selection || item.blockId !== selection.blockId)
                .slice(0, 16)
                .map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    annotation={annotation}
                    compact
                    onJump={() => jumpToBlock(annotation.blockId, annotation.selectedText)}
                    onRemove={() => removeAnnotation(annotation.id)}
                  />
                ))}
              {!currentAnnotations.length && !currentThreads.length ? (
                <div className="empty-state">选中 Hermes 文档里的关键句，笔记和 AI 答案会在这里形成复习线索。</div>
              ) : null}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function Outline({
  activeBlockId,
  onJump,
  toc,
}: {
  activeBlockId: string | null;
  onJump: (blockId: string) => void;
  toc: TocItem[];
}) {
  return (
    <nav className="outline" aria-label="本文目录">
      {toc.map((item) => (
        <button
          key={item.id}
          className={activeBlockId === item.id ? "active" : ""}
          type="button"
          onClick={() => onJump(item.id)}
          style={{ paddingLeft: `${8 + (item.level - 1) * 13}px` }}
        >
          {item.title}
        </button>
      ))}
    </nav>
  );
}

function MarkdownBlock({
  annotations,
  block,
  searchTerms,
  selected,
}: {
  annotations: Annotation[];
  block: DocBlock;
  searchTerms: string[];
  selected: boolean;
}) {
  const className = [
    "doc-block",
    selected ? "is-selected" : "",
    annotations.length ? "has-annotation" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inline = (
    <InlineText text={block.text} annotations={annotations} searchTerms={searchTerms} />
  );

  if (block.type === "heading") {
    const Tag = `h${Math.min(block.level ?? 2, 4)}` as "h1" | "h2" | "h3" | "h4";
    return (
      <Tag className={className} id={block.id} data-block-id={block.id}>
        {inline}
      </Tag>
    );
  }

  if (block.type === "code") {
    return (
      <pre className={className} id={block.id} data-block-id={block.id}>
        {block.lang ? <span className="code-lang">{block.lang}</span> : null}
        <code>{block.text}</code>
      </pre>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className={className} id={block.id} data-block-id={block.id}>
        {inline}
      </blockquote>
    );
  }

  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag className={className} id={block.id} data-block-id={block.id}>
        {(block.items ?? []).map((item, index) => (
          <li key={`${item}-${index}`}>
            <InlineText text={item} annotations={annotations} searchTerms={searchTerms} />
          </li>
        ))}
      </Tag>
    );
  }

  if (block.type === "table") {
    return (
      <div className={className} id={block.id} data-block-id={block.id}>
        <table>
          {block.header ? (
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={`${cell}-${index}`}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {(block.rows ?? []).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "rule") {
    return <hr className={className} id={block.id} data-block-id={block.id} />;
  }

  return (
    <p className={className} id={block.id} data-block-id={block.id}>
      {inline}
    </p>
  );
}

function InlineText({
  annotations,
  searchTerms,
  text,
}: {
  annotations: Annotation[];
  searchTerms: string[];
  text: string;
}) {
  const chunks = useMemo(
    () => markText(text, annotations, searchTerms),
    [annotations, searchTerms, text],
  );
  return (
    <>
      {chunks.map((chunk, index) => {
        if (chunk.kind === "annotation") {
          return (
            <mark key={index} className="annotation-mark">
              {renderInline(chunk.text)}
            </mark>
          );
        }
        if (chunk.kind === "search") {
          return (
            <mark key={index} className="search-mark">
              {renderInline(chunk.text)}
            </mark>
          );
        }
        return <span key={index}>{renderInline(chunk.text)}</span>;
      })}
    </>
  );
}

function AnnotationCard({
  annotation,
  compact,
  onJump,
  onRemove,
}: {
  annotation: Annotation;
  compact?: boolean;
  onJump: () => void;
  onRemove: () => void;
}) {
  return (
    <article className={compact ? "feed-card compact" : "feed-card"}>
      <div className="feed-card-head">
        <button type="button" onClick={onJump}>
          {annotationLabel(annotation.kind)}
        </button>
        <button aria-label="删除笔记" type="button" onClick={onRemove}>
          <Trash size={14} />
        </button>
      </div>
      {annotation.note ? <div className="note-body">{renderRichText(annotation.note)}</div> : null}
      <blockquote>{annotation.selectedText}</blockquote>
    </article>
  );
}

function AiCard({
  onJump,
  onSave,
  thread,
}: {
  onJump: () => void;
  onSave: () => void;
  thread: AiThread;
}) {
  return (
    <article className="feed-card ai-card">
      <div className="feed-card-head">
        <button type="button" onClick={onJump}>
          <Sparkle size={14} weight="fill" />
          {thread.status === "streaming" ? "AI 生成中" : "AI 回答"}
        </button>
        <button type="button" disabled={thread.status === "streaming"} onClick={onSave}>
          存为笔记
        </button>
      </div>
      <div className="ai-answer">
        {thread.answer ? renderRichText(thread.answer) : <p className="stream-placeholder">正在连接模型...</p>}
        {thread.status === "streaming" ? <span className="stream-cursor" /> : null}
      </div>
      <blockquote>{thread.prompt}</blockquote>
    </article>
  );
}

function parseMarkdown(markdown: string): {
  blocks: DocBlock[];
  toc: TocItem[];
  title: string;
} {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: DocBlock[] = [];
  const toc: TocItem[] = [];
  const headingPath: string[] = [];
  const idCounts = new Map<string, number>();

  const addBlock = (
    type: BlockType,
    markdownValue: string,
    textValue: string,
    extra: Partial<DocBlock> = {},
  ) => {
    let blockHeadingPath = [...headingPath];
    if (type === "heading") {
      const level = extra.level ?? 1;
      headingPath[level - 1] = textValue;
      headingPath.length = level;
      blockHeadingPath = [...headingPath];
    }

    const seed = `${blockHeadingPath.join("/")}|${textValue}|${markdownValue}`;
    const baseId = `b-${hashString(seed)}`;
    const count = idCounts.get(baseId) ?? 0;
    idCounts.set(baseId, count + 1);
    const id = count ? `${baseId}-${count}` : baseId;

    const block: DocBlock = {
      id,
      type,
      markdown: markdownValue,
      text: textValue,
      headingPath: blockHeadingPath,
      ...extra,
    };
    if (type === "heading") {
      toc.push({ id, level: extra.level ?? 1, title: textValue });
    }
    blocks.push(block);
  };

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const raw = [line];
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        raw.push(lines[index]);
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) raw.push(lines[index++]);
      addBlock("code", raw.join("\n"), code.join("\n"), { lang: fence[1]?.trim() });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      addBlock("heading", line, stripInline(heading[2]), { level: heading[1].length });
      index += 1;
      continue;
    }

    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      addBlock("rule", line, "分隔线");
      index += 1;
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      const raw: string[] = [];
      const items: string[] = [];
      const ordered = /^\d/.test(listMatch[2]);
      while (index < lines.length) {
        const match = lines[index].match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
        if (!match || /^\d/.test(match[2]) !== ordered) break;
        raw.push(lines[index]);
        const indent = match[1].length ? "  ".repeat(Math.min(3, Math.floor(match[1].length / 2))) : "";
        items.push(`${indent}${stripInline(match[3])}`);
        index += 1;
      }
      addBlock("list", raw.join("\n"), items.join(" "), { items, ordered });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const raw: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        raw.push(lines[index]);
        index += 1;
      }
      const text = raw.map((item) => item.replace(/^\s*>\s?/, "")).join(" ");
      addBlock("quote", raw.join("\n"), stripInline(text));
      continue;
    }

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|/.test(lines[index + 1])
    ) {
      const raw: string[] = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        raw.push(lines[index]);
        index += 1;
      }
      const rows = raw
        .filter((row, rowIndex) => rowIndex !== 1)
        .map(parseTableRow)
        .filter((row) => row.length);
      addBlock("table", raw.join("\n"), stripInline(raw.join(" ")), {
        header: rows[0] ?? [],
        rows: rows.slice(1),
      });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[index]) &&
      !/^\s*>/.test(lines[index]) &&
      !/^\s*[-*_]{3,}\s*$/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    addBlock("paragraph", paragraph.join("\n"), stripInline(paragraph.join(" ")));
  }

  return {
    blocks,
    toc,
    title: toc[0]?.title || "未命名文档",
  };
}

function getSectionMarkdown(blocks: DocBlock[], blockId?: string): string {
  if (!blockId) return blocks.slice(0, 12).map((block) => block.markdown).join("\n\n");
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return "";
  let start = index;
  while (start > 0 && blocks[start].type !== "heading") start -= 1;
  const level = blocks[start].type === "heading" ? blocks[start].level ?? 1 : 1;
  let end = start + 1;
  while (
    end < blocks.length &&
    !(blocks[end].type === "heading" && (blocks[end].level ?? 1) <= level)
  ) {
    end += 1;
  }
  return blocks.slice(start, end).map((block) => block.markdown).join("\n\n");
}

async function readAiStream(
  response: Response,
  handlers: {
    onDelta: (text: string) => void;
    onError: (message: string) => void;
  },
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("当前浏览器不支持流式读取。");

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      handleAiStreamEvent(rawEvent, handlers);
    }
  }

  if (buffer.trim()) handleAiStreamEvent(buffer, handlers);
}

function handleAiStreamEvent(
  rawEvent: string,
  handlers: {
    onDelta: (text: string) => void;
    onError: (message: string) => void;
  },
) {
  let event = "message";
  const data: string[] = [];
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return;
  const payload = JSON.parse(data.join("\n")) as { text?: string; error?: string };
  if (event === "delta" && payload.text) handlers.onDelta(payload.text);
  if (event === "error") handlers.onError(payload.error || "AI 流式响应失败。");
}

function markText(
  text: string,
  annotations: Annotation[],
  searchTerms: string[],
): Array<{ kind: "annotation" | "search" | "text"; text: string }> {
  const ranges: Array<{ start: number; end: number; kind: "annotation" | "search" }> = [];

  for (const annotation of annotations) {
    const selected = annotation.selectedText.trim();
    if (!selected || selected.length > text.length) continue;
    const start = text.indexOf(selected);
    if (start >= 0) ranges.push({ start, end: start + selected.length, kind: "annotation" });
  }

  const lower = text.toLowerCase();
  for (const term of searchTerms) {
    const needle = term.toLowerCase();
    if (!needle) continue;
    let start = lower.indexOf(needle);
    while (start >= 0) {
      ranges.push({ start, end: start + needle.length, kind: "search" });
      start = lower.indexOf(needle, start + Math.max(1, needle.length));
    }
  }

  const accepted: typeof ranges = [];
  for (const range of ranges.sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (accepted.some((item) => range.start < item.end && range.end > item.start)) continue;
    accepted.push(range);
  }

  const chunks: Array<{ kind: "annotation" | "search" | "text"; text: string }> = [];
  let cursor = 0;
  for (const range of accepted.sort((a, b) => a.start - b.start)) {
    if (range.start > cursor) chunks.push({ kind: "text", text: text.slice(cursor, range.start) });
    chunks.push({ kind: range.kind, text: text.slice(range.start, range.end) });
    cursor = range.end;
  }
  if (cursor < text.length) chunks.push({ kind: "text", text: text.slice(cursor) });
  return chunks.length ? chunks : [{ kind: "text", text }];
}

function renderRichText(value: string) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`list-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const heading = line.match(/^#{2,4}\s+(.+)$/);
    if (heading) {
      flushList();
      nodes.push(<h4 key={`heading-${nodes.length}`}>{renderInline(heading[1])}</h4>);
      continue;
    }

    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      listItems.push(listItem[1]);
      continue;
    }

    const numberedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (numberedItem) {
      listItems.push(numberedItem[1]);
      continue;
    }

    flushList();
    nodes.push(<p key={`paragraph-${nodes.length}`}>{renderInline(line)}</p>);
  }

  flushList();
  return nodes.length ? nodes : <p>{value}</p>;
}

function renderInline(value: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(<code key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={`${token}-${match.index}`}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        nodes.push(
          <a key={`${token}-${match.index}`} href={link[2]} target="_blank" rel="noreferrer">
            {link[1]}
          </a>,
        );
      }
    }
    cursor = match.index + token.length;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function parseTableRow(value: string) {
  return value
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => stripInline(cell.trim()));
}

function annotationLabel(kind: AnnotationKind) {
  const labels: Record<AnnotationKind, string> = {
    ai: "AI 笔记",
    bookmark: "收藏",
    highlight: "重点",
    note: "笔记",
    term: "概念卡",
  };
  return labels[kind];
}

function stripInline(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "document"
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
