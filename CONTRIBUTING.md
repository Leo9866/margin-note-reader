# Contributing

感谢你愿意参与 Margin Note Reader。

## 开发流程

1. Fork 仓库并创建功能分支。
2. 安装依赖：`npm install`。
3. 复制 `.env.local.example` 为 `.env.local`，填入自己的模型配置。
4. 本地启动：`npm run dev`。
5. 提交前运行：`npm run build`。

## 代码风格

- 保持 UI 文案以中文为主。
- 优先沿用现有 React 组件和 CSS 组织方式。
- 不要把真实 API Key、私密文档或本地生成产物提交到仓库。
- 面向阅读体验的改动，请同时检查宽屏和窄屏布局。

## Pull Request 建议

提交 PR 时请说明：

- 解决了什么问题。
- 改动影响到哪些界面或数据。
- 是否运行过 `npm run build`。
- 如果是 UI 改动，建议附上截图或录屏。

## Issue 建议

反馈问题时请尽量提供：

- 浏览器和操作系统版本。
- 复现步骤。
- 期望表现和实际表现。
- 控制台错误或网络请求错误。
