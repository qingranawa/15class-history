// js/common.js
// 公共配置、全局状态、工具函数（供 modal.js 共享）
/* global historyData, extraHistory, dramaHistory, characters */

// ==================== 外部链接配置（请在此修改） ====================
export const EXTERNAL_LINKS = {
    disclaimer: "https://docs.qq.com/pdf/DR1pmTnV1QVZvbmdH",
    compilation: "https://example.com/compilation"
};

// ==================== 人事负责人微信信息（请在此修改） ====================
export const CONTACT_PERSONS = [
    { name: "主任", wechat: "mojingran0109" },
    { name: "副主任", wechat: "H2816401189" }
];

// ==================== 安全获取全局数据 ====================
export const safeHistoryData = typeof historyData !== "undefined" ? historyData : { records: [] };
export const safeExtraHistory = typeof extraHistory !== "undefined" ? extraHistory : { records: [] };
export const safeDramaHistory = typeof dramaHistory !== "undefined" ? dramaHistory : { records: [] };
export const safeCharacters = typeof characters !== "undefined" ? characters : [];

// 获取所有年级（用于筛选下拉框）
export function getAllGrades() {
    const gradesSet = new Set();
    safeHistoryData.records.forEach(record => {
        if (record.grade) gradesSet.add(record.grade);
    });
    return Array.from(gradesSet).sort();
}

// ==================== 全局快捷键管理 ====================
const activeModals = [];

export function pushModal(modalId) {
    if (!activeModals.includes(modalId)) activeModals.push(modalId);
}

export function popModal(modalId) {
    const index = activeModals.indexOf(modalId);
    if (index !== -1) activeModals.splice(index, 1);
}

export function getTopModal() {
    return activeModals.length > 0 ? activeModals[activeModals.length - 1] : null;
}

export function closeTopModal() {
    const topId = getTopModal();
    if (!topId) return false;
    const modal = document.getElementById(topId);
    if (modal && !modal.classList.contains("hidden")) {
        const closeBtn = modal.querySelector(".modal-close-btn");
        if (closeBtn) closeBtn.click();
        return true;
    }
    popModal(topId);
    return false;
}

export function initGlobalShortcuts() {
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            const mainContent = document.getElementById("mainContent");
            if (mainContent && !mainContent.classList.contains("hidden")) {
                if (activeModals.length === 0) {
                    const trigger = document.getElementById("searchTrigger");
                    if (trigger) trigger.click();
                }
            }
        }
        if (e.key === "Escape") {
            if (closeTopModal()) e.preventDefault();
        }
    });
}

// 初始化快捷键（仅执行一次）
let shortcutsInitialized = false;
export function ensureShortcuts() {
    if (!shortcutsInitialized) {
        initGlobalShortcuts();
        shortcutsInitialized = true;
    }
}

// ==================== 模态框打开/关闭辅助 ====================
export function onModalOpen(modalId) {
    pushModal(modalId);
    document.body.style.overflow = "hidden";
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("closing");
}

export function onModalClose(modalId) {
    popModal(modalId);
    if (activeModals.length === 0) document.body.style.overflow = "";
}

export function bindModalClose(modal, modalId, closeCallback) {
    const close = () => {
        if (modal.classList.contains("closing")) return;
        modal.classList.add("closing");
        const onAnimationEnd = () => {
            modal.classList.remove("closing");
            modal.classList.add("hidden");
            onModalClose(modalId);
            if (closeCallback) closeCallback();
            modal.removeEventListener("animationend", onAnimationEnd);
        };
        modal.addEventListener("animationend", onAnimationEnd, { once: true });
    };
    const overlay = modal.querySelector(".modal-overlay");
    const closeBtn = modal.querySelector(".modal-close-btn");
    overlay?.addEventListener("click", close);
    closeBtn?.addEventListener("click", close);
    return close;
}
