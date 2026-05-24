// js/comments.js — 雁过留声 · 本地评注
import { escapeHtml } from "../utils.js";

const STORAGE_KEY_PREFIX = "hs_comments_";
const USER_NAME_KEY = "hs_comment_user";

function getComments(recordId) {
    try {
        const data = localStorage.getItem(STORAGE_KEY_PREFIX + recordId);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveComments(recordId, comments) {
    localStorage.setItem(STORAGE_KEY_PREFIX + recordId, JSON.stringify(comments));
}

function getCurrentUser() {
    const usernameInput = document.getElementById("username");
    if (usernameInput && usernameInput.value.trim()) {
        return usernameInput.value.trim();
    }
    // 尝试从 localStorage 取上次使用的名字
    const saved = localStorage.getItem(USER_NAME_KEY);
    if (saved) return saved;
    return "无名客";
}

function saveUserName(name) {
    if (name && name !== "无名客") {
        localStorage.setItem(USER_NAME_KEY, name);
    }
}

function formatTime(isoStr) {
    const d = new Date(isoStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function renderComments(recordId, container) {
    const comments = getComments(recordId);
    const userName = getCurrentUser();

    container.innerHTML = `
        <div class="comments-section">
            <h3>🪶 雁过留声</h3>
            <div class="comment-form">
                <input type="text" id="commentNameInput" class="comment-input"
                    placeholder="你的名字" value="${escapeHtml(userName)}"
                    style="max-width:140px;flex:none;">
                <textarea id="commentTextInput" class="comment-input"
                    placeholder="留下你的评注…" rows="2"></textarea>
                <button id="commentSubmitBtn" class="comment-submit-btn">留笔</button>
            </div>
            <div id="commentList" class="comment-list">
                ${comments.length === 0
                    ? "<p class=\"comment-empty\">暂无评注，做第一个留名者</p>"
                    : comments.map((c, i) => `
                        <div class="comment-item">
                            <div class="comment-meta">
                                <span class="comment-author">✍️ ${escapeHtml(c.author)}</span>
                                <span>
                                    <span class="comment-time">${formatTime(c.time)}</span>
                                    <button class="comment-delete-btn" data-index="${i}">✕</button>
                                </span>
                            </div>
                            <div class="comment-text">${escapeHtml(c.text)}</div>
                        </div>
                    `).join("")
                }
            </div>
        </div>
    `;

    // 绑定提交
    const submitBtn = container.querySelector("#commentSubmitBtn");
    const nameInput = container.querySelector("#commentNameInput");
    const textInput = container.querySelector("#commentTextInput");

    submitBtn.addEventListener("click", () => {
        const name = nameInput.value.trim() || "无名客";
        const text = textInput.value.trim();
        if (!text) return;

        saveUserName(name);

        const comments = getComments(recordId);
        comments.push({
            author: name,
            text,
            time: new Date().toISOString()
        });
        saveComments(recordId, comments);
        renderComments(recordId, container);
    });

    // Enter 提交
    textInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitBtn.click();
        }
    });

    // 绑定删除
    container.querySelectorAll(".comment-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            const comments = getComments(recordId);
            comments.splice(idx, 1);
            saveComments(recordId, comments);
            renderComments(recordId, container);
        });
    });
}
