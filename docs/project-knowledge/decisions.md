---
last_updated: 2026-05-24
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Decisions

## ADR-001: 全栈迁移至 Cloudflare Workers + D1
**Decision:** 从纯静态 HTML/JS 站迁移到 Cloudflare Workers 后端 + D1 数据库，保留 Pages 托管前端。
**Trade-off:** 引入 serverless 和 D1 的外部依赖，但获得了用户认证、权限系统、动态 CRUD 和审核工作流。
→ [adr/ADR-001-workers-d1-migration.md](adr/ADR-001-workers-d1-migration.md)

## ADR-002: JWT HMAC-SHA256 + PBKDF2 密码哈希
**Decision:** 使用 HMAC-SHA256 签名的 JWT 做会话认证，PBKDF2 (100k iterations, SHA-256) 做密码存储。无外部认证库，纯 Web Crypto API 实现。
**Trade-off:** 手动实现 JWT 比用库多了维护成本，但避免了对 Node.js crypto 的依赖，保持与 Workers 环境的兼容性。
→ [adr/ADR-002-jwt-pbkdf2-auth.md](adr/ADR-002-jwt-pbkdf2-auth.md)

## ADR-003: 静态数据回退层 data.js
**Decision:** 前端保留 `data.js` 作为 API 不可用时的静态回退数据，`auth.js` 在 API 成功时用 API 数据覆盖全局变量。
**Trade-off:** data.js 需手动更新与 DB 同步；但其存在确保 API 宕机时网站不白屏。
→ [adr/ADR-003-static-fallback.md](adr/ADR-003-static-fallback.md)
