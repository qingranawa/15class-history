---
adr: 001
title: 全栈迁移至 Cloudflare Workers + D1
date: 2025-05-23
status: Accepted
---

# ADR-001: 全栈迁移至 Cloudflare Workers + D1

## Context
项目最初为纯静态 HTML/JS 站点，所有数据硬编码在 `data.js` 中。需要支持：用户认证、权限分级、稿件审核工作流、动态数据管理。原架构无法实现这些功能——静态站点无法安全存储密码，也无法实现写操作。

约束：项目已部署在 Cloudflare Pages 上，零预算，单人维护。

## Decision
采用 Cloudflare Workers 作为 API 后端，D1 作为 SQLite 兼容数据库。前端继续托管在 Pages，通过 REST API 通信。技术选型完全在 Cloudflare 生态内，利用免费额度。

## Alternatives Rejected

- **Supabase / Firebase**: 提供了开箱即用的认证和数据库，但引入第三方供应商锁定，有冷启动问题，且超出免费额度门槛。比 Cloudflare 方案复杂，对单人项目来说 overkill。
- **纯静态 + GitHub Issues 作为 CMS**: 曾考虑用 GitHub Issues 存储动态数据、GitHub Actions 触发更新。问题是延迟高（多分钟），且无法实现细粒度权限控制（JWT 需要服务端）。
- **Express + SQLite on VPS**: 传统方案可行但需要维护服务器、处理 TLS、做备份——运维负担远超项目规模。

## Consequences
- 所有写操作通过 Worker API 实现，获得完整的认证/授权/审计能力
- D1 免费额度 (5GB storage, 5M reads/day) 远超项目需求
- 前端 data.js 保留为回退层，API 故障时网站仍可浏览
- 新增 worker/ 目录，`wrangler deploy` 一键部署
- 迁移脚本 `migration-add-organized.sql` 处理 schema 变更
