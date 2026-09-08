# 账户页与投稿采纳反馈实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为登录用户增加账户页、密码修改和本人投稿结果查看能力，并为编委会增加投稿“采纳 / 未采纳”反馈。

**状态：** 已实施；生产 D1 迁移待单独执行。

**Architecture:** 保留原生 HTML/CSS/JS 和现有 JWT/PBKDF2 认证，新增 `account.html`/`account.js` 作为真实账户路由。后端在 `auth` 增加改密接口，在 `materials` 增加独立 decision 字段和决策接口；同步维护 `worker/src` 与 `functions/_lib` 两套实现，原有素材内部 status 流程不变。

**Tech Stack:** 原生 HTML、CSS、ES2022 JavaScript、Cloudflare Worker/Pages Functions、D1 SQLite、现有 PBKDF2/JWT、定向 Node 语法检查和 Playwright 浏览器关键路径验证。

**Spec:** `docs/superpowers/specs/2026-09-08-account-and-submission-feedback-design.md`

## Global Constraints

- 保持现有 API、权限、史事状态机和素材内部 `submitted / organized / in_use / archived` 流程。
- 新增采纳结果使用 `pending / accepted / rejected`，不把 `in_use` 直接当作用户反馈。
- 账户数据和本人投稿由服务端按当前 JWT 用户过滤，不依赖前端过滤。
- 修改密码必须验证旧密码，新密码至少 6 位，不记录或返回密码。
- Worker 与 Pages Functions 必须保持同路径、同字段、同权限行为。
- 生产 D1 只提交迁移文件，不在本轮直接执行远程数据库变更。
- 保留工作区已有未跟踪文件，不使用 `git add .`。

---

### Task 1: 数据库和后端账户接口

**Files:**
- Modify: `worker/schema.sql`
- Create: `worker/migration-add-material-decision.sql`
- Modify: `worker/src/index.js`
- Modify: `worker/src/routes/auth.js`
- Modify: `worker/src/routes/materials.js`
- Modify: `functions/api/[[path]].js`
- Modify: `functions/_lib/routes/auth.js`
- Modify: `functions/_lib/routes/materials.js`

**Interfaces:**
- Consumes: `withAuth`, `requireRole`, `verifyPassword`, `hashPassword`, `createAuditLog`。
- Produces: `PUT /api/auth/password`、`GET /api/materials?mine=1`、`PUT /api/materials/:id/decision`。

- [x] **Step 1: 记录当前基线**

Run `npm test` and the existing JavaScript syntax checks. Record that the root test script is the repository's known `no test specified` placeholder if it exits 1; do not treat that placeholder as a feature regression.

基线结果：根目录 `npm test` 以 exit 1 返回仓库原有的 `Error: no test specified`；现有 8 个 JavaScript 文件语法检查通过。

- [x] **Step 2: 扩展全量 schema 和 D1 migration**

在 `materials` 的 `status` 后增加 `decision`、`decision_by`、`decision_at`，全量 schema 使用带 CHECK 的定义；迁移文件使用 `ALTER TABLE materials ADD COLUMN`，默认值为 `pending`，并创建 `idx_materials_decision`。

- [x] **Step 3: 实现两套 auth 改密处理器**

新增 `handleChangePassword(request, env)`：先 `withAuth`，解析 `currentPassword`/`newPassword`，校验必填和新密码长度，读取当前用户 `password_hash`，用 `verifyPassword` 校验旧密码，再用 `hashPassword` 更新并写入 `change_password` 审计日志。Worker 与 Functions 版本只调整引号风格，不调整契约。

- [x] **Step 4: 接入 auth password 路由**

在 `worker/src/index.js` 和 `functions/api/[[path]].js` 增加 `PUT /api/auth/password` 分支，调用两套 auth handler。

- [x] **Step 5: 增加本人过滤和采纳决策处理器**

在两个 materials handler 中读取 `mine=1`，当 `mine=1` 或角色为普通用户时追加 `submitter_id = 当前用户 id`。新增 `handleUpdateMaterialDecision`：要求 MaterialCollector+，只接受 `accepted/rejected`，更新 `decision`、`decision_by`、`decision_at`，记录 `update_material_decision` 审计日志。

- [x] **Step 6: 暂不执行远程迁移，先做后端语法检查**

Run syntax checks for both `worker/src` and `functions` changed JavaScript files. Confirm migration file is present and no Worker/Functions path is missing.

### Task 2: 全站账户态导航和账户页

**Files:**
- Create: `history/account.html`
- Create: `history/account.js`
- Create: `history/css/account.css`
- Modify: `history/auth.js`
- Modify: `history/contribute.html`
- Modify: `history/joinus.html`
- Modify: `history/guide.html`
- Modify: `history/disclaimer.html`
- Modify: `history/login.html`
- Modify: `history/submit.html`

