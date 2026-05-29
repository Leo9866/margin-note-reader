import {
  BookmarkSimple,
  Brain,
  CaretRight,
  Check,
  CornersIn,
  CornersOut,
  Export,
  FilePpt,
  HighlighterCircle,
  MagnifyingGlass,
  Moon,
  NotePencil,
  PencilSimple,
  Plus,
  Sparkle,
  Sun,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import type PptxGenJS from "pptxgenjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "margin-note-reader.hermes.v1";
const LIBRARY_DB_NAME = "margin-note-reader.library";
const LIBRARY_DB_VERSION = 1;
const LIBRARY_STORE_NAME = "documents";
const LAYOUT_VERSION = 4;
const DEFAULT_FONT_SIZE = 20;
const DEFAULT_MEASURE = 108;
const MIN_READER_FONT_SIZE = 19;
const DEFAULT_STUDY_WIDTH = 430;
const MIN_STUDY_WIDTH = 340;
const MAX_STUDY_WIDTH = 680;
const EMPTY_DOC_TEMPLATE = "# 未命名文档\n\n在这里开始记录、阅读或整理资料。\n";

const DOCS: ReaderDoc[] = [];

type BlockType = "heading" | "paragraph" | "list" | "quote" | "code" | "table" | "rule";
type AnnotationKind =
  | "highlight"
  | "note"
  | "bookmark"
  | "ai"
  | "term"
  | "important"
  | "question"
  | "definition"
  | "citation"
  | "revisit";
type AiMode = "explain" | "summarize" | "question" | "term";
type SourceType = "blank" | "markdown-file" | "folder-file" | "html-file";
type Theme = "light" | "dark";

const NOTE_KIND_OPTIONS: Array<{ kind: AnnotationKind; label: string }> = [
  { kind: "note", label: "笔记" },
  { kind: "important", label: "重要" },
  { kind: "question", label: "问题" },
  { kind: "definition", label: "定义" },
  { kind: "citation", label: "引用" },
  { kind: "revisit", label: "回看" },
];

interface ReaderDoc {
  file: string;
  title: string;
  group: string;
  sourceType: SourceType;
  originalName?: string;
  relativePath?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ImportedDoc extends ReaderDoc {
  createdAt: string;
  updatedAt: string;
  markdown: string;
}

interface DocBlock {
  id: string;
  aliases?: string[];
  type: BlockType;
  markdown: string;
  inlineMarkdown?: string;
  text: string;
  headingPath: string[];
  level?: number;
  items?: ListItem[];
  ordered?: boolean;
  lang?: string;
  rows?: string[][];
  header?: string[];
}

interface ListItem {
  markdown: string;
  text: string;
  level: number;
  marker: string;
  ordered: boolean;
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
  currentDocFile: string | null;
  importedDocs?: ImportedDoc[];
  annotations: Annotation[];
  aiThreads: AiThread[];
  theme: Theme;
  fontSize: number;
  measure: number;
  studyWidth: number;
}

export default function App() {
  const articleRef = useRef<HTMLElement | null>(null);
  const markdownInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const htmlInputRef = useRef<HTMLInputElement | null>(null);
  const hasAppliedHashRef = useRef(false);
  const [currentDocFile, setCurrentDocFile] = useState<string | null>(null);
  const [markdownByFile, setMarkdownByFile] = useState<Record<string, string>>({});
  const [importedDocs, setImportedDocs] = useState<ImportedDoc[]>([]);
  const [loadError, setLoadError] = useState("");
  const [importError, setImportError] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [aiThreads, setAiThreads] = useState<AiThread[]>([]);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteKind, setNoteKind] = useState<AnnotationKind>("note");
  const [questionDraft, setQuestionDraft] = useState("");
  const [query, setQuery] = useState("");
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [measure, setMeasure] = useState(DEFAULT_MEASURE);
  const [theme, setTheme] = useState<Theme>("light");
  const [studyWidth, setStudyWidth] = useState(DEFAULT_STUDY_WIDTH);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [pptBusy, setPptBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [flashBlockId, setFlashBlockId] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState("");
  const [sourceStatus, setSourceStatus] = useState("");
  const [isImmersive, setIsImmersive] = useState(false);

  const allDocs = useMemo<ReaderDoc[]>(() => [...DOCS, ...importedDocs], [importedDocs]);
  const currentDoc = currentDocFile ? allDocs.find((doc) => doc.file === currentDocFile) ?? null : null;
  const isEditableDoc = Boolean(currentDoc);
  const markdown = currentDocFile ? markdownByFile[currentDocFile] ?? "" : "";
  const parsed = useMemo(() => parseMarkdown(markdown), [markdown]);
  const blockIdLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const block of parsed.blocks) {
      lookup.set(block.id, block.id);
      for (const alias of block.aliases ?? []) lookup.set(alias, block.id);
    }
    return lookup;
  }, [parsed.blocks]);
  const currentAnnotations = currentDocFile
    ? annotations.filter((item) => item.docFile === currentDocFile)
    : [];
  const currentThreads = currentDocFile
    ? aiThreads.filter((item) => item.docFile === currentDocFile)
    : [];
  const activeBlock =
    (selection ? findBlockById(parsed.blocks, selection.blockId, blockIdLookup) : null) ??
    findBlockById(parsed.blocks, activeBlockId, blockIdLookup) ??
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
    ? currentAnnotations.filter((item) => {
        const selectedBlock = findBlockById(parsed.blocks, selection.blockId, blockIdLookup);
        return selectedBlock ? annotationBelongsToBlock(item, selectedBlock) : false;
      })
    : [];

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as Partial<PersistedState>) : {};
        const legacyDocs = sanitizeImportedDocs(stored.importedDocs);
        const libraryDocs = await loadLibraryDocs();
        const nextImportedDocs = dedupeImportedDocs([...libraryDocs, ...legacyDocs]);
        if (legacyDocs.length) await saveLibraryDocs(nextImportedDocs);
        if (cancelled) return;

        setImportedDocs(nextImportedDocs);
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
      } finally {
        if (!cancelled) setHasHydrated(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const applyHashDoc = () => {
      const hashDoc = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (hashDoc && allDocs.some((doc) => doc.file === hashDoc)) {
        setCurrentDocFile(hashDoc);
      }
    };

    if (!hasAppliedHashRef.current) {
      applyHashDoc();
      hasAppliedHashRef.current = true;
    }
    window.addEventListener("hashchange", applyHashDoc);
    return () => window.removeEventListener("hashchange", applyHashDoc);
  }, [allDocs, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
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
  }, [
    aiThreads,
    annotations,
    currentDocFile,
    fontSize,
    hasHydrated,
    importedDocs,
    measure,
    studyWidth,
    theme,
  ]);

  useEffect(() => {
    if (!currentDocFile) return;
    if (markdownByFile[currentDocFile]) return;
    const importedDoc = importedDocs.find((doc) => doc.file === currentDocFile);
    if (importedDoc) {
      setLoadError("");
      setMarkdownByFile((current) =>
        current[currentDocFile] ? current : { ...current, [currentDocFile]: importedDoc.markdown },
      );
      return;
    }
    if (!DOCS.some((doc) => doc.file === currentDocFile)) {
      setLoadError(`无法读取文档：${currentDocFile}`);
      return;
    }
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
  }, [currentDocFile, importedDocs, markdownByFile]);

  useEffect(() => {
    if (!isEditingSource) setSourceDraft(markdown);
  }, [isEditingSource, markdown]);

  useEffect(() => {
    if (currentDocFile) {
      window.history.replaceState(null, "", `#${currentDocFile}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setSelection(null);
    setActiveBlockId(null);
    setProgress(0);
    setIsEditingSource(false);
    setSourceStatus("");
    articleRef.current?.scrollTo({ top: 0 });
  }, [currentDocFile]);

  useEffect(() => {
    if (!currentDoc) setIsImmersive(false);
  }, [currentDoc]);

  useEffect(() => {
    if (!isImmersive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsImmersive(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isImmersive]);

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
      if (!selection || !currentDocFile) return;
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
    const resolvedBlockId = blockIdLookup.get(blockId) ?? blockId;
    const element = document.getElementById(resolvedBlockId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveBlockId(resolvedBlockId);
    setFlashBlockId(resolvedBlockId);
    window.setTimeout(() => {
      setFlashBlockId((current) => (current === resolvedBlockId ? null : current));
    }, 1600);
    if (selectedText) setSelection({ blockId: resolvedBlockId, text: selectedText });
  }, [blockIdLookup]);

  const runAi = useCallback(
    async (mode: AiMode) => {
      if (!currentDoc || !currentDocFile) return;
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
        const message = getAiErrorMessage(error);
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
      currentDoc,
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
    if (!currentDoc) return;
    const lines = [
      `# ${currentDoc.title} 阅读笔记`,
      "",
      ...currentAnnotations.map((item) => {
        const block = findBlockById(parsed.blocks, item.blockId, blockIdLookup);
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
  }, [blockIdLookup, currentAnnotations, currentDoc, parsed.blocks, parsed.title]);

  const exportPresentation = useCallback(async () => {
    if (!currentDoc || !markdown.trim()) return;
    setPptBusy(true);
    try {
      await exportMarkdownAsPptx({
        blocks: parsed.blocks,
        markdown,
        title: currentDoc.title,
      });
    } finally {
      setPptBusy(false);
    }
  }, [currentDoc, markdown, parsed.blocks]);

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
    return allDocs.reduce<Record<string, ReaderDoc[]>>((groups, doc) => {
      groups[doc.group] = [...(groups[doc.group] ?? []), doc];
      return groups;
    }, {});
  }, [allDocs]);

  const saveDocsToLibrary = useCallback(async (docs: ImportedDoc[]) => {
    await saveLibraryDocs(docs);
    setImportedDocs((current) => dedupeImportedDocs([...docs, ...current]));
    setMarkdownByFile((current) => {
      const next = { ...current };
      for (const doc of docs) next[doc.file] = doc.markdown;
      return next;
    });
    setCurrentDocFile(docs[0]?.file ?? null);
  }, []);

  const saveSourceEdit = useCallback(async () => {
    if (!currentDoc || !currentDocFile) return;
    const now = new Date().toISOString();
    const previous = importedDocs.find((doc) => doc.file === currentDocFile);
    const nextDoc: ImportedDoc = {
      file: currentDocFile,
      title: extractTitleFromMarkdown(sourceDraft, previous?.originalName ?? currentDoc.title),
      group: previous?.group ?? currentDoc.group,
      sourceType: previous?.sourceType ?? currentDoc.sourceType,
      originalName: previous?.originalName ?? currentDoc.originalName,
      relativePath: previous?.relativePath ?? currentDoc.relativePath,
      markdown: sourceDraft,
      createdAt: previous?.createdAt ?? currentDoc.createdAt ?? now,
      updatedAt: now,
    };
    await saveLibraryDocs([nextDoc]);
    setImportedDocs((current) =>
      dedupeImportedDocs(current.map((doc) => (doc.file === currentDocFile ? nextDoc : doc))),
    );
    setMarkdownByFile((current) => ({ ...current, [currentDocFile]: sourceDraft }));
    setIsEditingSource(false);
    setSelection(null);
    setActiveBlockId(null);
    setSourceStatus("已保存源文");
    window.setTimeout(() => {
      setSourceStatus((current) => (current === "已保存源文" ? "" : current));
    }, 1800);
  }, [currentDoc, currentDocFile, importedDocs, sourceDraft]);

  const createBlankDocument = useCallback(async () => {
    setImportError("");
    const now = new Date().toISOString();
    const doc: ImportedDoc = {
      file: `local:${Date.now()}-blank`,
      title: "未命名文档",
      group: "我的文档",
      sourceType: "blank",
      markdown: EMPTY_DOC_TEMPLATE,
      createdAt: now,
      updatedAt: now,
    };
    await saveDocsToLibrary([doc]);
  }, [saveDocsToLibrary]);

  const importDocuments = useCallback(async (files: FileList | null, mode: "file" | "folder" | "html") => {
    if (!files?.length) return;
    setImportError("");
    const allFiles = Array.from(files);
    const assetMap = await createImageAssetMap(allFiles.filter(isImageFile));
    const accepted = allFiles.filter((file) =>
      mode === "html"
        ? /\.(html|htm)$/i.test(file.name) || file.type === "text/html"
        : /\.(md|markdown|txt|html|htm)$/i.test(file.name) ||
          ["text/markdown", "text/plain", "text/html"].includes(file.type),
    );
    if (!accepted.length) {
      setImportError(mode === "html" ? "请选择 HTML 文件。" : "请选择 Markdown、纯文本或 HTML 文件。");
      return;
    }

    try {
      const now = new Date().toISOString();
      const imported = await Promise.all(
        accepted.map(async (file, index) => {
          if (file.size > 8_000_000) {
            throw new Error(`${file.name} 超过 8MB，当前浏览器本地文档库暂不适合导入这么大的文件。`);
          }
          const raw = await file.text();
          const isHtml = /\.(html|htm)$/i.test(file.name) || file.type === "text/html";
          const relativePath = getRelativePath(file);
          const markdownValue = isHtml
            ? htmlToMarkdown(raw, file.name, assetMap, relativePath)
            : rewriteMarkdownImageSources(raw, assetMap, relativePath);
          const title = extractTitleFromMarkdown(markdownValue, file.name);
          const sourceType: SourceType = isHtml ? "html-file" : mode === "folder" ? "folder-file" : "markdown-file";
          return {
            file: `local:${Date.now()}-${index}-${slugify(file.name)}`,
            title,
            group: mode === "folder" ? "文件夹导入" : "我的文档",
            sourceType,
            originalName: file.name,
            relativePath,
            markdown: markdownValue,
            createdAt: now,
            updatedAt: now,
          };
        }),
      );
      await saveDocsToLibrary(imported);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "导入失败。");
    }
  }, [saveDocsToLibrary]);

  const deleteImportedDocument = useCallback(async (docFile: string) => {
    const doc = importedDocs.find((item) => item.file === docFile);
    if (!doc) return;
    const confirmed = window.confirm(
      `确定从浏览器本地文档库移除「${doc.title}」吗？\n\n这只会删除浏览器里的阅读记录、笔记和 AI 沉淀，不会删除你电脑上的原始文件。`,
    );
    if (!confirmed) return;

    try {
      await deleteLibraryDoc(docFile);
      setImportedDocs((current) => current.filter((item) => item.file !== docFile));
      setMarkdownByFile((current) => {
        const next = { ...current };
        delete next[docFile];
        return next;
      });
      setAnnotations((current) => current.filter((item) => item.docFile !== docFile));
      setAiThreads((current) => current.filter((item) => item.docFile !== docFile));
      if (currentDocFile === docFile) setCurrentDocFile(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "删除浏览器记录失败。");
    }
  }, [currentDocFile, importedDocs]);

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
    <div className={currentDoc && isImmersive ? "app is-immersive" : "app"} data-theme={theme}>
      <header className="topbar">
        <button className="topbar-icon" type="button" aria-label="工作区首页" onClick={() => setCurrentDocFile(null)}>
          ≡
        </button>
        <div className="brand">
          <span className="brand-script">Margin</span>
          <span className="brand-separator">/</span>
          <strong>阅读工作台</strong>
        </div>
        <div className="topbar-current">{currentDoc?.title ?? "工作区首页"}</div>
        <div className="topbar-actions">
          <label className="topbar-search">
            <MagnifyingGlass size={15} />
            <input
              value={query}
              disabled={!currentDoc}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索当前文档"
            />
          </label>
          <button
            className="topbar-text-button"
            disabled={!isEditableDoc}
            type="button"
            title={isEditableDoc ? "编辑当前文档源文" : "当前文档不可编辑"}
            onClick={() => {
              setIsImmersive(false);
              setSourceDraft(markdown);
              setIsEditingSource(true);
            }}
          >
            <PencilSimple size={15} />
            编辑源文
          </button>
          <button
            className="topbar-text-button"
            disabled={!currentDoc || isEditingSource}
            type="button"
            title={isEditingSource ? "源文编辑时暂不可进入沉浸阅读" : isImmersive ? "退出沉浸式阅读" : "进入沉浸式阅读"}
            onClick={() => setIsImmersive((value) => !value)}
          >
            {isImmersive ? <CornersIn size={15} /> : <CornersOut size={15} />}
            {isImmersive ? "退出沉浸" : "沉浸阅读"}
          </button>
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
          <button
            className="topbar-icon"
            disabled={!currentDoc}
            type="button"
            aria-label="导出笔记"
            onClick={exportNotes}
          >
            <Export size={16} />
          </button>
          <button
            className="topbar-text-button"
            disabled={!currentDoc || pptBusy || isEditingSource}
            type="button"
            title="按金山云方案风格导出当前文档为 PPTX"
            onClick={() => void exportPresentation()}
          >
            <FilePpt size={15} />
            {pptBusy ? "生成中..." : "导出 PPT"}
          </button>
        </div>
      </header>

      <main
        className={currentDoc ? "workspace" : "workspace is-home"}
        style={{ "--study-width": `${studyWidth}px` } as React.CSSProperties}
      >
        <aside className="doc-rail">
          <div className="import-box">
            <button type="button" onClick={() => void createBlankDocument()}>
              <Plus size={15} />
              新建空白文档
            </button>
            <button type="button" onClick={() => markdownInputRef.current?.click()}>
              <UploadSimple size={15} />
              打开 Markdown
            </button>
            <button type="button" onClick={() => folderInputRef.current?.click()}>
              <UploadSimple size={15} />
              打开文件夹
            </button>
            <button type="button" onClick={() => htmlInputRef.current?.click()}>
              <UploadSimple size={15} />
              打开 HTML
            </button>
            <input
              ref={markdownInputRef}
              hidden
              multiple
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              onChange={(event) => {
                void importDocuments(event.currentTarget.files, "file");
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={folderInputRef}
              hidden
              multiple
              type="file"
              accept=".md,.markdown,.txt,.html,.htm,text/markdown,text/plain,text/html"
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(event) => {
                void importDocuments(event.currentTarget.files, "folder");
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={htmlInputRef}
              hidden
              multiple
              type="file"
              accept=".html,.htm,text/html"
              onChange={(event) => {
                void importDocuments(event.currentTarget.files, "html");
                event.currentTarget.value = "";
              }}
            />
            {importError ? <p className="import-error">{importError}</p> : null}
          </div>
          <nav aria-label="本地文档库">
            {Object.entries(docsByGroup).length ? (
              Object.entries(docsByGroup).map(([group, docs]) => (
                <section key={group} className="nav-group">
                  <h2>{group}</h2>
                  {docs.map((doc) => (
                    <div key={doc.file} className="doc-link-row">
                      <button
                        className={doc.file === currentDocFile ? "doc-link active" : "doc-link"}
                        type="button"
                        onClick={() => setCurrentDocFile(doc.file)}
                      >
                        {doc.title}
                      </button>
                      <button
                        className="doc-delete"
                        type="button"
                        title="只删除浏览器记录，不删除原始文件"
                        aria-label={`删除 ${doc.title} 的浏览器记录`}
                        onClick={() => void deleteImportedDocument(doc.file)}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </section>
              ))
            ) : (
              <div className="rail-empty">
                还没有本地文档。新建一篇空白文档，或打开 Markdown / HTML 文件开始。
              </div>
            )}
          </nav>
          <div className="rail-note">
            <strong>本地优先</strong>
            <span>导入文档、笔记、概念卡和 AI 答案都保存在当前浏览器。</span>
          </div>
        </aside>

        {currentDoc ? (
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
              ) : isEditingSource && currentDoc ? (
                <SourceEditor
                  docTitle={currentDoc.title}
                  draft={sourceDraft}
                  onCancel={() => {
                    setSourceDraft(markdown);
                    setIsEditingSource(false);
                  }}
                  onChange={setSourceDraft}
                  onSave={() => void saveSourceEdit()}
                />
              ) : markdown ? (
                <>
                  <div className="doc-meta">
                    <span>约 {Math.max(1, Math.round(markdown.length / 800))} 分钟</span>
                    <span>{allDocs.findIndex((doc) => doc.file === currentDocFile) + 1} / {allDocs.length}</span>
                    <span>{parsed.blocks.length} 个阅读块</span>
                    <span>{sourceTypeLabel(currentDoc.sourceType)}</span>
                    {sourceStatus ? <span>{sourceStatus}</span> : null}
                    {query.trim() ? <span>{matchingBlocks} 个匹配块</span> : null}
                  </div>
                  {parsed.blocks.map((block) => (
                    <MarkdownBlock
                      key={block.id}
                      block={block}
                      annotations={currentAnnotations.filter((item) => annotationBelongsToBlock(item, block))}
                      searchTerms={searchTerms}
                      selected={selection?.blockId === block.id}
                      focused={flashBlockId === block.id}
                    />
                  ))}
                </>
              ) : (
                <div className="reader-loading">正在载入文档...</div>
              )}
            </div>
          </article>
        </section>
        ) : (
          <StartWorkspace
            importedDocs={importedDocs}
            onCreateBlank={() => void createBlankDocument()}
            onOpenMarkdown={() => markdownInputRef.current?.click()}
            onOpenFolder={() => folderInputRef.current?.click()}
            onOpenHtml={() => htmlInputRef.current?.click()}
            onSelectDoc={setCurrentDocFile}
            onDeleteDoc={(docFile) => void deleteImportedDocument(docFile)}
          />
        )}

        {currentDoc ? (
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
            <div className="kind-picker" aria-label="笔记类型">
              {NOTE_KIND_OPTIONS.map((option) => (
                <button
                  key={option.kind}
                  className={noteKind === option.kind ? "active" : ""}
                  disabled={!selection}
                  type="button"
                  onClick={() => setNoteKind(option.kind)}
                >
                  {option.label}
                </button>
              ))}
            </div>
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
              onClick={() => addAnnotation(noteKind, noteDraft.trim())}
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
                <div className="empty-state">选中文档里的关键句，笔记和 AI 答案会在这里形成复习线索。</div>
              ) : null}
            </div>
          </section>
        </aside>
        ) : null}
      </main>
      {currentDoc && isImmersive ? (
        <button className="immersive-exit" type="button" onClick={() => setIsImmersive(false)}>
          <CornersIn size={16} />
          退出沉浸阅读
        </button>
      ) : null}
    </div>
  );
}

function SourceEditor({
  docTitle,
  draft,
  onCancel,
  onChange,
  onSave,
}: {
  docTitle: string;
  draft: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="source-editor" aria-label="源文编辑器">
      <div className="source-editor-head">
        <div>
          <div className="section-kicker">源文编辑</div>
          <h1>{docTitle}</h1>
        </div>
        <div className="source-editor-actions">
          <button type="button" onClick={onCancel}>
            <X size={15} />
            取消
          </button>
          <button className="save-source" type="button" onClick={onSave}>
            <Check size={15} />
            保存源文
          </button>
        </div>
      </div>
      <textarea
        value={draft}
        spellCheck={false}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <div className="source-editor-foot">
        <span>{draft.length} 字符</span>
        <span>保存后会重新生成目录和阅读块，并写入浏览器本地文档库。</span>
      </div>
    </section>
  );
}

function StartWorkspace({
  importedDocs,
  onCreateBlank,
  onOpenFolder,
  onOpenHtml,
  onOpenMarkdown,
  onSelectDoc,
  onDeleteDoc,
}: {
  importedDocs: ImportedDoc[];
  onCreateBlank: () => void;
  onOpenFolder: () => void;
  onOpenHtml: () => void;
  onOpenMarkdown: () => void;
  onSelectDoc: (docFile: string) => void;
  onDeleteDoc: (docFile: string) => void;
}) {
  const recentDocs = importedDocs.slice(0, 6);

  return (
    <section className="start-shell">
      <div className="start-inner">
        <div className="start-copy">
          <div className="section-kicker">本地阅读工作区</div>
          <h1>从空白文档、文件夹或网页资料开始。</h1>
          <p>
            打开 Markdown、纯文本或 HTML 文件后，文档会保存到浏览器本地文档库；你可以继续做批注、提问、沉淀笔记。
          </p>
        </div>

        <div className="start-actions" aria-label="开始">
          <button type="button" onClick={onCreateBlank}>
            <strong>新建空白文档</strong>
            <span>从一份可编辑的 Markdown 草稿开始</span>
          </button>
          <button type="button" onClick={onOpenMarkdown}>
            <strong>打开 Markdown</strong>
            <span>支持 .md、.markdown、.txt</span>
          </button>
          <button type="button" onClick={onOpenFolder}>
            <strong>打开文件夹</strong>
            <span>批量导入文件夹里的文档资料</span>
          </button>
          <button type="button" onClick={onOpenHtml}>
            <strong>打开 HTML</strong>
            <span>提取正文并转换为 Markdown 阅读</span>
          </button>
        </div>

        <div className="start-lower">
          <section className="recent-panel">
            <div className="section-title-row">
              <div>
                <div className="section-kicker">最近文档</div>
                <h2>{recentDocs.length ? "继续阅读" : "还没有导入文档"}</h2>
              </div>
            </div>
            {recentDocs.length ? (
              <div className="recent-list">
                {recentDocs.map((doc) => (
                  <div key={doc.file} className="recent-item">
                    <button type="button" onClick={() => onSelectDoc(doc.file)}>
                      <span>{doc.title}</span>
                      <small>{doc.relativePath || sourceTypeLabel(doc.sourceType)}</small>
                    </button>
                    <button
                      className="recent-delete"
                      type="button"
                      title="只删除浏览器记录，不删除原始文件"
                      aria-label={`删除 ${doc.title} 的浏览器记录`}
                      onClick={() => onDeleteDoc(doc.file)}
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>导入或新建的文档会出现在这里，刷新浏览器后仍然保留。</p>
            )}
          </section>
        </div>
      </div>
    </section>
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
  focused,
  searchTerms,
  selected,
}: {
  annotations: Annotation[];
  block: DocBlock;
  focused: boolean;
  searchTerms: string[];
  selected: boolean;
}) {
  const className = [
    "doc-block",
    selected ? "is-selected" : "",
    focused ? "is-focused" : "",
    annotations.length ? "has-annotation" : "",
    annotations[0] ? `has-${annotations[0].kind}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inline = (
    <InlineText
      source={block.inlineMarkdown ?? block.markdown}
      text={block.text}
      annotations={annotations}
      searchTerms={searchTerms}
    />
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
    return (
      <ul className={`${className} doc-list`} id={block.id} data-block-id={block.id}>
        {(block.items ?? []).map((item, index) => (
          <li key={`${item.markdown}-${index}`} style={{ "--list-level": item.level } as React.CSSProperties}>
            <span className="list-marker">{item.ordered ? normalizeListMarker(item.marker) : "•"}</span>
            <span>
              <InlineText
                source={item.markdown}
                text={item.text}
                annotations={annotations}
                searchTerms={searchTerms}
              />
            </span>
          </li>
        ))}
      </ul>
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
  source,
  text,
}: {
  annotations: Annotation[];
  searchTerms: string[];
  source?: string;
  text: string;
}) {
  const nodes = useMemo(
    () => renderInlineWithMarks(source ?? text, text, annotations, searchTerms),
    [annotations, searchTerms, source, text],
  );
  return <>{nodes}</>;
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
        <button type="button" onClick={onJump}>
          定位原文
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
  const legacyIdCounts = new Map<string, number>();
  const stableIdCounts = new Map<string, number>();

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

    const stableBaseId =
      type === "heading"
        ? `h-${extra.level ?? 1}-${slugifyId(blockHeadingPath.join("-") || textValue)}`
        : `b-${slugifyId(blockHeadingPath.join("-") || "document")}-${type}`;
    const stableId = nextCountedId(stableBaseId, stableIdCounts);
    const legacyId = createLegacyBlockId(blockHeadingPath, textValue, markdownValue, legacyIdCounts);

    const block: DocBlock = {
      id: stableId,
      aliases: legacyId === stableId ? [] : [legacyId],
      type,
      markdown: markdownValue,
      text: textValue,
      headingPath: blockHeadingPath,
      ...extra,
    };
    if (type === "heading") {
      toc.push({ id: stableId, level: extra.level ?? 1, title: textValue });
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
      addBlock("heading", line, stripInline(heading[2]), {
        inlineMarkdown: heading[2],
        level: heading[1].length,
      });
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
      const items: ListItem[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
        if (!match) {
          if (items.length && /^\s{2,}\S/.test(lines[index])) {
            raw.push(lines[index]);
            const last = items[items.length - 1];
            const continuation = lines[index].trim();
            last.markdown = `${last.markdown} ${continuation}`;
            last.text = stripInline(last.markdown);
            index += 1;
            continue;
          }
          break;
        }
        raw.push(lines[index]);
        const marker = match[2];
        items.push({
          markdown: match[3],
          text: stripInline(match[3]),
          level: Math.min(4, Math.floor(match[1].replace(/\t/g, "    ").length / 2)),
          marker,
          ordered: /^\d/.test(marker),
        });
        index += 1;
      }
      addBlock("list", raw.join("\n"), items.map((item) => item.text).join(" "), {
        items,
        ordered: items[0]?.ordered ?? false,
      });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const raw: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        raw.push(lines[index]);
        index += 1;
      }
      const text = raw.map((item) => item.replace(/^\s*>\s?/, "")).join(" ");
      addBlock("quote", raw.join("\n"), stripInline(text), { inlineMarkdown: text });
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
    addBlock("paragraph", paragraph.join("\n"), stripInline(paragraph.join(" ")), {
      inlineMarkdown: paragraph.join(" "),
    });
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

function getAiErrorMessage(error: unknown) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return [
      "无法连接本地 AI 代理。",
      "请确认应用是通过 npm run dev 或 npm run preview 打开的，并且当前地址对应的 Vite 服务还在运行。",
    ].join(" ");
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "AI 请求失败。";
}

function findBlockById(
  blocks: DocBlock[],
  blockId: string | null | undefined,
  lookup: Map<string, string>,
) {
  if (!blockId) return null;
  const resolved = lookup.get(blockId) ?? blockId;
  return blocks.find((block) => block.id === resolved) ?? null;
}

function annotationBelongsToBlock(annotation: Annotation, block: DocBlock) {
  return annotation.blockId === block.id || Boolean(block.aliases?.includes(annotation.blockId));
}

function markText(
  text: string,
  annotations: Annotation[],
  searchTerms: string[],
): Array<{ start: number; end: number; kind: "annotation" | "search"; annotationKind?: AnnotationKind }> {
  const ranges: Array<{ start: number; end: number; kind: "annotation" | "search"; annotationKind?: AnnotationKind }> = [];

  for (const annotation of annotations) {
    const selected = annotation.selectedText.trim();
    if (!selected || selected.length > text.length) continue;
    const start = text.indexOf(selected);
    if (start >= 0) {
      ranges.push({
        start,
        end: start + selected.length,
        kind: "annotation",
        annotationKind: annotation.kind,
      });
    }
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

  return accepted.sort((a, b) => a.start - b.start);
}

interface InlineToken {
  kind: "text" | "code" | "strong" | "em" | "link" | "image";
  text: string;
  href?: string;
  src?: string;
}

function renderInlineWithMarks(
  markdown: string,
  plainText: string,
  annotations: Annotation[],
  searchTerms: string[],
) {
  const tokens = tokenizeInline(markdown);
  const ranges = markText(plainText, annotations, searchTerms);
  const nodes: React.ReactNode[] = [];
  let plainCursor = 0;
  let keyIndex = 0;

  for (const token of tokens) {
    const tokenStart = plainCursor;
    const tokenEnd = tokenStart + token.text.length;
    if (token.kind === "image") {
      nodes.push(renderInlineTokenPart(token, token.text, keyIndex++));
      plainCursor = tokenEnd;
      continue;
    }
    const overlaps = ranges.filter((range) => range.start < tokenEnd && range.end > tokenStart);
    let localCursor = 0;

    for (const range of overlaps) {
      const localStart = Math.max(0, range.start - tokenStart);
      const localEnd = Math.min(token.text.length, range.end - tokenStart);
      if (localStart > localCursor) {
        nodes.push(renderInlineTokenPart(token, token.text.slice(localCursor, localStart), keyIndex++));
      }
      const marked = renderInlineTokenPart(token, token.text.slice(localStart, localEnd), keyIndex++);
      nodes.push(
        <mark
          key={`mark-${keyIndex++}`}
          className={
            range.kind === "annotation"
              ? `annotation-mark annotation-${range.annotationKind ?? "note"}`
              : "search-mark"
          }
        >
          {marked}
        </mark>,
      );
      localCursor = localEnd;
    }

    if (localCursor < token.text.length) {
      nodes.push(renderInlineTokenPart(token, token.text.slice(localCursor), keyIndex++));
    }
    plainCursor = tokenEnd;
  }

  return nodes.length ? nodes : [plainText];
}

function tokenizeInline(value: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > cursor) tokens.push({ kind: "text", text: value.slice(cursor, match.index) });
    const token = match[0];
    if (token.startsWith("![")) {
      const image = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (image) tokens.push({ kind: "image", text: image[1], src: image[2] });
    } else if (token.startsWith("`")) {
      tokens.push({ kind: "code", text: token.slice(1, -1) });
    } else if (token.startsWith("**") || token.startsWith("__")) {
      tokens.push({ kind: "strong", text: token.slice(2, -2) });
    } else if (token.startsWith("*") || token.startsWith("_")) {
      tokens.push({ kind: "em", text: token.slice(1, -1) });
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) tokens.push({ kind: "link", text: link[1], href: link[2] });
    }
    cursor = match.index + token.length;
  }
  if (cursor < value.length) tokens.push({ kind: "text", text: value.slice(cursor) });
  return tokens;
}

function renderInlineTokenPart(token: InlineToken, text: string, key: number) {
  if (token.kind === "image" && token.src) {
    return <img key={key} className="doc-image" src={token.src} alt={token.text} loading="lazy" />;
  }
  if (!text) return null;
  if (token.kind === "code") return <code key={key}>{text}</code>;
  if (token.kind === "strong") return <strong key={key}>{text}</strong>;
  if (token.kind === "em") return <em key={key}>{text}</em>;
  if (token.kind === "link") {
    return (
      <a key={key} href={token.href} target="_blank" rel="noreferrer">
        {text}
      </a>
    );
  }
  return <span key={key}>{text}</span>;
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
  const pattern = /(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("![")) {
      const image = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (image) {
        nodes.push(
          <img key={`${token}-${match.index}`} className="doc-image" src={image[2]} alt={image[1]} loading="lazy" />,
        );
      }
    } else if (token.startsWith("`")) {
      nodes.push(<code key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") || token.startsWith("_")) {
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
    .map((cell) => cell.trim());
}

function sourceTypeLabel(sourceType: SourceType) {
  const labels: Record<SourceType, string> = {
    blank: "空白文档",
    "folder-file": "文件夹导入",
    "html-file": "HTML",
    "markdown-file": "Markdown",
  };
  return labels[sourceType];
}

function sanitizeImportedDocs(value: unknown): ImportedDoc[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ImportedDoc => {
      if (!item || typeof item !== "object") return false;
      const doc = item as Partial<ImportedDoc>;
      return (
        typeof doc.file === "string" &&
        doc.file.startsWith("local:") &&
        typeof doc.title === "string" &&
        typeof doc.markdown === "string" &&
        typeof doc.createdAt === "string"
      );
    })
    .map((doc) => ({
      ...doc,
      group: doc.group || "我的文档",
      sourceType: doc.sourceType ?? "markdown-file",
      updatedAt: doc.updatedAt ?? doc.createdAt,
    }))
    .slice(0, 100);
}

function dedupeImportedDocs(docs: ImportedDoc[]) {
  const seen = new Set<string>();
  const result: ImportedDoc[] = [];
  for (const doc of docs) {
    if (seen.has(doc.file)) continue;
    seen.add(doc.file);
    result.push(doc);
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function getRelativePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function htmlToMarkdown(
  html: string,
  fallbackName: string,
  assetMap = new Map<string, string>(),
  relativePath = fallbackName,
) {
  const documentValue = new DOMParser().parseFromString(html, "text/html");
  const title = documentValue.querySelector("title")?.textContent?.trim() || fallbackName;
  const body = documentValue.body;
  const lines: string[] = [];
  if (title) lines.push(`# ${title}`, "");

  const walk = (node: Element) => {
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "nav", "footer", "header", "noscript"].includes(tag)) return;
    if (tag === "svg") {
      const image = svgElementToMarkdown(node);
      if (image) lines.push(image, "");
      return;
    }
    if (node.classList.contains("figure")) {
      const svg = node.querySelector("svg");
      const caption = node.querySelector(".figure-caption")?.textContent?.trim() || "";
      if (svg) {
        const image = svgElementToMarkdown(svg, caption || "SVG 图示");
        if (image) lines.push(image, "");
        if (caption) lines.push(`*${caption}*`, "");
        return;
      }
    }
    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1));
      lines.push(`${"#".repeat(level)} ${inlineHtmlToMarkdown(node, assetMap, relativePath)}`, "");
      return;
    }
    if (tag === "img") {
      const image = imageElementToMarkdown(node, assetMap, relativePath);
      if (image) lines.push(image, "");
      return;
    }
    if (tag === "p") {
      const text = inlineHtmlToMarkdown(node, assetMap, relativePath);
      if (text) lines.push(text, "");
      return;
    }
    if (tag === "blockquote") {
      const text = inlineHtmlToMarkdown(node, assetMap, relativePath);
      if (text) lines.push(`> ${text}`, "");
      return;
    }
    if (tag === "pre") {
      lines.push("```", node.textContent?.replace(/\n+$/g, "") ?? "", "```", "");
      return;
    }
    if (tag === "ul" || tag === "ol") {
      Array.from(node.children).forEach((child, index) => {
        if (child.tagName.toLowerCase() !== "li") return;
        const marker = tag === "ol" ? `${index + 1}.` : "-";
        lines.push(`${marker} ${inlineHtmlToMarkdown(child, assetMap, relativePath)}`);
      });
      lines.push("");
      return;
    }
    if (tag === "table") {
      const rows = Array.from(node.querySelectorAll("tr")).map((row) =>
        Array.from(row.children).map((cell) => inlineHtmlToMarkdown(cell, assetMap, relativePath)),
      );
      if (rows.length) {
        lines.push(`| ${rows[0].join(" | ")} |`);
        lines.push(`| ${rows[0].map(() => "---").join(" | ")} |`);
        for (const row of rows.slice(1)) lines.push(`| ${row.join(" | ")} |`);
        lines.push("");
      }
      return;
    }
    Array.from(node.children).forEach(walk);
  };

  Array.from(body.children).forEach(walk);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() || `# ${fallbackName}\n\n${body.textContent?.trim() ?? ""}`;
}

