// js/controls.js
/* global historyData, extraHistory, dramaHistory, characters */
import { renderCards, renderCharactersGrid } from "../ui/render.js";
import { showCharacterModal, showSearchModal, showRandomModal } from "../ui/modal.js";
import { initCardAnimations, addHonorificEffects, triggerViewEnter } from "../effects/animations.js";

export let currentDisplay = "zhengshi";
export let currentGrade = "";
export let currentLayout = "timeline"; // 'timeline' | 'grid'

const DEFAULT_GRADE = "七下";
const LATEST_COUNT = 10;

// ---------- 人物排序状态 ----------
export let currentCharacterSort = {
    type: "popularity",  // 'popularity' | 'alphabet' | 'descLength'
    order: "desc"        // 'asc' | 'desc'
};

// ---------- 史事排序状态 ----------
export let currentRecordSort = {
    type: "date",         // 'date' | 'characters' | 'length'
    order: "asc"          // 'asc' | 'desc'
};

let gradeSubmenu, gradeBtns, zhengshiBtn, latestBtn, waishiBtn, xishiBtn, charsBtn, statsBtn, grid, sortContainer;
let recordSortContainer, statsContainer, graphToggleContainer;

// ---------- URL 状态管理 ----------
function updateURLParams() {
    const url = new URL(window.location);
    if (currentDisplay === "grade" && currentGrade) {
        url.searchParams.set("view", "grade");
        url.searchParams.set("grade", currentGrade);
    } else if (currentDisplay === "zhengshi") {
        url.searchParams.set("view", "zhengshi");
        url.searchParams.delete("grade");
    } else if (currentDisplay === "latest") {
        url.searchParams.set("view", "latest");
        url.searchParams.delete("grade");
    } else if (currentDisplay === "waishi") {
        url.searchParams.set("view", "waishi");
        url.searchParams.delete("grade");
    } else if (currentDisplay === "xishi") {
        url.searchParams.set("view", "xishi");
        url.searchParams.delete("grade");
    } else if (currentDisplay === "characters") {
        url.searchParams.set("view", "characters");
        url.searchParams.delete("grade");
        url.searchParams.set("sort", currentCharacterSort.type);
        url.searchParams.set("order", currentCharacterSort.order);
    } else if (currentDisplay === "stats") {
        url.searchParams.set("view", "stats");
        url.searchParams.delete("grade");
    }
    window.history.replaceState(null, "", url);
}

function restoreFromURL() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const grade = params.get("grade");
    const sort = params.get("sort");
    const order = params.get("order");

    // 恢复排序状态
    if (sort && (sort === "popularity" || sort === "alphabet" || sort === "descLength")) {
        currentCharacterSort.type = sort;
    }
    if (order && (order === "asc" || order === "desc")) {
        currentCharacterSort.order = order;
    }

    if (view === "grade" && grade) {
        return { view: "grade", grade };
    } else if (view === "zhengshi") {
        return { view: "zhengshi" };
    } else if (view === "latest") {
        return { view: "latest" };
    } else if (view === "waishi") {
        return { view: "waishi" };
    } else if (view === "xishi") {
        return { view: "xishi" };
    } else if (view === "characters") {
        return { view: "characters" };
    } else if (view === "stats") {
        return { view: "stats" };
    }
    return null;
}

// ---------- 更新搜索触发框提示 ----------
function updateSearchTriggerPlaceholder() {
    const dataSource = getCurrentDataSource();
    const count = dataSource.length;
    const placeholder = document.querySelector(".search-placeholder");
    if (placeholder) {
        placeholder.textContent = `搜索 ${count} 条史事...`;
    }
}

function initDOMElements() {
    gradeSubmenu = document.getElementById("gradeSubmenu");
    gradeBtns = document.querySelectorAll(".grade-btn");
    zhengshiBtn = document.querySelector(".extra-btn[data-type=\"zhengshi\"]");
    latestBtn = document.querySelector(".extra-btn[data-type=\"latest\"]");
    waishiBtn = document.querySelector(".extra-btn[data-type=\"waishi\"]");
    xishiBtn = document.querySelector(".extra-btn[data-type=\"xishi\"]");
    charsBtn = document.querySelector(".extra-btn[data-type=\"characters\"]");
    statsBtn = document.querySelector(".extra-btn[data-type=\"stats\"]");
    grid = document.getElementById("chronicleGrid");
    sortContainer = document.getElementById("characterSortContainer");
    recordSortContainer = document.getElementById("recordSortContainer");
    statsContainer = document.getElementById("statsContainer");
    graphToggleContainer = document.getElementById("graphToggleContainer");
}

