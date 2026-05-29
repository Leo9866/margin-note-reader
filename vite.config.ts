import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
};
declare const fetch: (input: string, init?: unknown) => Promise<any>;
declare const TextDecoder: {
  new (): { decode: (input?: any, options?: { stream?: boolean }) => string };
};

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com";
const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_REASONING_EFFORT = "xhigh";

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
        },
        configurePreviewServer(server) {
          server.middlewares.use("/api/ai", async (request, response) => {
            await handleAiRequest(request, response, env);
          });
        },
      },
    ],
  };
});

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