function inlineHtmlToMarkdown(
  element: Element,
  assetMap = new Map<string, string>(),
  relativePath = "",
): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent?.replace(/\s+/g, " ") ?? "";
    if (!(node instanceof Element)) return "";
    const tag = node.tagName.toLowerCase();
    if (tag === "img") return imageElementToMarkdown(node, assetMap, relativePath);
    if (tag === "svg") return svgElementToMarkdown(node);
    const content = Array.from(node.childNodes).map(walk).join("").trim();
    if (!content) return "";
    if (tag === "strong" || tag === "b") return `**${content}**`;
    if (tag === "em" || tag === "i") return `*${content}*`;
    if (tag === "code") return `\`${content}\``;
    if (tag === "a") {
      const href = node.getAttribute("href");
      return href ? `[${content}](${href})` : content;
    }
    if (tag === "br") return "\n";
    return content;
  };
  return Array.from(element.childNodes).map(walk).join("").replace(/[ \t]+/g, " ").trim();
}

function svgElementToMarkdown(element: Element, alt = "SVG 图示") {
  const clone = element.cloneNode(true);
  if (!(clone instanceof Element)) return "";
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const svg = new XMLSerializer().serializeToString(clone);
  return `![${escapeMarkdownAlt(alt)}](data:image/svg+xml;base64,${base64EncodeUnicode(svg)})`;
}

