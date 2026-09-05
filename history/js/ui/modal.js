// js/modal.js
import { escapeHtml, formatContent } from "../utils.js";
import {
    EXTERNAL_LINKS,
    safeHistoryData,
    safeExtraHistory,
    safeDramaHistory,
    safeCharacters,
    getAllGrades,
    ensureShortcuts,
    onModalOpen,
    bindModalClose
} from "../core/common.js";

ensureShortcuts();

// ---------- 纪传模态框 ----------
export function getRecordModal() {
    const modalId = "recordModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <div id="modalDetailCard" class="detail-card"></div>
                    <div class="notes-section">
                        <h3>📌 史官注释</h3>
                        <div id="modalNotesContent" class="notes-content"></div>
                    </div>
                    <div class="related-chars-section">
                        <h3>👥 本卷相关人物</h3>
                        <div id="modalRelatedGrid" class="related-chars-grid"></div>
                    </div>
                    <div id="modalShareSection" style="text-align:center;margin-top:24px;">
                        <button id="shareRecordBtn" class="search-action-btn primary" style="display:inline-block;">📤 分享此篇</button>
                    </div>
                    <div id="modalCommentsContainer"></div>
                    <div class="footer-links">
                        <a class="footer-link" href="${EXTERNAL_LINKS.disclaimer}" target="_blank" rel="noopener noreferrer">📜 免责声明</a>
                        <a class="footer-link" href="${EXTERNAL_LINKS.compilation}" target="_blank" rel="noopener noreferrer">✍️ 入史编纂办法</a>
                        <a class="footer-link" href="joinus.html">🤝 加入我们</a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalClose(modal, modalId);
    }
    return modal;
}

export function showRecordModal(record) {
    const modal = getRecordModal();
    document.getElementById("modalDetailCard").innerHTML = `
        <h2>${escapeHtml(record.title)}</h2>
        <div class="content">${formatContent(record.content)}</div>
        <div class="honorific">${escapeHtml(record.honorific).replace(/\n/g, "<br>")}</div>
    `;
    const notesDiv = document.getElementById("modalNotesContent");
    notesDiv.innerHTML = record.notes ? `<p>${escapeHtml(record.notes)}</p>` : "<p class=\"empty-notes\">暂无注释。</p>";
    const related = findRelatedCharacters(record);
    const grid = document.getElementById("modalRelatedGrid");
    if (related.length) {
        grid.innerHTML = "";
        related.forEach(char => {
            const card = document.createElement("div");
            card.className = "character-card";
            card.innerHTML = `<div class="char-name">${escapeHtml(char.name)}</div>
                ${char.nicknames?.length ? `<div class="char-nicknames">🏷️ ${char.nicknames.join(" · ")}</div>` : ""}
                <div class="char-desc">${escapeHtml(char.desc)}</div>`;
            card.addEventListener("click", () => { modal.classList.add("hidden"); showCharacterModal(char); });
            grid.appendChild(card);
        });
    } else {
        grid.innerHTML = "<p class=\"empty-related\">未识别到相关人物。</p>";
    }

    // 分享按钮
    const shareBtn = document.getElementById("shareRecordBtn");
    if (shareBtn) {
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.addEventListener("click", () => {
            import("../features/share.js").then(m => m.shareRecord(record));
        });
    }

    // 雁过留声 · 评注
    const recordId = record.id || record.title;
    const commentsContainer = document.getElementById("modalCommentsContainer");
    if (commentsContainer) {
        import("../features/comments.js").then(m => m.renderComments(recordId, commentsContainer));
    }

    modal.classList.remove("hidden");
    onModalOpen("recordModal");
}

// ---------- 人物模态框 ----------
export function getCharacterModal() {
    const modalId = "characterModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <div id="characterDetail" class="character-detail"></div>
                    <div class="related-records-section">
                        <h3>📖 出现的史事</h3>
                        <div id="relatedRecordsList" class="related-records-list"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalClose(modal, modalId);
    }
    return modal;
}

