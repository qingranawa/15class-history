// js/stats.js — 统计看板
/* global historyData, extraHistory, dramaHistory, characters, Chart */
let chartInstance = null;

// 获取全局数据
function getAllRecords() {
    const d = typeof historyData !== "undefined" ? historyData.records : [];
    const e = typeof extraHistory !== "undefined" ? extraHistory.records : [];
    const dr = typeof dramaHistory !== "undefined" ? dramaHistory.records : [];
    return [...d, ...e, ...dr];
}

function getCharacters() {
    return typeof characters !== "undefined" ? characters : [];
}

// 人物出场统计
function getCharacterStats() {
    const records = getAllRecords();
    const chars = getCharacters();
    return chars.map(c => {
        const name = c.name.toLowerCase();
        const nicks = (c.nicknames || []).map(n => n.toLowerCase());
        const count = records.filter(r => {
            const text = (r.title + r.content).toLowerCase();
            return text.includes(name) || nicks.some(n => text.includes(n));
        }).length;
        return { name: c.name, count, nicknames: c.nicknames };
    }).sort((a, b) => b.count - a.count);
}

// 字数分布统计
function getLengthStats() {
    const records = getAllRecords();
    const grades = {};
    records.forEach(r => {
        const g = r.grade || "其他";
        if (!grades[g]) grades[g] = { count: 0, total: 0, records: [] };
        grades[g].count++;
        grades[g].total += (r.content || "").length;
        grades[g].records.push(r);
    });
    return Object.entries(grades).map(([grade, data]) => ({
        grade,
        count: data.count,
        avgLength: Math.round(data.total / data.count),
        totalLength: data.total
    })).sort((a, b) => a.grade.localeCompare(b.grade));
}

// 时间分布统计
function getTimelineStats() {
    const records = getAllRecords().filter(r => r.date);
    const months = {};
    records.forEach(r => {
        const d = new Date(r.date);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));
}

function getColor(ctx, alpha = 1) {
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim();
    const light = style.getPropertyValue("--accent-light").trim();
    const dim = style.getPropertyValue("--accent-dim").trim();
    return { accent, light, dim };
}

function renderCharacterChart() {
    const canvas = document.getElementById("statsChart");
    if (!canvas) return;
    const data = getCharacterStats().slice(0, 15);
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim();

    if (chartInstance) chartInstance.destroy();

    const ctx = canvas.getContext("2d");
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: "出场次数",
                data: data.map(d => d.count),
                backgroundColor: "rgba(201, 169, 89, 0.6)",
                borderColor: accent,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#1a1e26",
                    titleColor: accent,
                    bodyColor: "#e6e9f0",
                    borderColor: "rgba(201,169,89,0.3)",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: { color: "#9aa1af" },
                    grid: { color: "rgba(255,255,255,0.05)" }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#9aa1af", stepSize: 1 },
                    grid: { color: "rgba(255,255,255,0.05)" }
                }
            }
        }
    });
}

function renderLengthChart() {
    const canvas = document.getElementById("statsChart");
    if (!canvas) return;
    const data = getLengthStats();
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim();

    if (chartInstance) chartInstance.destroy();

    const ctx = canvas.getContext("2d");
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map(d => d.grade),
            datasets: [
                {
                    label: "平均字数",
                    data: data.map(d => d.avgLength),
                    backgroundColor: "rgba(201, 169, 89, 0.4)",
                    borderColor: accent,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#1a1e26",
                    titleColor: accent,
                    bodyColor: "#e6e9f0",
                    borderColor: "rgba(201,169,89,0.3)",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: { color: "#9aa1af" },
                    grid: { color: "rgba(255,255,255,0.05)" }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#9aa1af" },
                    grid: { color: "rgba(255,255,255,0.05)" }
                }
            }
        }
    });
}

function renderTimelineChart() {
    const canvas = document.getElementById("statsChart");
    if (!canvas) return;
    const data = getTimelineStats();
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim();

    if (chartInstance) chartInstance.destroy();

    if (data.length === 0) {
        const parent = canvas.parentElement;
        parent.innerHTML = "<p class=\"stats-empty\">暂无时间数据</p>";
        return;
    }

    const ctx = canvas.getContext("2d");
    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.month),
            datasets: [{
                label: "史事数量",
                data: data.map(d => d.count),
                borderColor: accent,
                backgroundColor: "rgba(201, 169, 89, 0.1)",
                fill: true,
                tension: 0.3,
                pointBackgroundColor: accent,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#1a1e26",
                    titleColor: accent,
                    bodyColor: "#e6e9f0",
                    borderColor: "rgba(201,169,89,0.3)",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: { color: "#9aa1af" },
                    grid: { color: "rgba(255,255,255,0.05)" }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#9aa1af", stepSize: 1 },
                    grid: { color: "rgba(255,255,255,0.05)" }
                }
            }
        }
    });
}

export function initStats() {
    const tabs = document.querySelectorAll(".stats-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const chart = tab.dataset.chart;
            switch (chart) {
                case "characters": renderCharacterChart(); break;
                case "length": renderLengthChart(); break;
                case "timeline": renderTimelineChart(); break;
            }
        });
    });
}

export function renderStats() {
    // 等待 DOM 就绪
    const canvas = document.getElementById("statsChart");
    if (!canvas) return;

    // 如果 Chart.js 还没加载完，延迟重试
    if (typeof Chart === "undefined") {
        setTimeout(renderStats, 300);
        return;
    }

    renderCharacterChart();
}
