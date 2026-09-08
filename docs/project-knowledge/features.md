---
last_updated: 2026-05-24
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Features

## Implemented

### Product Capabilities

#### 班级史事阅览
**Enables** — 访客浏览已发布的班级历史事件（正史/外史/戏史），按学期分组、时间线展示。
**Actors / Entry Points** — 访客 → `history/index.html` → `history/js/core/main.js` → `GET /api/records?type=&status=approved`
**Capability Boundary** — 仅展示 `status=approved` 的稿件。提供时间线、搜索、统计图、关系图谱视图。API 不可用时回退到 `data.js` 静态数据。
**References** — architecture.md §Record Status, ADR-003

#### 用户认证
**Enables** — 用户登录/注册/自动登录、进入账户页和修改自己的密码，获取 JWT token 用于后续 API 鉴权。
**Actors / Entry Points** — 所有用户 → `history/login.html` → `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`; 已登录用户 → `history/account.html` → `PUT /api/auth/password`
**Capability Boundary** — 首个注册用户自动成为 Chairperson。中文用户名被拦截。首页不再强制登录，登录页只用于获取投稿和后台所需的会话。账户页改密必须校验当前密码，不返回密码信息。支持 dev 模式跳过验证 (`?dev=true`)。
**References** — architecture.md §Scenario Sequences, ADR-002

#### 稿件管理（创建-编辑-审核-发布）
**Enables** — 执笔委员创建史事稿件（正史/外史/戏史），支持直接提交审核或保存为草稿。审定委员审核稿件（通过/驳回），通过后自动发布到前端。
**Actors / Entry Points** — DraftWriter → `POST /api/records`, `PUT /api/records/:id`, `POST /api/records/:id/submit-review`; Reviewer → `POST /api/records/:id/review`
**Capability Boundary** — DraftWriter 仅可编辑自己的草稿和退回稿。Reviewer 不可直接编辑史事正文。SupervisorGeneral+ 可管理所有稿件。
**References** — architecture.md §Record Status, see ADR-001

#### 素材资料管理
**Enables** — 素材四步内部流转：用户投稿 (submitted) → 执书委员已整理确认 (organized) → 进入编纂 (in_use) → 归档 (archived)；另有独立采纳反馈：待处理 (pending) / 已采纳 (accepted) / 未采纳 (rejected)。执笔委员查看已采用素材辅助写史。
**Actors / Entry Points** — 所有登录用户 → `POST /api/materials`（投稿）；登录用户 → `GET /api/materials?mine=1`（本人投稿）；MaterialCollector → `PUT /api/materials/:id`（整理状态）和 `PUT /api/materials/:id/decision`（采纳结果）
**Capability Boundary** — 素材类型：文字资料(text)、图片资料(image)、档案文件(file)。MaterialCollector 可管理所有素材状态和采纳结果；`mine=1` 由服务端强制按 submitter_id 过滤。
**References** — architecture.md §Material Status

#### 人物档案
**Enables** — 创建、编辑、删除班级成员和教师的人物档案，含外号、性别、年龄、特质、描述。
**Actors / Entry Points** — DraftWriter+ → `POST/PUT/DELETE /api/characters`；访客 → `GET /api/characters`
**Capability Boundary** — 人物档案与史事联动展示。关系图谱基于人物数据生成。
**References** — architecture.md §Layering

#### 用户与权限管理
**Enables** — 管理员管理用户账号、修改角色、查看操作日志和系统配置统计，并设置首页默认年级。
**Actors / Entry Points** — SupervisorGeneral+ → `GET/PUT/DELETE /api/users`; Chairperson/EDC → `GET /api/logs`, `GET/PUT /api/config`; 访客 → `GET /api/config/public`
**Capability Boundary** — 7 角色权限层级，含特殊规则：DeputySupervisor 不可操作 SupervisorGeneral 账号，ExecutiveDeputyChair 不可操作 Chairperson 账号。
**References** — architecture.md §Layering

#### 普通用户投稿
**Enables** — 任何注册用户可提交文字素材投稿，并在账户页查看编委会是否采纳。
**Actors / Entry Points** — 所有登录用户 → `history/submit.html` → `POST /api/materials`; 已登录用户 → `history/account.html` → `GET /api/materials?mine=1`
**Capability Boundary** — 投稿内容需同时填写标题和正文。投稿后进入 `submitted` 内部状态和 `pending` 采纳结果，采纳结果由 MaterialCollector 及以上角色更新。
**References** — architecture.md §Material Status

### Platform Capabilities

#### 权限分级系统
**Enables** — 7 角色层级 (user→MaterialCollector→DraftWriter→Reviewer→SupervisorGeneral/DeputySupervisor→Chairperson/ExecutiveDeputyChair)，每个角色拥有递增权限。
**Actors / Entry Points** — `middleware.js` → `withAuth()`（JWT 验证）→ `requireRole()`（角色检查）→ 各路由 handler
**Capability Boundary** — 角色存储在 users 表，通过 JWT payload 传递，每次请求从 DB 重新查询确保实时性。
**References** — architecture.md §Layering, `worker/src/utils.js` ROLE_LEVELS

#### 审计日志
**Enables** — 记录所有敏感操作（创建/更新/删除/审核/角色变更），含操作者、目标、详情、时间。
**Actors / Entry Points** — `middleware.js` → `createAuditLog()` → 各路由 handler 调用
**Capability Boundary** — 仅 Chairperson/ExecutiveDeputyChair 可查看日志。日志不可删除。
**References** — `worker/src/routes/users.js` handleListLogs

#### 静态数据回退
**Enables** — API 不可用时，前端自动回退到 `data.js` 预置静态数据，确保网站基本可浏览。
**Actors / Entry Points** — 访客 → `history/index.html` → `history/auth.js` → `loadDataFromAPI()` catch 分支
**Capability Boundary** — 静态数据需要手动同步更新。非 dev 模式下 API 优先，回退仅兜底。
**References** — ADR-003
