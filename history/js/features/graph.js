// js/graph.js — 关系图谱
/* global historyData, extraHistory, dramaHistory, characters, vis */
import { showCharacterModal } from "../ui/modal.js";
import { onModalOpen, bindModalClose } from "../core/common.js";

let networkInstance = null;

function getAllRecords() {
    const d = typeof historyData !== "undefined" ? historyData.records : [];
    const e = typeof extraHistory !== "undefined" ? extraHistory.records : [];
    const dr = typeof dramaHistory !== "undefined" ? dramaHistory.records : [];
    return [...d, ...e, ...dr];
}

function getCharacters() {
    return typeof characters !== "undefined" ? characters : [];
}

function getNodeStyle(count) {
    const isKeyNode = count >= 4;
    return {
        font: {
            size: isKeyNode ? 26 : 22,
            color: "#171714",
            face: "Noto Sans SC",
            strokeWidth: 0
        },
        color: {
            background: isKeyNode ? "#f1e4df" : "#ffffff",
            border: "#a33a2a",
            highlight: {
                background: "#ead1ca",
                border: "#8f2f22"
            }
        }
    };
}

function getEdgeStyle(count) {
    return {
        width: Math.max(1, Math.min(6, count)),
        color: {
            color: "rgba(163, 58, 42, 0.18)",
            highlight: "rgba(163, 58, 42, 0.68)"
        },
        title: `共同出现 ${count} 次`,
        smooth: { type: "continuous" }
    };
}

// 构建人物关联数据
function buildGraphData() {
    const records = getAllRecords();
    const chars = getCharacters();
    const nodes = [];
    const edges = [];
    const nodeMap = {};

    chars.forEach(c => {
        const name = c.name.toLowerCase();
        const nicks = (c.nicknames || []).map(n => n.toLowerCase());
        const relatedRecords = records.filter(r => {
            const text = (r.title + r.content).toLowerCase();
            return text.includes(name) || nicks.some(n => text.includes(n));
        });
        const count = relatedRecords.length;
        const id = `char_${c.name}`;
        const size = Math.max(36, Math.min(72, 36 + count * 7));
        nodes.push({
            id,
            label: c.name,
            title: `${c.name}<br>出场 ${count} 次`,
            size,
            borderWidth: 2,
            ...getNodeStyle(count),
            shape: "dot"
        });
        nodeMap[id] = true;
    });

    // 通过共同出现的记录构建连线
    const charPairs = {};
    chars.forEach((c1, i) => {
        const name1 = c1.name.toLowerCase();
        const nicks1 = (c1.nicknames || []).map(n => n.toLowerCase());
        const c1Records = records.filter(r => {
            const text = (r.title + r.content).toLowerCase();
            return text.includes(name1) || nicks1.some(n => text.includes(n));
        });
        const c1Set = new Set(c1Records.map(r => r.id || r.title));

        chars.slice(i + 1).forEach(c2 => {
            const name2 = c2.name.toLowerCase();
            const nicks2 = (c2.nicknames || []).map(n => n.toLowerCase());
            const c2Records = records.filter(r => {
                const text = (r.title + r.content).toLowerCase();
                return text.includes(name2) || nicks2.some(n => text.includes(n));
            });
            const shared = c1Records.filter(r => c2Records.some(r2 => (r2.id || r2.title) === (r.id || r.title)));

            if (shared.length > 0) {
                const pairKey = [c1.name, c2.name].sort().join("||");
                if (!charPairs[pairKey]) {
                    charPairs[pairKey] = {
                        from: `char_${c1.name}`,
                        to: `char_${c2.name}`,
                        count: shared.length,
                        records: shared
                    };
                }
            }
        });
    });

    Object.values(charPairs).forEach(p => {
        edges.push({
            from: p.from,
            to: p.to,
            ...getEdgeStyle(p.count)
        });
    });

    return { nodes, edges };
}

function downloadGraph() {
    const network = document.getElementById("graphNetwork");
    if (!network || !networkInstance) return;

    // 从 vis-network 拿到 canvas 元素
    const canvasEl = network.querySelector("canvas");
    if (!canvasEl) return;

    // 目标输出尺寸 1200x1500（4:5 比例）
    const OUT_W = 1200, OUT_H = 1500;

    // 暂存原始实际尺寸（getBoundingClientRect 返回 px 整数）
    const origRect = network.getBoundingClientRect();

    // 放大容器，让 vis-network 在高分辨率下重绘
    network.style.width = OUT_W + "px";
    network.style.height = OUT_H + "px";
    networkInstance.setSize(OUT_W, OUT_H);
    networkInstance.fit({ animation: false });

    // 等两帧让 canvas 完成绘制
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // 此时 canvasEl 已经以 OUT_W x OUT_H 渲染完毕
            const out = document.createElement("canvas");
            out.width = OUT_W;
            out.height = OUT_H;
            const ctx = out.getContext("2d");
            ctx.drawImage(canvasEl, 0, 0, OUT_W, OUT_H);

            out.toBlob(blob => {
                // 恢复原始尺寸
                network.style.width = origRect.width + "px";
                network.style.height = origRect.height + "px";
                networkInstance.setSize(origRect.width, origRect.height);
                networkInstance.fit({ animation: false });

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "人物关系图谱.png";
                a.click();
                URL.revokeObjectURL(url);
            });
        });
    });
}