function imageElementToMarkdown(
  element: Element,
  assetMap = new Map<string, string>(),
  relativePath = "",
) {
  const src = element.getAttribute("src") || element.getAttribute("data-src") || "";
  if (!src) return "";
  const alt = element.getAttribute("alt") || element.getAttribute("title") || "图片";
  return `![${escapeMarkdownAlt(alt)}](${resolveAssetSrc(src, assetMap, relativePath)})`;
}

function rewriteMarkdownImageSources(
  markdown: string,
  assetMap = new Map<string, string>(),
  relativePath = "",
) {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, src: string) => {
    return `![${alt}](${resolveAssetSrc(src.trim(), assetMap, relativePath)})`;
  });
}

async function createImageAssetMap(files: File[]) {
  const entries = await Promise.all(
    files.map(async (file) => {
      if (file.size > 12_000_000) return [];
      const relativePath = getRelativePath(file);
      const dataUrl = await fileToDataUrl(file);
      const keys = new Set<string>([
        normalizeAssetPath(relativePath),
        normalizeAssetPath(relativePath.split("/").slice(1).join("/")),
        normalizeAssetPath(file.name),
      ]);
      return Array.from(keys)
        .filter(Boolean)
        .map((key) => [key, dataUrl] as const);
    }),
  );
  return new Map(entries.flat());
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败。"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function base64EncodeUnicode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
}

