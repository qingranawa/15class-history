-- ===================== 投稿采纳结果迁移 =====================
-- 为已有 materials 表增加面向投稿人的独立采纳结果。
-- 执行方式: npx wrangler d1 execute 15class-history-db --file=./migration-add-material-decision.sql

ALTER TABLE materials ADD COLUMN decision TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE materials ADD COLUMN decision_by INTEGER REFERENCES users(id);
ALTER TABLE materials ADD COLUMN decision_at TEXT;

CREATE INDEX IF NOT EXISTS idx_materials_decision ON materials(decision);