**Interfaces:**
- Consumes: `window.siteAuth.autoLogin()`、`window.siteAuth.apiFetch()` 和 `GET /api/materials?mine=1`。
- Produces: 登录态下所有公共页的“账户”入口，以及 `account.html` 的改密和投稿结果 UI。

- [x] **Step 1: 让 auth.js 同步账户入口**

增加 `syncAccountNav(user)`，有用户时把 `.page-nav__login` 改为“账户”并指向 `account.html`，账户页设置 `aria-current="page"`；无用户时恢复“登录”。没有 `#mainContent` 的页面只做账户入口自动识别，不启动首页数据加载。

- [x] **Step 2: 让公共独立页面加载 auth.js**

在 contribute、joinus、guide、disclaimer 页面加载 `auth.js`；login、submit 页面沿用已有加载顺序；所有页面保留同一套真实 HTML 导航。

- [x] **Step 3: 创建账户页面结构**

创建带导航的 `account.html`，包含账户身份、修改密码表单、本人投稿列表和登录守卫。所有输入使用可见 label，状态区域使用 `role="status"` 或 `role="alert"`。

- [x] **Step 4: 实现账户页交互**

`account.js` 先调用 `autoLogin`；未登录显示 `login.html` 链接；已登录加载 `materials?mine=1`，使用转义文本渲染投稿摘要和 decision 标签。改密提交前校验确认密码，提交 `/auth/password`，成功清空表单并显示结果。

- [x] **Step 5: 实现账户页样式**

使用现有 museum token，账户页采用白色面板、石白背景、朱红重点色和单列移动端布局；投稿状态使用待处理/已采纳/未采纳三种语义色，不引入新框架。

### Task 3: 管理后台采纳操作

**Files:**
- Modify: `history/js/admin.js`
- Modify: `history/css/admin.css`

**Interfaces:**
- Consumes: `/api/materials` 返回的 `decision` 字段和 `PUT /api/materials/:id/decision`。
- Produces: 素材列表中的采纳结果、采纳和未采纳按钮。

- [x] **Step 1: 扩展素材列表显示**

新增“采纳结果”列，映射 `pending → 待处理`、`accepted → 已采纳`、`rejected → 未采纳`；原整理状态单独保留。

- [x] **Step 2: 增加后台决策按钮**

MaterialCollector 及以上显示“采纳”和“未采纳”按钮；点击分别调用 `/materials/:id/decision`，成功 toast 后刷新素材列表，失败显示错误 toast。

- [x] **Step 3: 统一后台文案和样式**

将素材页说明改为同时解释“整理状态”和“采纳结果”，复用已有成功/危险状态色，确保表格在移动端仍可横向滚动。

### Task 4: 文档和定向验证

**Files:**
- Modify: `docs/project-knowledge/architecture.md`
- Modify: `docs/project-knowledge/features.md`
- Modify: `docs/superpowers/specs/2026-09-08-account-and-submission-feedback-design.md`
- Modify: `docs/superpowers/plans/2026-09-08-account-and-submission-feedback.md`

**Interfaces:**
- Consumes: 已实现的 API、账户页和后台素材决策功能。
- Produces: 页面入口、API、状态机和权限说明与代码一致。

- [x] **Step 1: 同步项目知识文档**

记录 `account.html`、`PUT /api/auth/password`、`GET /api/materials?mine=1` 和 `PUT /api/materials/:id/decision`，说明 decision 与素材内部 status 的区别。

- [x] **Step 2: 编写一次性关键路径检查**

用临时 Playwright 脚本覆盖：匿名页显示“登录”、mock 登录态显示“账户”、账户页渲染本人投稿和三种 decision、改密请求体、后台采纳/未采纳请求体；脚本只放在系统临时目录，执行后删除。

- [x] **Step 3: 执行最终验证**

Run changed JavaScript syntax checks, route/HTML structure checks, `git diff --check`, and the one-time browser flow. Report the known root `npm test` placeholder separately.

- [x] **Step 4: Review staged scope before any future commit**

Only stage the explicitly changed feature files; leave `.codegraph/`、`AGENTS.md`、`findings.md`、`progress.md`、`task_plan.md` untouched and unstaged.

## 遇到的错误

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 根目录 `npm test` 返回 `Error: no test specified` | 1 | 确认为仓库原有占位脚本，不作为本次功能失败 |
| 临时 API 断言脚本直接导入 Functions 的 `.js` 被 Node 当作 CommonJS | 2 | 使用临时 ESM 声明验证，验证后删除临时文件 |
| 临时 Fake D1 的 `bind()` 返回错误对象 | 1 | 修正测试桩链式返回并重新执行，全部断言通过 |
