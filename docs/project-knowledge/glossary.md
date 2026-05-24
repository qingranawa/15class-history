---
last_updated: 2026-05-24
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Glossary

- **正史 (zhengshi)** — 班级正式历史事件记录。→ `history/data.js` `historyData`
- **外史 (waishi)** — 班级非正式/课外事件记录。→ `history/data.js` `extraHistory`
- **戏史 (xishi)** — 班级搞笑/戏剧性事件记录。→ `history/data.js` `dramaHistory`
- **稿件 / 史事记录** — 数据库中一条历史事件。→ `worker/src/routes/records.js`
- **素材资料** — 用户投稿的参考材料，经整理后供执笔委员写史用。→ `worker/src/routes/materials.js`
- **人物档案** — 班级成员和教师的信息档案。→ `worker/src/routes/characters.js`
- **status 字段** — 稿件/素材在审核流程中的状态标识，控制可见性和可操作性。→ architecture.md §Key Object FSMs
- **执笔委员 (DraftWriter)** — 编写史事稿件、提交审核的角色。→ `worker/src/utils.js` ROLE_LEVELS=2
- **执书委员 (MaterialCollector)** — 整理用户投稿、管理素材状态的角色。→ ROLE_LEVELS=1
- **审定委员 (Reviewer)** — 审核稿件、通过/驳回的角色。→ ROLE_LEVELS=3
- **总监制委员 (SupervisorGeneral) / 总副监制委员 (DeputySupervisor)** — 管理所有内容 + 下级账号。→ ROLE_LEVELS=4
- **主任委员 (Chairperson) / 常务副主任委员 (ExecutiveDeputyChair)** — 超级管理员。→ ROLE_LEVELS=5
