# 账户页与投稿采纳反馈设计

> 状态：已确认，进入实施
> 日期：2026-09-08

## 目标

登录后的公共页面将右上角的“登录”切换为“账户”，进入一个真实的账户 HTML 页面。账户页提供修改密码和查看本人投稿采纳结果的能力；管理后台的素材投稿列表增加“采纳 / 未采纳”操作。

## 设计决策

投稿已有内部整理状态 `submitted / organized / in_use / archived`，本次不复用或改写这组状态。新增独立的 `decision` 字段表达编委会对内容建议的反馈：

- `pending`：待处理
- `accepted`：已采纳
- `rejected`：未采纳

这样用户看到的是清晰的采纳结果，后台仍然可以继续使用原有素材整理和归档流程。

## API 契约

### 修改当前用户密码

`PUT /api/auth/password`

请求体：

```json
{
  "currentPassword": "旧密码",
  "newPassword": "新密码"
}
```

要求请求携带有效 JWT；服务端校验旧密码，新密码至少 6 位，成功后更新 PBKDF2 哈希并写入审计日志。不返回密码、密码哈希或 token。

### 查询本人投稿

`GET /api/materials?mine=1`

要求请求携带有效 JWT，并强制 `submitter_id = 当前用户 id`，即使当前用户是执书委员或更高角色也只能拿到自己的投稿。返回素材原有字段以及 `decision`、`decision_by`、`decision_at`。

### 更新投稿采纳结果

`PUT /api/materials/:id/decision`

请求体：

```json
{
  "decision": "accepted"
}
```

`decision` 只允许 `accepted` 或 `rejected`；服务端要求 MaterialCollector 及以上角色，更新决策人和决策时间并写入审计日志。原有 `status` 字段不变。

## 数据库变化

`materials` 表新增：

```sql
decision TEXT NOT NULL DEFAULT 'pending'
  CHECK (decision IN ('pending', 'accepted', 'rejected')),
decision_by INTEGER REFERENCES users(id),
decision_at TEXT
```

同时更新全量 `schema.sql`，新增可重复执行的 D1 迁移文件。Worker 和 Pages Functions 两套后端实现使用相同字段和路径。

## 页面行为

- 公共页面加载 `auth.js` 后调用 `GET /api/auth/me`；有有效登录态时把 `.page-nav__login` 的文案改为“账户”，href 改为 `account.html`；未登录时保持“登录”。
- 新增 `account.html` 和 `account.js`，账户页未登录时显示登录链接；已登录时显示用户名、角色、改密表单和本人投稿列表。
- 投稿列表显示标题、正文摘要、投稿时间和“待处理 / 已采纳 / 未采纳”状态。
- 后台素材列表增加“采纳结果”列；MaterialCollector 及以上角色可以点击“采纳”或“未采纳”，保存后刷新列表。

## 权限和安全边界

- 账户页、改密接口和本人投稿接口必须登录。
- `mine=1` 由服务端执行过滤，不能只依赖前端过滤。
- 采纳接口由服务端执行角色检查，不能只隐藏前端按钮。
- 所有 SQL 使用绑定参数；用户投稿标题、正文和状态展示继续使用现有转义函数。
- 修改密码只记录动作和用户 id，不记录密码内容。

## 不在本次范围内

- 不删除或重命名原有素材 `status` 流程。
- 不改变登录 token 格式和 JWT 生命周期。
- 不增加管理员代替用户改密功能。
- 不直接执行生产 D1 迁移；部署时单独运行迁移文件。