function resolveAssetSrc(src: string, assetMap: Map<string, string>, relativePath: string) {
  const trimmed = src.trim();
  if (/^(data:|https?:|blob:)/i.test(trimmed)) return trimmed;
  const clean = normalizeAssetPath(trimmed.replace(/[?#].*$/, ""));
  const baseDir = normalizeAssetPath(relativePath).split("/").slice(0, -1).join("/");
  const candidates = [
    normalizeAssetPath(`${baseDir}/${clean}`),
    clean,
    normalizeAssetPath(clean.split("/").slice(1).join("/")),
    normalizeAssetPath(clean.split("/").pop() ?? clean),
  ];
  return candidates.map((key) => assetMap.get(key)).find(Boolean) ?? trimmed;
}

function normalizeAssetPath(value: string) {
  const decoded = decodeURIComponent(value).replace(/\\/g, "/");
  const parts: string[] = [];
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function escapeMarkdownAlt(value: string) {
  return value.replace(/[\[\]]/g, "");
}

function openLibraryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("当前浏览器不支持 IndexedDB。"));
      return;
    }
    const request = indexedDB.open(LIBRARY_DB_NAME, LIBRARY_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LIBRARY_STORE_NAME)) {
        db.createObjectStore(LIBRARY_STORE_NAME, { keyPath: "file" });
      }
    };
    request.onerror = () => reject(request.error ?? new Error("无法打开本地文档库。"));
    request.onsuccess = () => resolve(request.result);
  });
}

