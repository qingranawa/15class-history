# 2025级15班 · 班级史记

记录和展示2025级15班班级历史事件的网站。

- GitHub: [qingranawa/15class-history](https://github.com/qingranawa/15class-history)

## 技术栈

### 前端（history/）
- 原生 HTML/CSS/JS，无构建工具
- Chart.js 4.4.7 (CDN)
- vis-network 9.1.9 (CDN)
- html2canvas 1.4.1 (CDN)

### 后端（worker/）
- Cloudflare Workers（serverless）
- Cloudflare D1（SQLite 兼容数据库）
- JWT 认证（HMAC-SHA256）
- PBKDF2 密码哈希

## 目录结构

```
15class-history/
├── history/                   # 前端静态站点（Cloudflare Pages 部署）
│   ├── index.html             # 主页面（访客阅览入口）
│   ├── admin.html             # 管理面板（编纂委员入口）
│   ├── auth.js                # 登录验证（后端JWT + 本地回退 + dev模式）
│   ├── data.js                # 静态数据（API不可用时的回退）
│   ├── js/
│   │   ├── admin.js           # 管理面板全部逻辑
│   │   ├── core/              # main.js, common.js, controls.js
│   │   ├── ui/                # render.js, modal.js, modal-extras.js
│   │   ├── features/          # stats.js, graph.js, share.js, comments.js
│   │   └── effects/           # animations.js
│   └── css/
│       ├── admin.css          # 管理面板样式
│       ├── base/              # base.css
│       ├── layout/            # layout.css
│       ├── components/        # 各组件样式
│       └── effects/           # animations.css, utilities.css
│
└── worker/                    # Cloudflare Worker 后端
    ├── package.json
    ├── wrangler.toml          # Worker 配置（D1绑定、环境变量）
    ├── schema.sql             # D1 数据库建表
    ├── seed.sql               # 种子数据（迁移旧数据）
    └── src/
        ├── index.js           # Worker 入口 + 路由
        ├── utils.js           # JWT、密码哈希、CORS、路径匹配
        ├── middleware.js       # 认证中间件、角色检查、审计日志
        └── routes/
            ├── auth.js        # 登录、注册、获取当前用户
            ├── records.js     # 史事 CRUD + 审核流程
            ├── characters.js  # 人物档案 CRUD
            ├── materials.js   # 素材资料 CRUD
            └── users.js       # 用户管理、操作日志、系统配置
```

## 权限组系统

7个角色按权限递增：

| 角色（编号） | 中文名称 | 核心权限 |
|---|---|---|
| user (0) | 普通用户 | 仅浏览已发布内容 |
| MaterialCollector (1) | 执书委员 | 上传/管理自己的素材 |
| DraftWriter (2) | 执笔委员 | 编写史事草稿，提交审核 |
| Reviewer (3) | 审定委员 | 审核稿件（通过/驳回） |
| SupervisorGeneral (4) | 总监制委员 | 管理所有内容 + 下级委员账号 |
| DeputySupervisor (4) | 总副监制委员 | 同总监制，不可操作总监制账号 |
| Chairperson (5) | 主任委员 | 超级管理员，所有权限 |
| ExecutiveDeputyChair (5) | 常务副主任委员 | 同主任，不可操作主任账号 |

### 特殊权限规则
- DeputySupervisor 不可删除/修改 SupervisorGeneral 账号
- ExecutiveDeputyChair 不可删除/修改 Chairperson 账号
- DraftWriter 仅可编辑自己的草稿和退回稿
- Reviewer 不可直接编辑史事正文
- 首个注册用户自动成为 Chairperson

### 工作流
```
执书委员上传素材 → 执笔委员基于素材写史（草稿）
  → 提交审核 → 审定委员审核
    → 通过 ✅ → 自动发布到前端
    → 驳回 ❌ → 退回执笔委员修改
```

## 部署指南

### 1. 创建 D1 数据库
```bash
cd worker
npx wrangler d1 create 15class-history-db
```
将输出的 database_id 填入 wrangler.toml

### 2. 初始化数据库表
```bash
npx wrangler d1 execute 15class-history-db --file=./schema.sql
```

### 3. 部署 Worker
```bash
npx wrangler deploy
```

### 4. 配置 Cloudflare
- 在 Cloudflare Dashboard 中设置 Worker 路由，让 `/api/*` 指向 Worker
- 或者使用自定义域名（如 api.15class-history.pages.dev）
- 在 Worker 环境变量中设置 `JWT_SECRET`（生产环境务必修改）
- 设置 `CORS_ORIGIN` 为前端域名

### 5. 初始化管理员
部署后，首次调用注册接口自动成为主任委员：
```bash
curl -X POST https://your-worker.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"主任姓名","password":"安全密码"}'
```

### 6. 本地开发
```bash
cd worker
npm install
npx wrangler dev
```
前端访问 `history/index.html?dev=true` 跳过登录。

## API 概览

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | /api/auth/login | 所有人 | 登录获取JWT |
| POST | /api/auth/register | Chairperson+ | 注册新用户 |
| GET | /api/auth/me | 已登录 | 获取当前用户信息 |
| GET | /api/records?type=&grade=&status= | 所有人 | 查询史事列表 |
| POST | /api/records | DraftWriter+ | 创建史事（草稿） |
| PUT | /api/records/:id | 作者/管理员 | 更新史事 |
| DELETE | /api/records/:id | SupervisorGeneral+ | 删除史事 |
| POST | /api/records/:id/submit-review | DraftWriter | 提交审核 |
| POST | /api/records/:id/review | Reviewer+ | 通过/驳回 |
| GET | /api/characters | 所有人 | 人物列表 |
| POST | /api/characters | DraftWriter+ | 创建人物 |
| PUT | /api/characters/:id | DraftWriter+ | 更新人物 |
| DELETE | /api/characters/:id | SupervisorGeneral+ | 删除人物 |
| GET | /api/materials | MaterialCollector+ | 素材列表 |
| POST | /api/materials | MaterialCollector+ | 上传素材 |
| PUT | /api/materials/:id | 提交者/管理员 | 修改素材 |
| DELETE | /api/materials/:id | 提交者/管理员 | 删除素材 |
| GET | /api/users | SupervisorGeneral+ | 用户列表 |
| PUT | /api/users/:id/role | SupervisorGeneral+ | 修改角色 |
| DELETE | /api/users/:id | SupervisorGeneral+ | 删除用户 |
| GET | /api/logs | Chairperson/EDC | 操作日志 |
| GET | /api/config | Chairperson/EDC | 系统配置 |

## 前端开发规范（不变）

### HTML: 语义化标签、图片带alt、键盘可操作
### CSS: BEM命名、响应式断点 sm(640) md(768) lg(1024) xl(1280)、禁止内联style
### JavaScript: ES2022+、const>let、===、禁止eval
### 性能: 图片懒加载、高频事件防抖/节流