export function showCharacterModal(character) {
    const modal = getCharacterModal();
    document.getElementById("characterDetail").innerHTML = `
        <h2>${escapeHtml(character.name)}</h2>
        <div class="char-info"><strong>性别：</strong>${escapeHtml(character.gender || "未知")}</div>
        <div class="char-info"><strong>第一次入史年龄：</strong>${escapeHtml(String(character.firstAge || "不详"))}</div>
        <div class="char-info"><strong>特征：</strong>${escapeHtml(character.traits || "无")}</div>
        <div class="char-desc-full">${escapeHtml(character.desc)}</div>
    `;
    const records = findRelatedRecords(character);
    const list = document.getElementById("relatedRecordsList");
    if (records.length) {
        list.innerHTML = "";
        records.forEach(r => {
            const item = document.createElement("div");
            item.className = "related-record-item";
            item.innerHTML = `<div class="record-title">${escapeHtml(r.title)}</div>`;
            item.addEventListener("click", () => { modal.classList.add("hidden"); showRecordModal(r); });
            list.appendChild(item);
        });
    } else {
        list.innerHTML = "<p class=\"empty-related\">未发现相关史事。</p>";
    }
    modal.classList.remove("hidden");
    onModalOpen("characterModal");
}

// ---------- 辅助函数 ----------
// 辅助函数：去除自定义标签提取纯文本
function stripTags(text) {
    return text.replace(/\[[a-z=]+\]/g, "").replace(/\[\/[a-z=]+\]/g, "");
}

function findRelatedRecords(character) {
    const all = [...safeHistoryData.records, ...safeExtraHistory.records, ...safeDramaHistory.records];
    const name = character.name.toLowerCase();
    const nicks = (character.nicknames || []).map(n => n.toLowerCase());
    return all.filter(r => {
        const text = stripTags(r.title + r.content).toLowerCase();
        return text.includes(name) || nicks.some(n => text.includes(n));
    });
}
function findRelatedCharacters(record) {
    if (!safeCharacters.length) return [];
    const text = stripTags(record.title + record.content).toLowerCase();
    return safeCharacters.filter(c => {
        return text.includes(c.name.toLowerCase()) || (c.nicknames || []).some(n => text.includes(n.toLowerCase()));
    });
}

