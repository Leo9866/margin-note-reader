# Margin Note Reader

Margin Note Reader 是一个面向长文档学习的 AI 阅读工作台。它把 Markdown 文档、目录导航、选区解释、学习笔记、收藏、高亮和上下文问答放在同一个界面里，适合阅读论文、技术架构文档、课程讲义和项目手册。

项目最初来自对 Hermes Agent 技术文档的学习需求：长文档不应该只是“能打开”，还应该能在阅读过程中沉淀理解、追问概念、整理摘要，并把关键上下文留在本地。

## 特性

- 中文阅读界面：侧边目录、正文阅读区、AI 边栏、学习笔记全部以中文体验为主。
- Markdown 文档阅读：默认加载 `public/docs` 下的文档，也可以替换成自己的资料。
- 本地优先笔记：高亮、收藏、笔记和 AI 回答沉淀保存在浏览器 `localStorage`。
- 上下文 AI 问答：只在点击 AI 操作时发送当前文档、选区和笔记上下文。
- 流式回答：AI 内容会边生成边显示，降低等待时的卡顿感。
- 可调阅读布局：右侧学习边栏可拖拽调整宽度，适合不同屏幕和阅读习惯。
- OpenAI Responses API：通过 Vite 开发/预览服务代理调用，密钥不会暴露到前端代码里。

## 快速开始

要求：

- Node.js 22 或更高版本
- npm
- 一个 OpenAI 或 OpenAI-compatible Responses API 密钥

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```bash
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-5.4
OPENAI_REASONING_EFFORT=xhigh
```

如果你使用兼容 OpenAI Responses API 的网关，可以把 `OPENAI_BASE_URL` 改成自己的服务地址。项目会自动补齐 `/v1` 路径。

启动开发服务：

```bash
npm run dev
```

然后打开终端显示的本地地址，通常是：

```text
http://127.0.0.1:5173
```

## 常用脚本

```bash
npm run dev
npm run build
npm run preview
```

- `dev`：启动本地开发服务。
- `build`：执行 TypeScript 检查并构建生产产物。
- `preview`：本地预览生产构建，仍会提供 `/api/ai` 代理。

## 导入自己的文档

默认文档位于 `public/docs`。你可以直接替换或新增 Markdown 文件，然后在 `src/App.tsx` 的文档清单里加入对应文件名、标题和分组。

目前应用把文档当作静态资源加载，适合公开资料、课程资料或你有权使用的内部学习资料。开源发布前，请确认仓库中包含的文档内容具备相应授权。

## AI 工作方式

前端不会直接持有模型密钥。浏览器只把用户当前触发的上下文发送到本地 Vite 中间件：

- 用户问题或快捷动作
- 当前文档标题和章节标题
- 当前选区或当前章节 Markdown
- 已沉淀的最近笔记

服务端中间件再调用 Responses API，并以 Server-Sent Events 形式把增量回答返回前端。

## 数据存储

当前版本使用浏览器 `localStorage` 保存阅读沉淀，包括：

- 手写笔记
- 高亮段落
- 收藏段落
- AI 回答卡片
- 阅读偏好和右侧边栏宽度

这意味着同一浏览器刷新页面不会清空数据；但更换浏览器、清理站点数据或切换域名/端口可能看不到原来的内容。后续可以扩展为 IndexedDB、文件导出或云端同步。

## 安全说明

- 不要提交 `.env.local`、真实 API Key 或任何私密文档。
- `.env.local.example` 只保留占位配置。
- AI 请求默认设置 `store: false`，避免将请求用于响应存储。
- 如果你曾经把密钥贴到公开聊天、Issue 或仓库历史中，建议立即轮换密钥。

## 路线图

- 文档清单自动发现和批量导入
- 笔记导出为 Markdown / PDF
- 多文档语义检索
- AI 概念卡和复习卡片管理
- IndexedDB 持久化与备份恢复
- 多主题和更细粒度阅读排版设置

## 贡献

欢迎提交 Issue 和 Pull Request。开始之前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

本项目代码基于 [MIT License](./LICENSE) 开源。