async function loadLibraryDocs() {
  const db = await openLibraryDb();
  return new Promise<ImportedDoc[]>((resolve, reject) => {
    const transaction = db.transaction(LIBRARY_STORE_NAME, "readonly");
    const request = transaction.objectStore(LIBRARY_STORE_NAME).getAll();
    request.onerror = () => reject(request.error ?? new Error("无法读取本地文档库。"));
    request.onsuccess = () => resolve(sanitizeImportedDocs(request.result));
    transaction.oncomplete = () => db.close();
  });
}

async function saveLibraryDocs(docs: ImportedDoc[]) {
  const db = await openLibraryDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(LIBRARY_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LIBRARY_STORE_NAME);
    for (const doc of docs) store.put(doc);
    transaction.onerror = () => reject(transaction.error ?? new Error("无法写入本地文档库。"));
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

async function deleteLibraryDoc(docFile: string) {
  const db = await openLibraryDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(LIBRARY_STORE_NAME, "readwrite");
    transaction.objectStore(LIBRARY_STORE_NAME).delete(docFile);
    transaction.onerror = () => reject(transaction.error ?? new Error("删除浏览器记录失败。"));
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

function extractTitleFromMarkdown(markdown: string, fallbackName: string) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  if (heading) return stripInline(heading[1]).slice(0, 80);
  return fallbackName.replace(/\.(md|markdown|txt|html|htm)$/i, "").slice(0, 80) || "未命名文档";
}

function normalizeListMarker(marker: string) {
  return marker.replace(/[.)]$/, ".");
}

