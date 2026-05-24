---
adr: 002
title: JWT HMAC-SHA256 + PBKDF2 密码哈希
date: 2025-05-23
status: Accepted
---

# ADR-002: JWT HMAC-SHA256 + PBKDF2 密码哈希

## Context
需要实现用户认证系统：登录/注册/会话管理。后端在 Cloudflare Workers 上运行，基于 V8 isolates，不能使用 Node.js 内置的 `crypto` 模块。需支持 Web Crypto API。

## Decision
使用 Web Crypto API 的 HMAC-SHA256 签名 JWT 做会话令牌，PBKDF2 (100,000 iterations, SHA-256) 做密码哈希。所有实现集中在 `worker/src/utils.js`，无外部依赖。

## Alternatives Rejected

- **jsonwebtoken (npm) + bcrypt**: Node.js 生态标配，但 jsonwebtoken 和 bcrypt 都依赖 Node.js crypto 模块，在 Workers 环境中不可用或不稳定。需要 polyfill 或 nodejs_compat flag。
- **Cloudflare Access / Zero Trust**: Cloudflare 的托管认证方案。功能完整但配置复杂，且将用户管理外移到 Cloudflare Dashboard 不符合"班委自主管理用户"的需求。
- **API Key / 静态 Token**: 最简单但不支持用户区分、角色管理、会话过期。无法实现权限系统。

## Consequences
- `utils.js` 约 180 行纯函数实现 JWT 签名/验证 + PBKDF2 哈希/校验
- 需注意 TextEncoder/TextDecoder 处理中文（base64url 编码需先转 bytes）
- JWT 24 小时过期，前端自动重新登录
- 生产环境 JWT_SECRET 通过 `wrangler.toml` vars 或 Cloudflare Dashboard 环境变量注入
