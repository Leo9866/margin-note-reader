import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
};
declare const fetch: (input: string, init?: unknown) => Promise<any>;
declare const AbortController: {
  new (): { signal: unknown; abort: () => void };
};
declare const setTimeout: (handler: () => void, timeout?: number) => unknown;
declare const clearTimeout: (timeoutId: unknown) => void;
declare const TextDecoder: {
  new (): { decode: (input?: any, options?: { stream?: boolean }) => string };
};
declare const URL: {
  new (input: string, base?: string): {
    href: string;
    protocol: string;
    hostname: string;
    pathname: string;
  };
};

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com";
const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_REASONING_EFFORT = "xhigh";
const DEFAULT_TRANSLATION_REASONING_EFFORT = "minimal";
const MAX_FETCHED_HTML_BYTES = 8_000_000;
const FETCH_URL_TIMEOUT_MS = 15_000;
const MAX_TRANSLATE_MARKDOWN_CHARS = 120_000;
const TRANSLATE_CHUNK_CHARS = 4_000;
const TRANSLATE_MAX_CHUNKS = 36;
const TRANSLATE_RETRY_COUNT = 2;

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };

  return {
    server: {
      allowedHosts: ["reader.youbeat.cn"],
    },
    preview: {
      allowedHosts: ["reader.youbeat.cn"],
    },
    plugins: [
      react(),
      {
        name: "margin-note-ai-api",
        configureServer(server) {
          server.middlewares.use("/api/ai", async (request, response) => {
            await handleAiRequest(request, response, env);
          });
          server.middlewares.use("/api/fetch-url", async (request, response) => {
            await handleFetchUrlRequest(request, response);
          });
          server.middlewares.use("/api/translate", async (request, response) => {
            await handleTranslateRequest(request, response, env);
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use("/api/ai", async (request, response) => {
            await handleAiRequest(request, response, env);
          });
          server.middlewares.use("/api/fetch-url", async (request, response) => {
            await handleFetchUrlRequest(request, response);
          });
          server.middlewares.use("/api/translate", async (request, response) => {
            await handleTranslateRequest(request, response, env);
          });
        },
      },
    ],
  };
});

async function handleFetchUrlRequest(request: any, response: any) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "只支持 POST 请求。" });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_URL_TIMEOUT_MS);

  try {
    const payload = await readJsonBody(request);
    const targetUrl = normalizeFetchTargetUrl(String(payload.url ?? ""));
    const upstream = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
        "User-Agent": "MarginNoteReader/0.1 (+https://github.com/Leo9866/margin-note-reader)",
      },
    });

    const contentLength = Number(upstream.headers?.get?.("content-length") ?? "0");
    if (contentLength > MAX_FETCHED_HTML_BYTES) {
      sendJson(response, 413, { error: "网页内容超过 8MB，暂不适合直接导入。" });
      return;
    }

    const contentType = String(upstream.headers?.get?.("content-type") ?? "");
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
      sendJson(response, 415, { error: `当前 URL 返回的不是 HTML/文本内容：${contentType}` });
      return;
    }

    const html = await upstream.text();
    if (!upstream.ok) {
      sendJson(response, upstream.status, { error: `网页读取失败：HTTP ${upstream.status}` });
      return;
    }
    if (html.length > MAX_FETCHED_HTML_BYTES) {
      sendJson(response, 413, { error: "网页内容超过 8MB，暂不适合直接导入。" });
      return;
    }

    sendJson(response, 200, {
      url: targetUrl,
      finalUrl: upstream.url || targetUrl,
      contentType,
      html,
    });
  } catch (error) {
    sendJson(response, 400, {
      error: getFetchUrlErrorMessage(error),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeFetchTargetUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("请输入 URL。");
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("只支持 http 或 https URL。");
  }
  if (!url.hostname) throw new Error("URL 缺少域名。");
  return url.href;
}

function getFetchUrlErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "网页读取超时，请稍后重试。";
    if (error.message === "fetch failed" || error.message === "Failed to fetch") {
      return "无法读取这个 URL。请确认地址可访问，且目标站点允许服务端抓取。";
    }
    if (error.message.trim()) return error.message;
  }
  return "URL 导入失败。";
}