interface PptExportInput {
  blocks: DocBlock[];
  markdown: string;
  title: string;
}

interface PptSection {
  title: string;
  chunks: PptChunk[];
}

type PptChunk =
  | { kind: "text"; text: string; tone?: "quote" | "code" | "table" }
  | { kind: "image"; alt: string; src: string };

const KSC_PPT = {
  accent: "E6002D",
  accent2: "F76727",
  dark: "202630",
  dark2: "171616",
  muted: "6E747A",
  pale: "E7E6E6",
  panel: "F8F9FA",
  white: "FFFFFF",
};

async function exportMarkdownAsPptx({ blocks, markdown, title }: PptExportInput) {
  const { default: PptxGen } = await import("pptxgenjs");
  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Margin Note Reader";
  pptx.company = "Margin Note Reader";
  pptx.subject = "Markdown / HTML 转 PPT";
  pptx.title = title;
  pptx.theme = {
    bodyFontFace: "Microsoft YaHei",
    headFontFace: "Microsoft YaHei",
  };

  const sections = createPptSections(blocks, title);
  addPptCover(pptx, title, markdown);
  addPptAgenda(pptx, sections);

  sections.forEach((section, sectionIndex) => {
    addPptSectionSlide(pptx, section.title, sectionIndex + 1);
    const textBatch: PptChunk[] = [];
    let batchChars = 0;

    const flush = () => {
      if (!textBatch.length) return;
      addPptContentSlide(pptx, section.title, textBatch, sectionIndex + 1);
      textBatch.length = 0;
      batchChars = 0;
    };

    section.chunks.forEach((chunk) => {
      if (chunk.kind === "image") {
        flush();
        addPptImageSlide(pptx, section.title, chunk, sectionIndex + 1);
        return;
      }
      const nextLength = chunk.text.length;
      if (textBatch.length >= 6 || batchChars + nextLength > 560) flush();
      textBatch.push(chunk);
      batchChars += nextLength;
    });
    flush();
  });

  const fileName = `${slugify(title) || "margin-note-reader"}.pptx`;
  await pptx.writeFile({ fileName, compression: true });
}