export function showGraphModal() {
    const modalId = "graphModal";
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal graph-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <button class="modal-close-btn" aria-label="关闭人物关系图谱">✕</button>
                <div class="modal-content">
                    <div class="graph-modal__header">
                        <span class="graph-modal__eyebrow">关系档案</span>
                        <h3>人物关系图谱</h3>
                        <p class="graph-modal__description">节点大小表示出场次数，连线越粗表示共同出现越多。</p>
                    </div>
                    <div id="graphNetwork"></div>
                    <div class="graph-legend">
                        <span class="graph-legend-item">
                            <span class="graph-legend-dot graph-legend-dot--node" aria-hidden="true"></span>
                            人物节点
                        </span>
                        <span class="graph-legend-item">
                            <span class="graph-legend-dot graph-legend-dot--edge" aria-hidden="true"></span>
                            关联线
                        </span>
                    </div>
                    <div class="graph-modal__actions">
                        <button id="downloadGraphBtn" class="search-action-btn secondary">下载图谱</button>
                    </div>
                </div>
            </div>
        `;

        // 下载图谱按钮
        modal.querySelector("#downloadGraphBtn").addEventListener("click", downloadGraph);
        document.body.appendChild(modal);
        bindModalClose(modal, modalId, () => {
            if (networkInstance) {
                networkInstance.destroy();
                networkInstance = null;
            }
        });
    }

    modal.classList.remove("hidden");
    onModalOpen(modalId);

    // 渲染图谱，等模态框可见后获取正确尺寸
    requestAnimationFrame(() => initGraph(modal));
}

function initGraph(modal) {
    const container = document.getElementById("graphNetwork");
    if (!container) return;

    // 检查 vis 库是否加载
    if (typeof vis === "undefined") {
        container.innerHTML = "<p class=\"graph-empty\">关系图谱加载中…</p>";
        setTimeout(() => initGraph(modal), 500);
        return;
    }

    const { nodes: nodesData, edges: edgesData } = buildGraphData();

    if (nodesData.length === 0) {
        container.innerHTML = "<p class=\"graph-empty\">暂无人物数据</p>";
        return;
    }

    // 销毁旧实例
    if (networkInstance) {
        networkInstance.destroy();
        networkInstance = null;
    }

    // 清空容器
    container.innerHTML = "";

    // 锁定容器高度（防止 flex + vis 无限循环撑大）
    const rect = container.getBoundingClientRect();
    if (rect.height > 0) {
        container.style.height = rect.height + "px";
    } else {
        container.style.height = "400px";
    }

    const nodes = new vis.DataSet(nodesData);
    const edges = new vis.DataSet(edgesData);

    let physicsEnabled = true;

    const options = {
        layout: {
            improvedLayout: true,
            randomSeed: "15class-history"
        },
        physics: {
            enabled: true,
            solver: "barnesHut",
            stabilization: {
                iterations: 100,
                updateInterval: 25
            },
            barnesHut: {
                gravitationalConstant: -5000,
                springLength: 280,
                springConstant: 0.025,
                damping: 0.1
            },
            maxVelocity: 20
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            navigationButtons: false,
            keyboard: false
        },
        edges: {
            smooth: { type: "curvedCW", roundness: 0.2 }
        },
        nodes: {
            shape: "dot",
            font: { face: "Noto Sans SC", size: 22, color: "#171714", strokeWidth: 0 },
            scaling: { label: { enabled: false } },
            borderWidth: 2,
            color: {
                background: "#ffffff",
                border: "#a33a2a",
                highlight: { background: "#f1e4df", border: "#8f2f22" }
            }
        },
        height: container.style.height
    };

    networkInstance = new vis.Network(container, { nodes, edges }, options);

    // 稳定完成后关闭物理引擎，避免无限移动撑大页面
    networkInstance.on("stabilizationIterationsDone", () => {
        if (physicsEnabled) {
            physicsEnabled = false;
            networkInstance.setOptions({ physics: { enabled: false } });
        }
    });

    // 阻止图上点击冒泡导致 overlay 关闭
    container.addEventListener("click", (e) => e.stopPropagation());

    networkInstance.on("click", (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const chars = getCharacters();
            const charName = nodeId.replace("char_", "");
            const char = chars.find(c => c.name === charName);
            if (char) {
                // 带退出动画关闭图谱 → 打开人物详情
                modal.classList.add("closing");
                setTimeout(() => {
                    modal.classList.add("hidden");
                    modal.classList.remove("closing");
                    showCharacterModal(char);
                }, 150);
            }
        }
    });
}
