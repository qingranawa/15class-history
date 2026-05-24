---
last_updated: 2026-05-24
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Conventions

## JS/TS 规范

- 双引号 (`"`)，分号结尾 — ESLint `quotes: ["error", "double"]`, `semi: ["error", "always"]`
- ES2022+ 语法，`const` 优先于 `let`，禁止 `var`
- 前端无构建工具，ES 模块 (`"sourceType": "module"`)，CDN 引入第三方库
- 后端 Worker 使用 ES 模块导出 (`export default { fetch }`)
- 注释用中文

## API 规范

- RESTful：`GET/POST/PUT/DELETE`，路径 `/api/<resource>[/:id]`
- JWT Bearer token 认证（HMAC-SHA256，24 小时有效期）
- 请求/响应均为 JSON（`Content-Type: application/json; charset=utf-8`）
- 错误格式: `{ "error": "消息" }` + HTTP 状态码
- CORS: 允许所有来源 (`*`)，生产环境应按需限制

## 数据库规范

- D1 (SQLite 兼容)，表名/字段名 snake_case
- 时间用 ISO 8601 文本 (`datetime('now')`)
- 主键 INTEGER PRIMARY KEY AUTOINCREMENT
- 外键使用 REFERENCES，但 SQLite 默认不强制（需 PRAGMA foreign_keys = ON）

## 前端样式规范

- BEM 命名: `.block__element--modifier`
- 响应式断点: sm(640) md(768) lg(1024) xl(1280)
- 禁止内联 style（JS 动态样式除外）
- 图片懒加载，高频事件防抖/节流

## Git 规范

- Conventional Commits: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`
- 中文 commit message body
- main 分支直接 push（单人项目）

## 安全规范

- 密码 PBKDF2 + SHA-256 哈希 + 随机 salt（`worker/src/utils.js:hashPassword`）
- JWT secret 通过 Cloudflare Worker 环境变量注入（非硬编码）
- 不暴露内部错误细节给客户端（catch-all 返回 "服务器内部错误"）