function createPptSections(blocks: DocBlock[], fallbackTitle: string) {
  const sections: PptSection[] = [];
  let current: PptSection = { title: fallbackTitle || "未命名文档", chunks: [] };

  const pushCurrent = () => {
    if (current.chunks.length) sections.push(current);
  };

  for (const block of blocks) {
    if (block.type === "heading" && (block.level ?? 1) <= 2) {
      pushCurrent();
      current = { title: stripInline(block.text || block.markdown), chunks: [] };
      continue;
    }

    const image = extractMarkdownImage(block.markdown);
    if (image) {
      current.chunks.push({ kind: "image", ...image });
      continue;
    }

    if (block.type === "list" && block.items?.length) {
      block.items.forEach((item) => {
        const text = cleanPptText(item.text);
        if (text) current.chunks.push({ kind: "text", text });
      });
      continue;
    }

    if (block.type === "table") {
      const rows = [block.header ?? [], ...(block.rows ?? [])]
        .filter((row) => row.some(Boolean))
        .map((row) => row.join(" / "));
      rows.slice(0, 6).forEach((row) => current.chunks.push({ kind: "text", text: cleanPptText(row), tone: "table" }));
      continue;
    }

    const text = cleanPptText(block.text);
    if (!text || block.type === "rule") continue;
    current.chunks.push({
      kind: "text",
      text,
      tone: block.type === "quote" ? "quote" : block.type === "code" ? "code" : undefined,
    });
  }

  pushCurrent();
  return sections.filter((section) => section.title || section.chunks.length).slice(0, 36);
}

function addPptCover(pptx: PptxGenJS, title: string, markdown: string) {
  const slide = pptx.addSlide();
  slide.background = { color: KSC_PPT.dark };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: KSC_PPT.dark }, line: { color: KSC_PPT.dark } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.72, y: 1.06, w: 0.1, h: 1.78, fill: { color: KSC_PPT.accent }, line: { color: KSC_PPT.accent } });
  slide.addText("Margin Note Reader", { x: 0.88, y: 0.62, w: 3.8, h: 0.24, fontFace: "Arial", fontSize: 8.5, color: KSC_PPT.pale, bold: true, charSpacing: 1.2 });
  slide.addText(truncatePptText(title, 54), { x: 0.88, y: 1.1, w: 9.8, h: 1.25, fontFace: "Microsoft YaHei", fontSize: 33, bold: true, color: KSC_PPT.white, breakLine: false, fit: "shrink" });
  slide.addText("Markdown / HTML 自动转 PPT", { x: 0.9, y: 2.65, w: 6.8, h: 0.4, fontFace: "Microsoft YaHei", fontSize: 15, color: KSC_PPT.accent2, bold: true });
  slide.addText(`共 ${Math.max(1, Math.round(markdown.length / 800))} 分钟阅读量 · ${new Date().toLocaleDateString("zh-CN")}`, { x: 0.9, y: 6.46, w: 7.4, h: 0.28, fontFace: "Microsoft YaHei", fontSize: 9.5, color: "C6CBD1" });
  slide.addShape(pptx.ShapeType.rect, { x: 10.52, y: 0, w: 2.82, h: 7.5, fill: { color: KSC_PPT.accent, transparency: 4 }, line: { color: KSC_PPT.accent } });
  slide.addShape(pptx.ShapeType.rect, { x: 10.03, y: 0.7, w: 2.36, h: 4.6, fill: { color: KSC_PPT.white, transparency: 86 }, line: { color: KSC_PPT.white, transparency: 100 } });
}

function addPptAgenda(pptx: PptxGenJS, sections: PptSection[]) {
  const slide = pptx.addSlide();
  addPptChrome(pptx, slide, "目录", "AGENDA");
  if (!sections.length) {
    slide.addText("当前文档还没有可转换的正文内容。", { x: 0.92, y: 1.6, w: 8.6, h: 0.42, fontFace: "Microsoft YaHei", fontSize: 16, color: KSC_PPT.muted });
    return;
  }
  sections.slice(0, 8).forEach((section, index) => {
    const y = 1.45 + index * 0.58;
    slide.addText(String(index + 1).padStart(2, "0"), { x: 0.9, y, w: 0.54, h: 0.24, fontFace: "Arial", fontSize: 12, color: KSC_PPT.accent, bold: true });
    slide.addText(truncatePptText(section.title, 34), { x: 1.55, y: y - 0.04, w: 9.8, h: 0.34, fontFace: "Microsoft YaHei", fontSize: 15, color: KSC_PPT.dark, bold: true });
    slide.addShape(pptx.ShapeType.line, { x: 1.55, y: y + 0.42, w: 10.7, h: 0, line: { color: KSC_PPT.pale, width: 0.8 } });
  });
}