async function handleTranslateRequest(request: any, response: any, env: Record<string, string | undefined>) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "只支持 POST 请求。" });
    return;
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, {
      error: "缺少 OPENAI_API_KEY。请在启动开发服务时通过环境变量提供模型密钥。",
    });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const markdown = String(payload.markdown ?? "").trim();
    const title = String(payload.title ?? "网页文档").trim() || "网页文档";
    const sourceUrl = String(payload.sourceUrl ?? "").trim();
    if (!markdown) {
      sendJson(response, 400, { error: "没有可翻译的文档内容。" });
      return;
    }
    if (markdown.length > MAX_TRANSLATE_MARKDOWN_CHARS) {
      sendJson(response, 413, { error: "文档超过 120000 字符，当前自动翻译暂不适合处理这么长的网页。" });
      return;
    }

    const chunks = chunkMarkdownForTranslation(markdown, TRANSLATE_CHUNK_CHARS);
    if (chunks.length > TRANSLATE_MAX_CHUNKS) {
      sendJson(response, 413, { error: "文档分段过多，当前自动翻译暂不适合处理这么长的网页。" });
      return;
    }

    const baseUrl = normalizeBaseUrl(env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL);
    const model = env.OPENAI_TRANSLATION_MODEL ?? env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
    const reasoningEffort =
      env.OPENAI_TRANSLATION_REASONING_EFFORT ?? DEFAULT_TRANSLATION_REASONING_EFFORT;
    const translatedChunks: string[] = [];
    for (let index = 0; index < chunks.length; index += 1) {
      translatedChunks.push(
        await translateMarkdownChunk({
          apiKey,
          baseUrl,
          chunk: chunks[index],
          index,
          model,
          reasoningEffort,
          sourceUrl,
          title,
          total: chunks.length,
        }),
      );
    }

    const translatedMarkdown = translatedChunks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    sendJson(response, 200, {
      chunks: chunks.length,
      markdown: translatedMarkdown,
      title: extractMarkdownTitle(translatedMarkdown, `${title} 中文翻译`),
    });
  } catch (error) {
    sendJson(response, 500, {
      error: getUpstreamErrorMessage(error, env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL),
    });
  }
}

async function translateMarkdownChunk({
  apiKey,
  baseUrl,
  chunk,
  index,
  model,
  reasoningEffort,
  sourceUrl,
  title,
  total,
}: {
  apiKey: string;
  baseUrl: string;
  chunk: string;
  index: number;
  model: string;
  reasoningEffort: string;
  sourceUrl: string;
  title: string;
  total: number;
}) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= TRANSLATE_RETRY_COUNT; attempt += 1) {
    const upstream = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: buildTranslationInstructions(),
        input: buildTranslationInput({ chunk, index, sourceUrl, title, total }),
        reasoning: { effort: reasoningEffort },
        store: false,
        stream: true,
        max_output_tokens: 6000,
      }),
    });

    if (!upstream.ok) {
      const result = await upstream.json().catch(() => null);
      lastError = new Error(
        extractErrorMessage(result) || `翻译第 ${index + 1}/${total} 段失败：HTTP ${upstream.status}`,
      );
      if (attempt < TRANSLATE_RETRY_COUNT && isRetryableStatus(upstream.status)) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw lastError;
    }

    const translated = cleanTranslatedMarkdown(await readResponseOutputText(upstream));
    if (translated) return translated;
    lastError = new Error(`模型返回了空翻译：第 ${index + 1}/${total} 段。`);
    if (attempt < TRANSLATE_RETRY_COUNT) {
      await sleep(800 * (attempt + 1));
      continue;
    }
  }

  throw lastError ?? new Error(`翻译第 ${index + 1}/${total} 段失败。`);
}

function isRetryableStatus(status: number) {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(undefined), ms);
  });
}

async function readResponseOutputText(upstream: any) {
  const contentType = upstream.headers?.get?.("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !upstream.body) {
    const result = await upstream.json().catch(() => null);
    return extractOutputText(result);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const eventText of events) {
      const event = parseSseEvent(eventText);
      if (!event.data || event.data === "[DONE]") continue;
      const parsed = safeJsonParse(event.data);
      if (!parsed) continue;
      const error = extractErrorMessage(parsed);
      if (error && event.event.includes("error")) throw new Error(error);
      const delta = extractStreamDelta(event.event, parsed);
      if (delta) chunks.push(delta);
    }
  }

  if (buffer.trim()) {
    const event = parseSseEvent(buffer);
    const parsed = safeJsonParse(event.data);
    if (parsed) {
      const error = extractErrorMessage(parsed);
      if (error && event.event.includes("error")) throw new Error(error);
      const delta = extractStreamDelta(event.event, parsed);
      if (delta) chunks.push(delta);
    }
  }

  return chunks.join("").trim();
}

