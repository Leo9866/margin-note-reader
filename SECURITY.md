# Security Policy

## Supported Versions

当前项目处于早期版本，安全修复会优先发布在 `main` 分支。

## Reporting a Vulnerability

如果你发现安全问题，请不要在公开 Issue 中贴出可利用细节、真实 API Key 或私密文档内容。

请通过 GitHub 私信、私有渠道或创建不包含敏感细节的 Issue 联系维护者，并说明：

- 影响范围
- 复现条件
- 你建议的修复方向

## Secret Handling

- `.env.local` 不应被提交。
- 前端代码不应直接读取或暴露 `OPENAI_API_KEY`。
- 示例配置只能包含占位值。
- 如果密钥曾被公开暴露，请立即轮换。
