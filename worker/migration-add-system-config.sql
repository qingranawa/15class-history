-- ===================== 系统配置迁移 =====================
-- 执行方式: npx wrangler d1 execute 15class-history-db --file=./migration-add-system-config.sql

CREATE TABLE IF NOT EXISTS system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO system_config (config_key, config_value)
VALUES ('default_grade', '八上');