// ================== 搜索模态框 ==================
export function showSearchModal() {
    const modalId = "searchModal";
    let modal = document.getElementById(modalId);
    const globalDataSource = [...safeHistoryData.records, ...safeExtraHistory.records, ...safeDramaHistory.records];

    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal search-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <div class="search-modal-header">
                        <h3>🔍 史海钩沉</h3>
                        <div class="search-bar-inline">
                            <input type="text" id="innerSearchInput" class="inner-search-input" placeholder="输入关键词...">
                            <div class="search-actions">
                                <button id="innerSearchBtn" class="search-action-btn primary">搜索</button>
                                <button id="innerClearBtn" class="search-action-btn secondary">清除</button>
                            </div>
                        </div>
                        <div class="filter-group-modal" id="filterGroup">
                            <button class="filter-option active" data-filter="all">全部</button>
                            <button class="filter-option" data-filter="character">人物</button>
                            <button class="filter-option" data-filter="date">时间</button>
                            <button class="filter-option" data-filter="grade">年级</button>
                        </div>
                        <div id="characterSelectorContainer" class="character-selector hidden">
                            <select id="characterSelect"></select>
                        </div>
                        <div id="dateRangeContainer" class="date-range-picker hidden">
                            <input type="date" id="startDate"> <span>至</span>
                            <input type="date" id="endDate">
                            <button class="clear-date-btn" id="clearDateBtn">清除</button>
                        </div>
                        <div id="gradeSelectorContainer" class="character-selector hidden">
                            <select id="gradeSelect"></select>
                        </div>
                    </div>
                    <div class="search-results-area" id="searchResultsArea">
                        <p class="empty-notes">输入关键词开始搜索</p>
                    </div>
                    <div id="searchResultCount" style="text-align:right;margin-top:8px;font-size:0.85rem;color:var(--text-muted);"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalClose(modal, modalId);

        const innerInput = document.getElementById("innerSearchInput");
        const searchBtn = document.getElementById("innerSearchBtn");
        const clearBtn = document.getElementById("innerClearBtn");
        const resultCount = document.getElementById("searchResultCount");
        const filterOpts = modal.querySelectorAll(".filter-option");
        const charContainer = document.getElementById("characterSelectorContainer");
        const charSelect = document.getElementById("characterSelect");
        const dateContainer = document.getElementById("dateRangeContainer");
        const startDate = document.getElementById("startDate");
        const endDate = document.getElementById("endDate");
        const clearDateBtn = document.getElementById("clearDateBtn");
        const gradeContainer = document.getElementById("gradeSelectorContainer");
        const gradeSelect = document.getElementById("gradeSelect");
        const resultsArea = document.getElementById("searchResultsArea");

        let currentFilter = "all";

        const populateCharacters = () => {
            charSelect.innerHTML = "<option value=\"\">-- 选择人物 --</option>";
            safeCharacters.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.name;
                opt.textContent = `${c.name} ${c.nicknames?.length ? "(" + c.nicknames.join("/") + ")" : ""}`;
                charSelect.appendChild(opt);
            });
        };
        populateCharacters();

        const populateGrades = () => {
            gradeSelect.innerHTML = "<option value=\"\">-- 选择年级 --</option>";
            const grades = getAllGrades();
            grades.forEach(grade => {
                const opt = document.createElement("option");
                opt.value = grade;
                opt.textContent = grade;
                gradeSelect.appendChild(opt);
            });
        };
        populateGrades();

        filterOpts.forEach(opt => {
            opt.addEventListener("click", () => {
                filterOpts.forEach(o => o.classList.remove("active"));
                opt.classList.add("active");
                currentFilter = opt.dataset.filter;
                charContainer.classList.toggle("hidden", currentFilter !== "character");
                dateContainer.classList.toggle("hidden", currentFilter !== "date");
                gradeContainer.classList.toggle("hidden", currentFilter !== "grade");
                if (currentFilter !== "date") { startDate.value = ""; endDate.value = ""; }
                if (currentFilter !== "character") charSelect.value = "";
                if (currentFilter !== "grade") gradeSelect.value = "";
            });
        });

        clearDateBtn.addEventListener("click", () => { startDate.value = ""; endDate.value = ""; });

        // 防抖工具
        let searchTimer = null;
        const debouncedSearch = () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(performSearch, 250);
        };

        const performSearch = () => {
            const keyword = innerInput.value.trim().toLowerCase();
            let results = [...globalDataSource];

            if (keyword) {
                results = results.filter(r =>
                    (r.title || "").toLowerCase().includes(keyword) ||
                    (r.content || "").toLowerCase().includes(keyword) ||
                    (r.honorific || "").toLowerCase().includes(keyword) ||
                    (r.notes || "").toLowerCase().includes(keyword)
                );
            }

            if (currentFilter === "character") {
                const selectedChar = charSelect.value;
                if (selectedChar) {
                    const charObj = safeCharacters.find(c => c.name === selectedChar);
                    if (charObj) {
                        const searchNames = [charObj.name.toLowerCase(), ...(charObj.nicknames || []).map(n => n.toLowerCase())];
                        results = results.filter(r => {
                            const text = (r.title + r.content).toLowerCase();
                            return searchNames.some(n => text.includes(n));
                        });
                    }
                }
            } else if (currentFilter === "date") {
                const start = startDate.value ? new Date(startDate.value) : null;
                const end = endDate.value ? new Date(endDate.value) : null;
                results = results.filter(r => {
                    if (!r.date) return false;
                    const d = new Date(r.date);
                    if (isNaN(d)) return false;
                    if (start && d < start) return false;
                    if (end && d > end) return false;
                    return true;
                });
            } else if (currentFilter === "grade") {
                const selectedGrade = gradeSelect.value;
                if (selectedGrade) results = results.filter(r => r.grade === selectedGrade);
            }

            renderSearchResults(results, keyword, resultsArea, resultCount);
        };

        searchBtn.addEventListener("click", performSearch);
        innerInput.addEventListener("input", debouncedSearch);
        innerInput.addEventListener("keypress", e => e.key === "Enter" && performSearch());
        clearBtn.addEventListener("click", () => {
            innerInput.value = "";
            filterOpts.forEach(o => o.classList.remove("active"));
            filterOpts[0].classList.add("active");
            currentFilter = "all";
            charContainer.classList.add("hidden");
            dateContainer.classList.add("hidden");
            gradeContainer.classList.add("hidden");
            charSelect.value = "";
            startDate.value = ""; endDate.value = "";
            gradeSelect.value = "";
            resultsArea.innerHTML = "<p class=\"empty-notes\">输入关键词开始搜索</p>";
            if (resultCount) resultCount.textContent = "";
        });
    }
    modal.classList.remove("hidden");
    onModalOpen(modalId);
    // 自动聚焦
    setTimeout(() => document.getElementById("innerSearchInput")?.focus(), 100);
}

