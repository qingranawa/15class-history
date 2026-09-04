-- ===================== 用户表 =====================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN (
            'user',
            'MaterialCollector',
            'DraftWriter',
            'Reviewer',
            'SupervisorGeneral',
            'DeputySupervisor',
            'Chairperson',
            'ExecutiveDeputyChair'
        )),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===================== 史事记录表 =====================
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    grade TEXT NOT NULL,
    content TEXT,
    honorific TEXT,
    notes TEXT DEFAULT '',
    date TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'zhengshi'
        CHECK (type IN ('zhengshi', 'waishi', 'xishi')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
    author_id INTEGER NOT NULL REFERENCES users(id),
    reviewer_id INTEGER REFERENCES users(id),
    review_comment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===================== 人物档案表 =====================
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nicknames TEXT DEFAULT '[]',
    gender TEXT DEFAULT '',
    first_age TEXT DEFAULT '',
    traits TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===================== 素材资料表（执书委员上传） =====================
CREATE TABLE IF NOT EXISTS materials (
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

-- ===================== 操作审计日志 =====================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===================== 系统配置 =====================
CREATE TABLE IF NOT EXISTS system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO system_config (config_key, config_value)
VALUES ('default_grade', '八上');

-- ===================== 索引 =====================
CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
CREATE INDEX IF NOT EXISTS idx_records_grade ON records(grade);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_author ON records(author_id);
CREATE INDEX IF NOT EXISTS idx_materials_submitter ON materials(submitter_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