function buildTranslationInstructions() {
  return [
    "你是专业的英文到简体中文技术文档翻译器。",
    "请把用户提供的 Markdown 原文完整翻译成自然、准确、适合阅读笔记的简体中文。",
    "必须保留 Markdown 结构：标题层级、列表、表格、引用、链接、图片、代码块和分隔线。",
    "不要总结，不要省略，不要添加原文没有的解释，不要输出寒暄。",
    "代码块、URL、图片地址、变量名、API 名称、模型名、文件名保持原样。",
    "关键英文术语可以在中文后用括号保留英文，例如：工作流（workflows）。",
    "只输出翻译后的 Markdown，不要用代码围栏包裹整篇结果。",
  ].join("\n");
}

function buildTranslationInput({
  chunk,
  index,
  sourceUrl,
  title,
  total,
}: {
  chunk: string;
  index: number;
  sourceUrl: string;
  title: string;
  total: number;
}) {
  return [
    `文档标题：${title}`,
    sourceUrl ? `来源 URL：${sourceUrl}` : "",
    `当前分段：${index + 1} / ${total}`,
    "",
    "请翻译下面的 Markdown 分段：",
    "",
    chunk,
  ]
    .filter(Boolean)
    .join("\n");
}

function chunkMarkdownForTranslation(markdown: string, maxChars: number) {
  const chunks: string[] = [];
  const current: string[] = [];
  let currentLength = 0;
  let inFence = false;

  const flush = () => {
    const value = current.join("\n").trim();
    if (value) chunks.push(value);
    current.length = 0;
    currentLength = 0;
  };

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();
    const isFence = /^```/.test(trimmed);
    const isHeading = /^#{1,3}\s+/.test(trimmed);
    const lineLength = line.length + 1;

    if (
      currentLength > 0 &&
      !inFence &&
      currentLength + lineLength > maxChars &&
      (isHeading || currentLength > maxChars * 0.82)
    ) {
      flush();
    }

    current.push(line);
    currentLength += lineLength;
    if (isFence) inFence = !inFence;

    if (currentLength > maxChars * 1.3 && !inFence) flush();
  }

  flush();
  return chunks;
}

function cleanTranslatedMarkdown(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

function extractMarkdownTitle(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return (heading?.[1] || fallback).replace(/[*_`]/g, "").trim().slice(0, 80) || fallback;
}

async function handleAiRequest(request: any, response: any, env: Record<string, string | undefined>) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "只支持 POST 请求。" });
    return;
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, {
      error: "缺少 OPENAI_API_KEY。请在启动开发服务时通过环境变量提供模型密钥。",
    });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const baseUrl = normalizeBaseUrl(env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL);
    const model = env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
    const reasoningEffort = env.OPENAI_REASONING_EFFORT ?? DEFAULT_REASONING_EFFORT;
    const upstream = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: buildInstructions(),
        input: buildInput(payload),
        reasoning: { effort: reasoningEffort },
        store: false,
        stream: true,
        max_output_tokens: 1800,
      }),
    });

    if (!upstream.ok) {
      const result = await upstream.json().catch(() => null);
      sendJson(response, upstream.status, {
        error: extractErrorMessage(result) || `模型请求失败：HTTP ${upstream.status}`,
      });
      return;
    }

    await streamAiResponse(upstream, response, model);
  } catch (error) {
    sendJson(response, 500, {
      error: getUpstreamErrorMessage(error, env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL),
    });
  }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function buildInstructions() {
  return [
    "你是 Margin Note Reader 的中文 AI 阅读边栏，帮助用户学习长文档、课程材料、技术文档和方案资料。",
    "你的回答必须基于用户给出的当前选区、当前章节和已有笔记，不要编造未提供的源码细节。",
    "回答要短、准、可复习。优先使用中文，保留必要英文术语。不要输出一整段长文本。",
    "不要展示隐藏推理链或逐 token 思考。你可以展示可复核的“思路摘要”，说明你抓住了哪些上下文、如何判断、依据来自哪里。",
    "固定使用 Markdown 输出，并严格遵守这个结构：",
    "### 思路摘要\n- 我先定位：...\n- 我再判断：...\n- 因此结论是：...",
    "### 回答\n用 2-4 条要点回答用户问题。",
    "### 依据\n- 引用或转述当前选区/章节中的关键线索。",
    "### 可继续追问\n- 给 2-3 个下一步问题。",
    "如果用户要求概念卡，把“回答”部分写成：定义 / 为什么重要 / 关联层或文件 / 复习问题。",
  ].join("\n");
}