function setActiveMain(activeBtn) {
    document.querySelectorAll(".extra-btn").forEach(b => b.classList.remove("active"));
    activeBtn.classList.add("active");
}
function setActiveGrade(grade) {
    gradeBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.grade === grade));
}
function showGradeSubmenu(show) {
    gradeSubmenu.classList.toggle("hidden", !show);
}
function refreshUI() {
    initCardAnimations();
    addHonorificEffects();
    updateSearchTriggerPlaceholder();
    applyTimelineLayout();
    // 触发内容区入场动画
    if (grid && !grid.classList.contains("characters-mode")) {
        triggerViewEnter(grid);
    } else if (grid) {
        triggerViewEnter(grid);
    }
}

// ---------- 史事排序逻辑 ----------
function sortRecords(records) {
    if (!Array.isArray(records) || records.length === 0) return records;
    const sorted = [...records];
    const type = currentRecordSort.type;
    const order = currentRecordSort.order;

    sorted.sort((a, b) => {
        let valA, valB;
        if (type === "date") {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            valA = new Date(a.date).getTime();
            valB = new Date(b.date).getTime();
        } else if (type === "characters") {
            const allChars = typeof characters !== "undefined" ? characters : [];
            const countMatches = (text) => {
                return allChars.filter(c =>
                    text.includes(c.name.toLowerCase()) ||
                    (c.nicknames || []).some(n => text.includes(n.toLowerCase()))
                ).length;
            };
            valA = countMatches((a.title + a.content).toLowerCase());
            valB = countMatches((b.title + b.content).toLowerCase());
        } else { // length
            valA = (a.content || "").length;
            valB = (b.content || "").length;
        }
        return order === "asc" ? valA - valB : valB - valA;
    });
    return sorted;
}

function updateRecordSortControlsUI() {
    const sortSelect = document.getElementById("recordSortSelect");
    const orderBtn = document.getElementById("recordSortOrderBtn");
    if (sortSelect) sortSelect.value = currentRecordSort.type;
    if (orderBtn) orderBtn.textContent = currentRecordSort.order === "asc" ? "↑ 升序" : "↓ 降序";
}

function initRecordSortControls() {
    if (!recordSortContainer) return;
    const sortSelect = document.getElementById("recordSortSelect");
    const orderBtn = document.getElementById("recordSortOrderBtn");

    sortSelect?.addEventListener("change", (e) => {
        currentRecordSort.type = e.target.value;
        reRenderCurrentView();
    });

    orderBtn?.addEventListener("click", () => {
        currentRecordSort.order = currentRecordSort.order === "asc" ? "desc" : "asc";
        orderBtn.textContent = currentRecordSort.order === "asc" ? "↑ 升序" : "↓ 降序";
        reRenderCurrentView();
    });
}

function reRenderCurrentView() {
    if (currentDisplay === "zhengshi") {
        renderCards(sortRecords(historyData.records), grid);
    } else if (currentDisplay === "grade") {
        const filtered = historyData.records.filter(r => r.grade === currentGrade);
        renderCards(sortRecords(filtered), grid);
    } else if (currentDisplay === "latest") {
        switchToLatest();
    } else if (currentDisplay === "waishi") {
        renderCards(sortRecords(extraHistory?.records || []), grid);
    } else if (currentDisplay === "xishi") {
        renderCards(sortRecords(dramaHistory?.records || []), grid);
    }
    refreshUI();
}

// ---------- 布局切换 ----------
function applyTimelineLayout() {
    const timeline = grid.querySelector(".timeline");
    if (!timeline) return;
    if (currentLayout === "grid") {
        timeline.classList.add("grid-mode");
    } else {
        timeline.classList.remove("grid-mode");
    }
}

function updateLayoutToggleUI() {
    const btn = document.getElementById("layoutToggleBtn");
    if (!btn) return;
    const isGrid = currentLayout === "grid";
    btn.classList.toggle("active", isGrid);
    btn.title = isGrid ? "切换到单排" : "切换到双排";
    btn.innerHTML = isGrid ? "⊞ 单排" : "⊞ 双排";
}

function initLayoutToggle() {
    const btn = document.getElementById("layoutToggleBtn");
    if (!btn) return;
    // 移动端直接移除按钮，不留任何痕迹
    if (window.innerWidth <= 600) {
        btn.remove();
        document.querySelector(".record-controls-sep")?.remove();
        return;
    }
    btn.addEventListener("click", () => {
        currentLayout = currentLayout === "grid" ? "timeline" : "grid";
        updateLayoutToggleUI();
        applyTimelineLayout();
    });
}

// ---------- 统计视图 ----------
function hideAllExtra() {
    if (statsContainer) statsContainer.classList.add("hidden");
    if (graphToggleContainer) graphToggleContainer.classList.add("hidden");
    if (recordSortContainer) recordSortContainer.classList.add("hidden");
    if (sortContainer) sortContainer.classList.add("hidden");
}

