// js/main.js
import { initControls, initRandomRead, initSearchTrigger } from "./controls.js";
import { initBackToTop, initParallaxHeader } from "../effects/animations.js";
import { initStats } from "../features/stats.js";
import { showGraphModal } from "../features/graph.js";

function initHistory() {
    if (window._historyInitialized) return; // 避免重复执行
    if (typeof historyData === "undefined") {
        console.error("historyData 未定义");
        return;
    }
    initControls();
    initBackToTop();
    initRandomRead();
    initSearchTrigger();
    initParallaxHeader();
    initStats();
    window._historyInitialized = true;
}

window.initHistory = initHistory;
window.showGraphModal = showGraphModal;

// 处理 dev 模式下 auth.js 无法调用 initHistory 的时序问题
if (document.getElementById("mainContent") && !document.getElementById("mainContent").classList.contains("hidden")) {
    if (!window._historyInitialized) {
        initHistory();
    }
}
