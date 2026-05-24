---
adr: 003
title: 静态数据回退层 data.js
date: 2025-05-23
status: Accepted
---

# ADR-003: 静态数据回退层 data.js

## Context
API 优先架构下，前端依赖 Worker API 获取数据。但 API 可能因多种原因不可用：Worker 冷启动失败、D1 故障、网络问题、Cloudflare 平台故障。纯静态站点本应容灾无忧，引入 API 后反而增加了单点故障。

## Decision
保留原有 `data.js` 静态数据文件，作为 API 失败时的回退层。前端 `auth.js` 的 `loadDataFromAPI()` 函数逻辑：API 成功 → 用 API 数据覆盖 `historyData/extraHistory/dramaHistory/characters` 全局变量；API 失败 → 全局变量保持 `data.js` 初始值，网站正常展示静态内容。

## Alternatives Rejected

- **纯 API，无回退**: 最简单但 API 故障时网站白屏。对访客体验不可接受。
- **Service Worker 缓存 API 响应**: 可用浏览器 Cache API 缓存上次成功的 API 响应。问题是首次访问无缓存、缓存过期策略复杂、需要额外的 SW 代码维护。
- **GitHub Actions 定时同步 D1 → data.js**: 自动保持 data.js 与 DB 同步。但增加 Actions 复杂度、git 提交噪音、需要管理 Cloudflare API Token。对 99.9% 时间里用不到的兜底文件来说过度工程。

## Consequences
- data.js 需要手动更新与 DB 保持同步（低频，手动操作）
- 访客在 API 正常时看到实时数据，API 故障时看到旧数据（降级体验，有总比没有好）
- 无需维护额外的同步基础设施