export function switchToStats() {
    currentDisplay = "stats";
    grid.classList.remove("characters-mode");
    grid.innerHTML = "";
    showGradeSubmenu(false);
    hideAllExtra();
    if (statsContainer) {
        statsContainer.classList.remove("hidden");
        triggerViewEnter(statsContainer);
    }
    // 导入并渲染统计
    import("../features/stats.js").then(m => m.renderStats());
    updateURLParams();
}

// ---------- 视图切换 ----------
export function switchToLatest() {
    currentDisplay = "latest";
    hideAllExtra();
    // 收集所有正史记录，按日期降序取最新 N 条
    const allRecords = historyData.records.filter(r => r.date);
    const dateDesc = (a, b) => new Date(b.date) - new Date(a.date) || 0;
    const latest = [...allRecords].sort(dateDesc).slice(0, LATEST_COUNT);
    renderCards(latest, grid);
    grid.classList.remove("characters-mode");
    showGradeSubmenu(false);
    updateURLParams();
    refreshUI();
}

export function switchToZhengshi() {
    currentDisplay = "zhengshi";
    hideAllExtra();
    renderCards(sortRecords(historyData.records), grid);
    grid.classList.remove("characters-mode");
    showGradeSubmenu(true);
    gradeBtns.forEach(b => b.classList.remove("active"));
    if (recordSortContainer) recordSortContainer.classList.remove("hidden");
    updateRecordSortControlsUI();
    updateURLParams();
    refreshUI();
}
export function switchToGrade(grade) {
    currentDisplay = "grade";
    currentGrade = grade;
    hideAllExtra();
    const filtered = historyData.records.filter(r => r.grade === grade);
    renderCards(sortRecords(filtered), grid);
    grid.classList.remove("characters-mode");
    showGradeSubmenu(true);
    setActiveGrade(grade);
    if (recordSortContainer) recordSortContainer.classList.remove("hidden");
    updateRecordSortControlsUI();
    updateURLParams();
    refreshUI();
}
export function switchToWaishi() {
    currentDisplay = "waishi";
    hideAllExtra();
    renderCards(sortRecords(extraHistory?.records || []), grid);
    grid.classList.remove("characters-mode");
    showGradeSubmenu(false);
    if (recordSortContainer) recordSortContainer.classList.remove("hidden");
    updateRecordSortControlsUI();
    updateURLParams();
    refreshUI();
}
export function switchToXishi() {
    currentDisplay = "xishi";
    hideAllExtra();
    renderCards(sortRecords(dramaHistory?.records || []), grid);
    grid.classList.remove("characters-mode");
    showGradeSubmenu(false);
    if (recordSortContainer) recordSortContainer.classList.remove("hidden");
    updateRecordSortControlsUI();
    updateURLParams();
    refreshUI();
}

// 人物排序逻辑
export function getSortedCharacters() {
    const chars = [...(characters || [])];
    const type = currentCharacterSort.type;
    const order = currentCharacterSort.order;

    const getRelatedCount = (char) => {
        const allRecords = [...historyData.records, ...(extraHistory?.records || []), ...(dramaHistory?.records || [])];
        const name = char.name.toLowerCase();
        const nicks = (char.nicknames || []).map(n => n.toLowerCase());
        return allRecords.filter(r => {
            const text = (r.title + r.content).toLowerCase();
            return text.includes(name) || nicks.some(n => text.includes(n));
        }).length;
    };

    const sorted = chars.sort((a, b) => {
        let valA, valB;
        if (type === "popularity") {
            valA = getRelatedCount(a);
            valB = getRelatedCount(b);
        } else if (type === "alphabet") {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
        } else { // descLength
            valA = (a.desc || "").length;
            valB = (b.desc || "").length;
        }

        if (typeof valA === "string") {
            return order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return order === "asc" ? valA - valB : valB - valA;
        }
    });
    return sorted;
}

export function switchToCharacters() {
    currentDisplay = "characters";
    hideAllExtra();
    const sortedChars = getSortedCharacters();
    renderCharactersGrid(sortedChars, grid, char => showCharacterModal(char));
    grid.classList.add("characters-mode");
    showGradeSubmenu(false);
    if (sortContainer) sortContainer.classList.remove("hidden");
    if (graphToggleContainer) graphToggleContainer.classList.remove("hidden");
    updateURLParams();
    refreshUI();
    updateSortControlsUI();
    triggerViewEnter(grid);
}

// 更新排序下拉菜单的显示状态
function updateSortControlsUI() {
    const sortSelect = document.getElementById("characterSortSelect");
    const orderBtn = document.getElementById("characterSortOrderBtn");
    if (sortSelect) {
        sortSelect.value = currentCharacterSort.type;
    }
    if (orderBtn) {
        orderBtn.textContent = currentCharacterSort.order === "asc" ? "↑ 升序" : "↓ 降序";
    }
}