function renderSearchResults(results, keyword, container, countEl) {
    if (countEl) {
        countEl.textContent = results.length ? `共找到 ${results.length} 条结果` : "";
    }
    if (!results.length) {
        container.innerHTML = "<p class=\"empty-notes\">未找到匹配记录</p>";
        return;
    }
    const highlight = (text) => {
        if (!keyword) return escapeHtml(text);
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        return escapeHtml(text).replace(regex, "<span class=\"search-highlight\">$1</span>");
    };
    container.innerHTML = "";
    results.forEach((r, idx) => {
        const div = document.createElement("div");
        div.className = "result-item-compact";
        div.style.animationDelay = `${idx * 0.03}s`;
        const preview = r.content.replace(/\[[^\]]+\]/g, "").substring(0, 80) + "……";
        div.innerHTML = `
            <div class="result-title-compact">
                ${highlight(r.title)}
                <span class="result-grade-tag">${escapeHtml(r.grade || "")}</span>
            </div>
            <div class="result-preview">${highlight(preview)}</div>
        `;
        div.addEventListener("click", () => {
            document.getElementById("searchModal").classList.add("hidden");
            showRecordModal(r);
        });
        container.appendChild(div);
    });
}

// ================== 随机品读模态框 ==================
export function showRandomModal() {
    const modalId = "randomModal";
    let modal = document.getElementById(modalId);
    const globalDataSource = [...safeHistoryData.records, ...safeExtraHistory.records, ...safeDramaHistory.records];

    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal random-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <h3 style="color:var(--accent);">🎲 随机品读</h3>
                    <div class="random-filter-bar">
                        <button class="filter-option active" data-random-filter="all">全部</button>
                        <button class="filter-option" data-random-filter="character">按人物</button>
                        <button class="filter-option" data-random-filter="date">按时间段</button>
                        <button class="filter-option" data-random-filter="grade">按年级</button>
                    </div>
                    <div id="randomCharSelectContainer" class="character-selector hidden">
                        <select id="randomCharSelect"></select>
                    </div>
                    <div id="randomDateContainer" class="random-date-range hidden">
                        <div class="date-range-picker">
                            <input type="date" id="randomStartDate"> <span>至</span>
                            <input type="date" id="randomEndDate">
                            <button class="clear-date-btn" id="randomClearDate">清除</button>
                        </div>
                    </div>
                    <div id="randomGradeContainer" class="character-selector hidden">
                        <select id="randomGradeSelect"></select>
                    </div>
                    <div class="random-actions">
                        <button id="randomRollBtn" class="random-roll-btn">🎲 摇一签</button>
                    </div>
                    <div id="randomRecordDisplay" class="random-record-display">
                        <p class="empty-notes">点击「摇一签」开始</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const closeModal = bindModalClose(modal, modalId, () => {
            const rollBtn = document.getElementById("randomRollBtn");
            if (rollBtn) rollBtn.classList.remove("rolling");
        });

        const filterOpts = modal.querySelectorAll("[data-random-filter]");
        const charDiv = document.getElementById("randomCharSelectContainer");
        const charSelect = document.getElementById("randomCharSelect");
        const dateDiv = document.getElementById("randomDateContainer");
        const startDate = document.getElementById("randomStartDate");
        const endDate = document.getElementById("randomEndDate");
        const clearDate = document.getElementById("randomClearDate");
        const gradeDiv = document.getElementById("randomGradeContainer");
        const gradeSelect = document.getElementById("randomGradeSelect");
        const rollBtn = document.getElementById("randomRollBtn");
        const displayDiv = document.getElementById("randomRecordDisplay");

        let currentRandomFilter = "all";
        let abortController = new AbortController();

        safeCharacters.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.name;
            opt.textContent = `${c.name} ${c.nicknames?.length ? "(" + c.nicknames.join("/") + ")" : ""}`;
            charSelect.appendChild(opt);
        });

        const populateGrades = () => {
            gradeSelect.innerHTML = "<option value=\"\">-- 选择年级 --</option>";
            getAllGrades().forEach(grade => {
                const opt = document.createElement("option");
                opt.value = grade;
                opt.textContent = grade;
                gradeSelect.appendChild(opt);
            });
        };
        populateGrades();

        filterOpts.forEach(opt => {
            opt.addEventListener("click", () => {
                filterOpts.forEach(o => o.classList.remove("active"));
                opt.classList.add("active");
                currentRandomFilter = opt.dataset.randomFilter;
                charDiv.classList.toggle("hidden", currentRandomFilter !== "character");
                dateDiv.classList.toggle("hidden", currentRandomFilter !== "date");
                gradeDiv.classList.toggle("hidden", currentRandomFilter !== "grade");
                if (currentRandomFilter !== "date") { startDate.value = ""; endDate.value = ""; }
                if (currentRandomFilter !== "character") charSelect.value = "";
                if (currentRandomFilter !== "grade") gradeSelect.value = "";
            });
        });
        clearDate.addEventListener("click", () => { startDate.value = ""; endDate.value = ""; });

        const doRoll = () => {
            abortController.abort();
            abortController = new AbortController();
            const signal = abortController.signal;

            let pool = [...globalDataSource];
            if (currentRandomFilter === "character") {
                const sel = charSelect.value;
                if (!sel) { alert("请选择人物"); return; }
                const charObj = safeCharacters.find(c => c.name === sel);
                if (charObj) {
                    const names = [charObj.name.toLowerCase(), ...(charObj.nicknames || []).map(n => n.toLowerCase())];
                    pool = pool.filter(r => {
                        const text = (r.title + r.content).toLowerCase();
                        return names.some(n => text.includes(n));
                    });
                }
            } else if (currentRandomFilter === "date") {
                const start = startDate.value;
                const end = endDate.value;
                if (!start || !end) { alert("请选择完整时间段"); return; }
                const startD = new Date(start);
                const endD = new Date(end);
                pool = pool.filter(r => {
                    if (!r.date) return false;
                    const d = new Date(r.date);
                    return d >= startD && d <= endD;
                });
            } else if (currentRandomFilter === "grade") {
                const sel = gradeSelect.value;
                if (!sel) { alert("请选择年级"); return; }
                pool = pool.filter(r => r.grade === sel);
            }

            if (!pool.length) {
                displayDiv.innerHTML = "<p class=\"empty-notes\">无符合条件的记录</p>";
                return;
            }

            rollBtn.classList.add("rolling");
            rollBtn.textContent = "🎲 摇签中…";
            displayDiv.innerHTML = "<div class=\"random-loading\">🎲 摇签中...</div>";

            setTimeout(() => {
                if (signal.aborted) return;
                const rec = pool[Math.floor(Math.random() * pool.length)];
                displayDiv.innerHTML = `
                    <h4>${escapeHtml(rec.title)}</h4>
                    <div class="content">${formatContent(rec.content)}</div>
                    <div class="honorific">${escapeHtml(rec.honorific)}</div>
                `;
                displayDiv.style.cursor = "pointer";
                const onClick = () => {
                    closeModal();
                    showRecordModal(rec);
                    displayDiv.removeEventListener("click", onClick);
                };
                displayDiv.addEventListener("click", onClick, { signal });
                rollBtn.classList.remove("rolling");
                rollBtn.textContent = "🎲 再来一篇";
            }, 300);
        };
        rollBtn.addEventListener("click", doRoll);
        modal._abortController = abortController;
    }
    const displayDiv = document.getElementById("randomRecordDisplay");
    displayDiv.innerHTML = "<p class=\"empty-notes\">点击「摇一签」开始</p>";
    displayDiv.style.cursor = "default";
    const rollBtn = document.getElementById("randomRollBtn");
    if (rollBtn) {
        rollBtn.classList.remove("rolling");
        rollBtn.textContent = "🎲 摇一签";
    }
    modal.classList.remove("hidden");
    onModalOpen(modalId);
}
