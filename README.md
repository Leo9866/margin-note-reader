# Margin Note Reader

Margin Note Reader 是一个面向长文档学习的 AI 阅读工作台。它把 Markdown 文档、目录导航、选区解释、学习笔记、收藏、高亮和上下文问答放在同一个界面里，适合阅读论文、技术架构文档、课程讲义和项目手册。

这个项目关注一个更通用的问题：长文档不应该只是“能打开”，还应该能在阅读过程中沉淀理解、追问概念、整理摘要，并把关键上下文留在本地。

## 特性

- 中文阅读界面：侧边目录、正文阅读区、AI 边栏、学习笔记全部以中文体验为主。
- 工作区首页：可以新建空白文档、打开文件、打开文件夹、打开 URL。
- Markdown 文档阅读：默认从空白文档库开始，可以导入自己的资料。
- PDF / PPT 正文提取：导入 PDF、PPTX 和旧版 PPT 后会尽量提取文本并转换为可阅读的 Markdown。
- 源文编辑保存：用户新建或导入的文档可以直接编辑 Markdown 源文并保存回本地文档库。
- 本地优先文档库：用户创建和导入的文档保存在浏览器 IndexedDB。
- 本地优先笔记：高亮、收藏、笔记和 AI 回答沉淀保存在浏览器本地。
- 上下文 AI 问答：只在点击 AI 操作时发送当前文档、选区和笔记上下文。
- 流式回答：AI 内容会边生成边显示，降低等待时的卡顿感。
- 可调阅读布局：右侧学习边栏可拖拽调整宽度，适合不同屏幕和阅读习惯。
- HTML 下载：网页 URL 和 HTML 来源会保留原始 HTML，可从阅读工作台直接下载。
- URL 英文文档自动翻译：当 URL 导入内容被识别为全英文文档时，工具栏会显示自动翻译入口，生成一份中文翻译版文档。
- OpenAI Responses API：通过 Vite 开发/预览服务代理调用，密钥不会暴露到前端代码里。

## 快速开始

要求：

- Node.js 20.19 或更高版本
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
npm run preview:server
```

- `dev`：启动本地开发服务。
- `build`：执行 TypeScript 检查并构建生产产物。
- `preview`：本地预览生产构建，仍会提供 `/api/ai` 代理。
- `preview:server`：在 `127.0.0.1:3001` 运行生产预览，便于 PM2 和 nginx 反向代理。

## 部署

项目内置了 PM2 与 nginx 示例配置，适合把应用作为独立子站部署到 `reader.youbeat.cn`。完整步骤见 [deploy/README.md](./deploy/README.md)。

## 导入自己的文档

打开应用后会先进入工作区首页。你可以：

- 新建空白 Markdown 文档。
- 打开文件：支持 `.md`、`.markdown`、`.txt`、`.html`、`.htm`、`.pdf`、`.ppt`、`.pptx`、`.url`、`.webloc`。
- 选择一个本地文件夹并批量导入其中的 Markdown、纯文本、HTML、PDF、PPT 和云文档快捷文件。
- 打开 `.html` / `.htm` 文件时，应用会提取正文结构、图片、内联 SVG 图示、链接等内容并转换为 Markdown 阅读。
- 输入一个 `http` / `https` URL，应用会通过本地 Vite 代理抓取网页 HTML，转换为 Markdown 后直接放入当前阅读工作台。

用户新建和导入的文档可以点击顶部 **编辑源文** 进入 Markdown 源文编辑模式；保存后会重新生成目录和阅读块，并写回 IndexedDB。

打开 URL 或 HTML 来源后，可以点击顶部 **下载 HTML** 下载保留下来的原始 HTML；其他 Markdown 文档也可以下载为一个简单 HTML 备份页。

如果 URL 文档正文基本全是英文，顶部会额外显示 **自动翻译**。点击后应用会通过本地 Vite 代理调用模型，把当前 Markdown 文档翻译为简体中文，并作为新的本地文档打开；原始英文网页文档仍会保留在文档库中。中文或中英混合网页不会展示这个入口。

用户文档旁的删除操作只会移除浏览器本地文档库里的记录，以及该文档关联的本地笔记和 AI 沉淀；不会删除电脑上的原始文件。

如果 HTML 或 Markdown 使用相对路径引用本地图片，建议通过 **打开文件夹** 导入，这样应用可以同时读取图片资源并内嵌到本地文档库中。HTML 中直接写在页面里的 SVG 图示会自动转成内嵌图片保存。通过 URL 导入时，相对链接和图片会按网页最终地址解析为绝对地址。

PDF 会按页提取可复制文字，PPTX 会按幻灯片提取文本，旧版 `.ppt` 会尽力从二进制内容里抽取可读文字；这些内容都会转换为可直接阅读、选区和笔记的 Markdown。云文档快捷文件会保存云文档地址，便于和笔记、AI 沉淀放在同一个本地文档库里。

项目默认不会加载任何内置资料，适合作为空白阅读工作台开始。你可以通过工作区首页导入自己的 Markdown、纯文本、HTML、PDF、PPT 或云文档资料。

目前本地导入依赖浏览器文件选择能力。开源发布或分发资料前，请确认仓库中包含的文档内容具备相应授权。

## AI 工作方式

前端不会直接持有模型密钥。浏览器只把用户当前触发的上下文发送到本地 Vite 中间件：

- 用户问题或快捷动作
- 当前文档标题和章节标题
- 当前选区或当前章节 Markdown
- 已沉淀的最近笔记

服务端中间件再调用 Responses API，并以 Server-Sent Events 形式把增量回答返回前端。

URL 英文文档自动翻译也走同一个本地 Vite 代理和 Responses API 密钥。默认使用 `OPENAI_MODEL`，也可以通过 `OPENAI_TRANSLATION_MODEL` 单独指定翻译模型。

## 数据存储

当前版本使用浏览器本地存储：

- IndexedDB 保存用户创建和导入的文档正文。
- `localStorage` 保存轻量偏好和阅读沉淀。

阅读沉淀包括：

- 手写笔记
- 高亮段落
- 收藏段落
- AI 回答卡片
- 阅读偏好和右侧边栏宽度

这意味着同一浏览器刷新页面不会清空数据；但更换浏览器、清理站点数据或切换域名/端口可能看不到原来的内容。后续可以扩展为文档库导出、备份恢复或云端同步。

## 安全说明

- 不要提交 `.env.local`、真实 API Key 或任何私密文档。
- `.env.local.example` 只保留占位配置。
- AI 请求默认设置 `store: false`，避免将请求用于响应存储。
- 如果你曾经把密钥贴到公开聊天、Issue 或仓库历史中，建议立即轮换密钥。

## 路线图

- 文档库导出、备份和恢复
- 笔记导出为 Markdown / PDF
- 多文档语义检索
- AI 概念卡和复习卡片管理
- 多主题和更细粒度阅读排版设置

## 贡献

欢迎提交 Issue 和 Pull Request。开始之前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

本项目代码基于 [MIT License](./LICENSE) 开源。