// 绑定人物排序控件事件
function initCharacterSortControls() {
    if (!sortContainer) return;

    const sortSelect = document.getElementById("characterSortSelect");
    const orderBtn = document.getElementById("characterSortOrderBtn");

    sortSelect?.addEventListener("change", (e) => {
        currentCharacterSort.type = e.target.value;
        if (currentDisplay === "characters") {
            switchToCharacters(); // 重新渲染
        }
        updateURLParams();
    });

    orderBtn?.addEventListener("click", () => {
        currentCharacterSort.order = currentCharacterSort.order === "asc" ? "desc" : "asc";
        if (currentDisplay === "characters") {
            switchToCharacters();
        }
        updateURLParams();
        orderBtn.textContent = currentCharacterSort.order === "asc" ? "↑ 升序" : "↓ 降序";
    });
}

// ---------- 初始化控制 ----------
export function initControls() {
    initDOMElements();
    initCharacterSortControls(); // 初始化人物排序控件
    initRecordSortControls();    // 初始化史事排序控件
    initLayoutToggle();          // 初始化布局切换

    zhengshiBtn.addEventListener("click", () => { setActiveMain(zhengshiBtn); switchToZhengshi(); });
    latestBtn.addEventListener("click", () => { setActiveMain(latestBtn); switchToLatest(); });
    gradeBtns.forEach(btn => {
        btn.addEventListener("click", () => { setActiveMain(zhengshiBtn); switchToGrade(btn.dataset.grade); });
    });
    waishiBtn.addEventListener("click", () => { setActiveMain(waishiBtn); switchToWaishi(); });
    xishiBtn.addEventListener("click", () => { setActiveMain(xishiBtn); switchToXishi(); });
    charsBtn.addEventListener("click", () => { setActiveMain(charsBtn); switchToCharacters(); });
    statsBtn.addEventListener("click", () => { setActiveMain(statsBtn); switchToStats(); });

    // 关系图谱按钮
    const graphBtn = document.getElementById("graphToggleBtn");
    graphBtn?.addEventListener("click", () => {
        if (typeof window.showGraphModal === "function") {
            window.showGraphModal();
        } else {
            import("../features/graph.js").then(m => m.showGraphModal());
        }
    });

    const restored = restoreFromURL();
    if (restored) {
        setActiveMain(zhengshiBtn);
        if (restored.view === "grade" && restored.grade) {
            switchToGrade(restored.grade);
        } else if (restored.view === "zhengshi") {
            switchToZhengshi();
        } else if (restored.view === "latest") {
            setActiveMain(latestBtn);
            switchToLatest();
        } else if (restored.view === "waishi") {
            setActiveMain(waishiBtn);
            switchToWaishi();
        } else if (restored.view === "xishi") {
            setActiveMain(xishiBtn);
            switchToXishi();
        } else if (restored.view === "characters") {
            setActiveMain(charsBtn);
            switchToCharacters();
        } else if (restored.view === "stats") {
            setActiveMain(statsBtn);
            switchToStats();
        } else {
            switchToGrade(DEFAULT_GRADE);
        }
    } else {
        setActiveMain(zhengshiBtn);
        switchToGrade(DEFAULT_GRADE);
    }
}

export function getCurrentDataSource() {
    if (currentDisplay === "zhengshi") return historyData.records;
    if (currentDisplay === "grade") return historyData.records.filter(r => r.grade === currentGrade);
    if (currentDisplay === "latest") return historyData.records.filter(r => r.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, LATEST_COUNT);
    if (currentDisplay === "waishi") return extraHistory?.records || [];
    if (currentDisplay === "xishi") return dramaHistory?.records || [];
    return [];
}

export function initSearchTrigger() {
    const trigger = document.getElementById("searchTrigger");
    trigger?.addEventListener("click", () => {
        import("../ui/modal.js").then(m => m.showSearchModal());
    });
    updateSearchTriggerPlaceholder();
}

export function initRandomRead() {
    const btn = document.getElementById("randomBtn");
    btn?.addEventListener("click", () => {
        if (currentDisplay === "characters") {
            alert("人物视图暂不支持随机品读");
            return;
        }
        import("../ui/modal.js").then(m => m.showRandomModal());
    });
}

export function initPageNav() {
    const navBtns = document.querySelectorAll(".nav-btn");
    navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const navType = btn.dataset.nav;
            switch (navType) {
                case "contribute":
                    import("../ui/modal-extras.js").then(m => m.showContributeModal());
                    break;
                case "guide":
                    import("../ui/modal-extras.js").then(m => m.showGuideModal());
                    break;
                case "disclaimer":
                    import("../ui/modal-extras.js").then(m => m.showDisclaimerModal());
                    break;
                case "joinus":
                    import("../ui/modal-extras.js").then(m => m.showJoinUsModal());
                    break;
            }
        });
    });
}