async function streamAiResponse(upstream: any, response: any, model: string) {
  const contentType = upstream.headers?.get?.("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !upstream.body) {
    const result = await upstream.json().catch(() => null);
    writeSseHeaders(response);
    writeSse(response, "delta", { text: extractOutputText(result) });
    writeSse(response, "done", { model, usage: result?.usage ?? null });
    response.end();
    return;
  }

  writeSseHeaders(response);

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: unknown = null;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const eventText of events) {
        const event = parseSseEvent(eventText);
        if (!event.data || event.data === "[DONE]") continue;
        const parsed = safeJsonParse(event.data);
        if (!parsed) continue;
        const delta = extractStreamDelta(event.event, parsed);
        if (delta) writeSse(response, "delta", { text: delta });
        if (parsed.usage) usage = parsed.usage;
      }
    }
    if (buffer.trim()) {
      const event = parseSseEvent(buffer);
      const parsed = safeJsonParse(event.data);
      const delta = parsed ? extractStreamDelta(event.event, parsed) : "";
      if (delta) writeSse(response, "delta", { text: delta });
      if (parsed?.usage) usage = parsed.usage;
    }
    writeSse(response, "done", { model, usage });
  } catch (error) {
    writeSse(response, "error", {
      error: error instanceof Error ? error.message : "流式响应读取失败。",
    });
  } finally {
    response.end();
  }
}

function buildInput(payload: any) {
  const notes = Array.isArray(payload.notes) ? payload.notes.slice(0, 12) : [];
  const selectedText = String(payload.selectedText ?? "").slice(0, 12000);
  const sectionMarkdown = String(payload.sectionMarkdown ?? "").slice(0, 80000);
  return [
    `动作：${String(payload.mode ?? "")}`,
    `用户问题或指令：${String(payload.prompt ?? "")}`,
    `文档标题：${String(payload.docTitle ?? "")}`,
    `章节标题：${String(payload.sectionTitle ?? "")}`,
    "",
    "当前选区：",
    selectedText || "（无选区，使用当前章节）",
    "",
    "当前章节 Markdown：",
    sectionMarkdown,
    "",
    "用户已有笔记：",
    notes.length ? notes.map((note: string, index: number) => `${index + 1}. ${note}`).join("\n") : "（暂无）",
  ].join("\n");
}

function extractOutputText(result: any) {
  if (typeof result?.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }
  const chunks: string[] = [];
  for (const item of result?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim() || "模型返回了空内容。";
}

function parseSseEvent(value: string) {
  let event = "message";
  const data: string[] = [];
  for (const line of value.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return { event, data: data.join("\n") };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractStreamDelta(eventName: string, value: any) {
  if (typeof value?.delta === "string") return value.delta;
  if (typeof value?.text === "string" && eventName.includes("delta")) return value.text;
  if (typeof value?.output_text === "string" && eventName.includes("delta")) {
    return value.output_text;
  }
  if (typeof value?.content?.[0]?.text === "string" && eventName.includes("delta")) {
    return value.content[0].text;
  }
  return "";
}

function extractErrorMessage(result: any) {
  return result?.error?.message || result?.message || null;
}

function getUpstreamErrorMessage(error: unknown, baseUrl: string) {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message === "fetch failed" || message === "Failed to fetch") {
      return `无法连接模型服务：${normalizeBaseUrl(baseUrl)}。请检查网络、OPENAI_BASE_URL 或代理配置。`;
    }
    if (message) return message;
  }
  return "模型请求失败。";
}

function readJsonBody(request: any) {
  return new Promise<any>((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk: any) => {
      raw += chunk.toString("utf8");
      if (raw.length > 2_000_000) {
        reject(new Error("请求内容过大。"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("请求 JSON 格式无效。"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response: any, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function writeSseHeaders(response: any) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders?.();
}

function writeSse(response: any, event: string, data: unknown) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}
