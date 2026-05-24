// js/render.js
import { escapeHtml, formatContent } from "../utils.js";
import { showRecordModal } from "./modal.js";

function showLoading(container) {
    container.innerHTML = `
        <div class="loading-skeleton">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
}

function showEmpty(container, message = "暂无记录") {
    container.innerHTML = `<div class="error-state">📭 ${escapeHtml(message)}</div>`;
}

function showError(container, message = "加载失败，请刷新重试") {
    container.innerHTML = `<div class="error-state">⚠️ ${escapeHtml(message)}</div>`;
}

export function renderCards(records, container) {
    try {
        if (!Array.isArray(records)) throw new Error("数据格式错误");

        // 空数据直接显示提示，不显示骨架屏
        if (records.length === 0) {
            showEmpty(container, "暂无史事记录");
            return;
        }

        // 直接渲染，不经过骨架屏，避免闪烁
        container.innerHTML = "";
        const timeline = document.createElement("ul");
        timeline.className = "timeline";
        container.appendChild(timeline);

        // 直接使用传进来的顺序（由 controls.js 的 sortRecords 处理）
        records.forEach(record => {
            const li = document.createElement("li");
            li.className = "timeline-event";
            const icon = document.createElement("label");
            icon.className = "timeline-event-icon";
            li.appendChild(icon);
            const copyDiv = document.createElement("div");
            copyDiv.className = "timeline-event-copy";

            let dateHtml = "";
            if (record.date) {
                const dateObj = new Date(record.date);
                if (!isNaN(dateObj)) {
                    const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
                    dateHtml = `<div class="timeline-event-thumbnail">📅 ${formattedDate}</div>`;
                }
            }

            const contentHtml = formatContent(record.content || "");
            const titleHtml = escapeHtml(record.title || "无标题");
            const honorificHtml = escapeHtml(record.honorific || "").replace(/\n/g, "<br>");

            copyDiv.innerHTML = `
                ${dateHtml}
                <h3>${titleHtml}</h3>
                <div class="content">${contentHtml}</div>
                <div class="honorific">${honorificHtml}</div>
            `;

            copyDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                showRecordModal(record);
            });

            li.appendChild(copyDiv);
            timeline.appendChild(li);
        });
    } catch (error) {
        console.error("渲染卡片失败:", error);
        showError(container);
    }
}

export function renderCharactersGrid(charactersData, container, onClickCallback) {
    showLoading(container);
    try {
        if (!Array.isArray(charactersData)) throw new Error("人物数据格式错误");
        container.innerHTML = "";
        const grid = document.createElement("div");
        grid.className = "characters-grid";
        container.appendChild(grid);

        charactersData.forEach(char => {
            const card = document.createElement("div");
            card.className = "character-card";
            const nicknamesHtml = char.nicknames && char.nicknames.length
                ? `<div class="char-nicknames">🏷️ ${char.nicknames.map(escapeHtml).join(" · ")}</div>`
                : "";
            card.innerHTML = `
                <div class="char-name">${escapeHtml(char.name)}</div>
                ${nicknamesHtml}
                <div class="char-desc">${escapeHtml(char.desc)}</div>
            `;
            card.addEventListener("click", () => onClickCallback(char));
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("渲染人物网格失败:", error);
        showError(container);
    }
}