function addPptSectionSlide(pptx: PptxGenJS, title: string, index: number) {
  const slide = pptx.addSlide();
  slide.background = { color: KSC_PPT.dark };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: KSC_PPT.dark }, line: { color: KSC_PPT.dark } });
  slide.addText(String(index).padStart(2, "0"), { x: 0.86, y: 1.08, w: 1.38, h: 0.72, fontFace: "Arial", fontSize: 31, bold: true, color: KSC_PPT.accent });
  slide.addShape(pptx.ShapeType.line, { x: 0.9, y: 2.06, w: 2.25, h: 0, line: { color: KSC_PPT.accent, width: 3 } });
  slide.addText(truncatePptText(title, 46), { x: 0.88, y: 2.42, w: 10.4, h: 1.0, fontFace: "Microsoft YaHei", fontSize: 29, bold: true, color: KSC_PPT.white, fit: "shrink" });
  slide.addText("章节概要", { x: 0.94, y: 6.44, w: 2.2, h: 0.22, fontFace: "Microsoft YaHei", fontSize: 9.5, color: "CED4DA" });
}

function addPptContentSlide(pptx: PptxGenJS, title: string, chunks: PptChunk[], sectionIndex: number) {
  const slide = pptx.addSlide();
  addPptChrome(pptx, slide, title, String(sectionIndex).padStart(2, "0"));
  slide.addShape(pptx.ShapeType.rect, { x: 0.82, y: 1.42, w: 11.72, h: 4.95, fill: { color: KSC_PPT.panel }, line: { color: KSC_PPT.pale, transparency: 8 } });
  chunks.forEach((chunk, index) => {
    if (chunk.kind !== "text") return;
    const y = 1.74 + index * 0.72;
    const isQuote = chunk.tone === "quote";
    const isCode = chunk.tone === "code";
    slide.addShape(pptx.ShapeType.rect, { x: 1.12, y: y + 0.09, w: 0.12, h: 0.12, fill: { color: isQuote ? KSC_PPT.accent2 : KSC_PPT.accent }, line: { color: isQuote ? KSC_PPT.accent2 : KSC_PPT.accent } });
    slide.addText(truncatePptText(chunk.text, isCode ? 86 : 74), {
      x: 1.42,
      y: y - 0.02,
      w: 10.3,
      h: 0.47,
      fontFace: isCode ? "JetBrains Mono" : "Microsoft YaHei",
      fontSize: isCode ? 11 : 14,
      color: isQuote ? KSC_PPT.muted : KSC_PPT.dark,
      breakLine: false,
      fit: "shrink",
    });
  });
  addPptFooter(pptx, slide);
}

function addPptImageSlide(pptx: PptxGenJS, title: string, chunk: Extract<PptChunk, { kind: "image" }>, sectionIndex: number) {
  const slide = pptx.addSlide();
  addPptChrome(pptx, slide, title, String(sectionIndex).padStart(2, "0"));
  slide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 1.38, w: 11.5, h: 4.85, fill: { color: KSC_PPT.white }, line: { color: KSC_PPT.pale } });
  if (chunk.src.startsWith("data:image/")) {
    try {
      slide.addImage({ data: chunk.src, x: 1.24, y: 1.62, w: 10.82, h: 4.25, altText: chunk.alt || "文档图片" });
    } catch {
      addPptImagePlaceholder(pptx, slide, chunk.alt);
    }
  } else {
    addPptImagePlaceholder(pptx, slide, chunk.alt || chunk.src);
  }
  if (chunk.alt) {
    slide.addText(truncatePptText(chunk.alt, 72), { x: 1.16, y: 6.02, w: 10.8, h: 0.24, fontFace: "Microsoft YaHei", fontSize: 9, color: KSC_PPT.muted, align: "center" });
  }
  addPptFooter(pptx, slide);
}

function addPptImagePlaceholder(pptx: PptxGenJS, slide: PptxGenJS.Slide, label: string) {
  slide.addShape(pptx.ShapeType.rect, { x: 1.55, y: 2.15, w: 9.95, h: 2.72, fill: { color: "FFF4F4" }, line: { color: KSC_PPT.accent, transparency: 35 } });
  slide.addText(`图片资源未内嵌\n${truncatePptText(label, 80)}`, { x: 1.82, y: 2.92, w: 9.4, h: 0.78, fontFace: "Microsoft YaHei", fontSize: 14, color: KSC_PPT.accent, align: "center", breakLine: false });
}

function addPptChrome(pptx: PptxGenJS, slide: PptxGenJS.Slide, title: string, marker: string) {
  slide.background = { color: KSC_PPT.white };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.18, fill: { color: KSC_PPT.accent }, line: { color: KSC_PPT.accent } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.18, w: 13.333, h: 0.18, fill: { color: KSC_PPT.dark }, line: { color: KSC_PPT.dark } });
  slide.addText(marker, { x: 0.82, y: 0.55, w: 0.75, h: 0.28, fontFace: "Arial", fontSize: 11, color: KSC_PPT.accent, bold: true });
  slide.addText(truncatePptText(title, 42), { x: 1.58, y: 0.46, w: 9.5, h: 0.46, fontFace: "Microsoft YaHei", fontSize: 21, bold: true, color: KSC_PPT.dark, fit: "shrink" });
  slide.addShape(pptx.ShapeType.line, { x: 0.84, y: 1.15, w: 11.72, h: 0, line: { color: KSC_PPT.pale, width: 0.8 } });
}

function addPptFooter(pptx: PptxGenJS, slide: PptxGenJS.Slide) {
  slide.addShape(pptx.ShapeType.line, { x: 0.84, y: 6.82, w: 11.72, h: 0, line: { color: KSC_PPT.pale, width: 0.6 } });
  slide.addText("Margin Note Reader · PPTX Export", { x: 0.86, y: 6.96, w: 4.2, h: 0.18, fontFace: "Arial", fontSize: 7.5, color: KSC_PPT.muted });
}

function extractMarkdownImage(value: string) {
  const match = value.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (!match) return null;
  return { alt: match[1], src: match[2].trim() };
}

function cleanPptText(value: string) {
  return stripInline(value)
    .replace(/\s+/g, " ")
    .replace(/[•●▪]/g, "")
    .trim();
}

function truncatePptText(value: string, maxLength: number) {
  const text = cleanPptText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function annotationLabel(kind: AnnotationKind) {
  const labels: Record<AnnotationKind, string> = {
    ai: "AI 笔记",
    bookmark: "收藏",
    citation: "引用",
    definition: "定义",
    highlight: "重点",
    important: "重要",
    note: "笔记",
    question: "问题",
    revisit: "回看",
    term: "概念卡",
  };
  return labels[kind];
}

function stripInline(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

function slugifyId(value: string) {
  const slug = slugify(stripInline(value));
  return slug || "section";
}

function nextCountedId(baseId: string, counts: Map<string, number>) {
  const count = counts.get(baseId) ?? 0;
  counts.set(baseId, count + 1);
  return count ? `${baseId}-${count + 1}` : baseId;
}

function createLegacyBlockId(
  blockHeadingPath: string[],
  textValue: string,
  markdownValue: string,
  counts: Map<string, number>,
) {
  const seed = `${blockHeadingPath.join("/")}|${textValue}|${markdownValue}`;
  const baseId = `b-${hashString(seed)}`;
  const count = counts.get(baseId) ?? 0;
  counts.set(baseId, count + 1);
  return count ? `${baseId}-${count}` : baseId;
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
