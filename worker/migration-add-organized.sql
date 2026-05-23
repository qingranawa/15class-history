-- ===================== 素材表迁移：新增 organized 状态 =====================
-- 在 submitted(待整理) 和 in_use(已采用) 之间增加 organized(已整理) 状态
-- 执行方式: npx wrangler d1 execute 15class-history-db --file=./migration-add-organized.sql

-- SQLite 不支持直接修改 CHECK 约束，需要重建表喵
CREATE TABLE materials_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    material_type TEXT NOT NULL DEFAULT 'text'
        CHECK (material_type IN ('text', 'image', 'file')),
    file_url TEXT,
    submitter_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'organized', 'in_use', 'archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 迁移数据
INSERT INTO materials_new SELECT * FROM materials;

-- 替换旧表
DROP TABLE materials;
ALTER TABLE materials_new RENAME TO materials;

-- 重建索引
CREATE INDEX IF NOT EXISTS idx_materials_submitter ON materials(submitter_id);
