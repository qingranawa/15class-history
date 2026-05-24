---
last_updated: 2026-05-24
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Tech Stack

## Languages
| 层 | 语言 | 运行时 |
|---|---|---|
| Frontend | JavaScript (ES2022+) | Browser |
| Backend | JavaScript (ES modules) | Cloudflare Workers (V8 isolates) |
| Database | SQL (SQLite dialect) | Cloudflare D1 |

## Key Dependencies

| Package | Version | Layer | Purpose | Why Chosen |
|---|---|---|---|---|
| wrangler | ^4.0.0 | Backend dev | Workers/D1 CLI | Cloudflare 官方工具链 |
| Chart.js | 4.4.7 (CDN) | Frontend | 统计图表 | 轻量、CDN 直引、无需构建 |
| vis-network | 9.1.9 (CDN) | Frontend | 人物关系图谱 | 支持力导向布局、交互式操作 |
| html2canvas | 1.4.1 (CDN) | Frontend | 截图导出 | 客户端渲染导出，无需服务端 |
| ESLint | ^9 | Dev | 代码检查 | 项目配置 `eslint.config.mjs`，强制双引号/分号 |

## Infrastructure

| 服务 | 用途 |
|---|---|
| Cloudflare Pages | 前端静态托管 + 自动部署 (git push → deploy) |
| Cloudflare Workers | API serverless 运行时 |
| Cloudflare D1 | 持久化 SQLite 数据库，Worker 通过 `DB` binding 访问 |

## Dev Toolchain
- **包管理:** npm (root + worker/)
- **格式化:** Prettier (双引号)
- **Lint:** ESLint flat config, `globals` + `@eslint/js`
- **部署:** `wrangler deploy` (Worker) / Cloudflare Pages git integration (前端)
