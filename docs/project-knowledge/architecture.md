---
last_updated: 2026-05-24
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Architecture

## Pattern Overview

Serverless 单服务 + 静态前端。Cloudflare Worker 承载 REST API，Cloudflare Pages 托管原生 HTML/CSS/JS 页面。无构建工具、无框架——主站、说明页、登录页和投稿页通过独立 HTML 路由提供，主站前端通过 `<script>` 标签按加载顺序协作，后端路由按 URL 前缀分发。架构以简单性和零冷启动为优先级。

## System Context

- **Browser** — 用户通过浏览器访问前端页面，JS 调用 API
- **Cloudflare Pages** — 托管静态资源 (history/)
- **Cloudflare Workers** — 运行 API 逻辑 (worker/src/)
- **Cloudflare D1 (SQLite)** — 持久化数据库，通过 Worker binding 访问
- **GitHub (qingranawa/15class-history)** — 源码仓库，Pages 通过 git push 自动部署

## Layering

### Frontend (`history/`) — 静态展示 + 管理面板
- 入口: `history/index.html`（班史）、`history/contribute.html`（投稿说明）、`history/joinus.html`（加入我们）、`history/guide.html`（新手指南）、`history/disclaimer.html`（免责协议）、`history/login.html`（登录）、`history/submit.html`（投稿） / `history/admin.html`（编纂委员）
- 数据: `history/data.js` (静态回退) → `history/auth.js` (登录 + API 数据) → `history/js/core/main.js` (应用启动)
- UI: `history/js/ui/render.js`（渲染）、`history/js/ui/modal.js`（弹窗）
- 功能: `history/js/features/stats.js`（统计）、`history/js/features/graph.js`（关系图）、`history/js/features/comments.js`（评论）
- 管理: `history/js/admin.js`（全部后台逻辑）
- 样式: `history/css/base/` → `history/css/layout/` → `history/css/components/` → `history/css/effects/`

### API Worker (`worker/src/`) — RESTful 后端
- 入口: `index.js` — URL 路径路由分发
- 认证: `worker/src/routes/auth.js` (login/register/me)
- 核心域: `worker/src/routes/records.js`（史事）、`worker/src/routes/characters.js`（人物）、`worker/src/routes/materials.js`（素材）
- 管理: `worker/src/routes/users.js`（用户、日志、配置）
- 基础设施: `worker/src/utils.js`（JWT/PBKDF2/CORS）、`worker/src/middleware.js`（认证、权限、审计）

### Database (`worker/schema.sql`) — D1 (SQLite)
- `users` / `records` / `characters` / `materials` / `audit_logs` / `system_config`

调用方向: Frontend → API Worker → D1。前端不直接访问 D1，Worker 不主动推数据到前端。

## Scenario Sequences

### 登录与数据加载
```mermaid
sequenceDiagram
  participant Login as login.html
  participant Browser
  participant Pages
  participant Worker
  participant D1

  Login->>Pages: GET login.html
  Login->>Worker: POST /api/auth/login
  Worker->>D1: SELECT users WHERE username=?
  Worker-->>Login: JWT + user
  Browser->>Pages: GET index.html
  Pages-->>Browser: HTML + data.js + auth.js
  Browser->>Browser: DOMContentLoaded → 访客直接初始化
  alt 已存储 token
    Browser->>Worker: GET /api/auth/me (Bearer token)
    Worker->>D1: SELECT users WHERE id=?
    D1-->>Worker: user row
    Worker-->>Browser: { id, username, role }
    Browser->>Worker: 并行 GET /api/records?status=approved + /api/characters
    Worker->>D1: SELECT records / characters
    D1-->>Worker: rows
    Worker-->>Browser: JSON 数据 → 覆盖 data.js 全局变量
  else API 失败
    Browser->>Browser: 回退到 data.js 静态数据
  end
```

### 稿件审核流程
```mermaid
sequenceDiagram
  actor DW as 执笔委员
  participant Frontend
  participant Worker
  participant D1
  actor RV as 审定委员

  DW->>Frontend: 创建稿件 + 勾选"直接提交审核"
  Frontend->>Worker: POST /api/records { status: 'pending_review' }
  Worker->>D1: INSERT records status='pending_review'
  Worker-->>Frontend: { id, message: '已提交审核' }
  RV->>Frontend: 待审列表 → 审核通过
  Frontend->>Worker: POST /api/records/:id/review { action: 'approve' }
  Worker->>D1: UPDATE records SET status='approved'
  Worker-->>Frontend: { status: 'approved' }
```

## Key Object FSMs

### Record Status
```mermaid
stateDiagram-v2
  [*] --> draft: 创建稿件
  draft --> pending_review: 提交审核 (submit-review / PUT status)
  rejected --> draft: 编辑保存
  rejected --> pending_review: 重新提交
  pending_review --> approved: 审核通过 (review approve)
  pending_review --> rejected: 驳回 (review reject)
  approved --> [*]
```

### Material Status
```mermaid
stateDiagram-v2
  [*] --> submitted: 用户投稿
  submitted --> organized: 已整理确认 (PUT status='organized')
  organized --> in_use: 标记已采用 (PUT status='in_use')
  in_use --> archived: 归档 (PUT status='archived')
  archived --> [*]
```

## Key Design Decisions

- **[全栈迁移至 Cloudflare Workers + D1]** — see ADR-001
- **[JWT HMAC-SHA256 + PBKDF2 密码哈希]** — see ADR-002
- **[静态数据回退层 data.js]** — see ADR-003
