// js/modal-extras.js
import { escapeHtml } from "../utils.js";
import {
    EXTERNAL_LINKS,
    CONTACT_PERSONS,
    ensureShortcuts,
    onModalOpen,
    bindModalClose
} from "../core/common.js";

ensureShortcuts();

// ---------- 加入我们模态框 ----------
export function showJoinUsModal() {
    const modalId = "joinUsModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container" style="max-width: 450px;">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <h3 style="color: var(--accent); margin-bottom: 20px;">🤝 加入我们</h3>
                    <p style="margin-bottom: 20px; color: var(--text-secondary);">欢迎加入班史编纂委员会！请联系以下负责人：</p>
                    <div id="contactList" style="display: flex; flex-direction: column; gap: 16px;"></div>
                    <p style="margin-top: 20px; font-size: 0.9rem; color: var(--text-muted);">请搜索微信号添加好友，备注“班史加入”</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalClose(modal, modalId);
    }
    const listContainer = document.getElementById("contactList");
    listContainer.innerHTML = "";
    CONTACT_PERSONS.forEach(person => {
        const item = document.createElement("div");
        item.style.cssText = "background: var(--card-bg); border-radius: 12px; padding: 14px 18px; border: 1px solid var(--border-light);";
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.8rem;">👤</span>
                <div>
                    <div style="font-weight: 600; color: var(--accent);">${escapeHtml(person.name)}</div>
                    <div style="font-family: monospace; color: var(--text-primary);">微信号：${escapeHtml(person.wechat)}</div>
                </div>
            </div>
        `;
        listContainer.appendChild(item);
    });
    modal.classList.remove("hidden");
    onModalOpen(modalId);
}

// ---------- 如何投稿模态框 ----------
export function showContributeModal() {
    const modalId = "contributeModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container" style="max-width: 600px;">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <h3 style="color: var(--accent); margin-bottom: 20px;">📝 如何投稿</h3>
                    <div style="color: var(--text-primary); line-height: 1.8;">
                        <p>欢迎向班史编纂委员会投稿！投稿内容可为班级趣事、人物轶事、重大事件等。</p>
                        <p><strong>投稿方式：</strong></p>
                        <ul style="margin-left: 20px; color: var(--text-secondary);">
                            <li>发送邮件至：<span style="font-family: monospace;">qingranoffice@icloud.com</span></li>
                            <li>或联系编委会成员直接提交（见“加入我们”获取联系方式）</li>
                        </ul>
                        <p><strong>投稿要求：</strong></p>
                        <ul style="margin-left: 20px; color: var(--text-secondary);">
                            <li>内容真实、语言生动，可采用文言或白话。</li>
                            <li>涉及人物请使用真实姓名或常用昵称。</li>
                            <li>可附带图片、截图等素材。</li>
                        </ul>
                        <p style="margin-top: 20px;">📬 我们会在收到投稿后 5 个工作日内审核回复。</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalClose(modal, modalId);
    }
    modal.classList.remove("hidden");
    onModalOpen(modalId);
}

// ---------- 新手指南模态框 ----------
export function showGuideModal() {
    const modalId = "guideModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container" style="max-width: 650px;">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <h3 style="color: var(--accent); margin-bottom: 20px;">📘 新手指南</h3>
                    <div style="color: var(--text-primary); line-height: 1.8;">
                        <p><strong>🔍 搜索：</strong>点击顶部搜索框，可输入关键词并筛选按人物/时间查找史事。</p>
                        <p><strong>🎲 随机品读：</strong>点击“随机品读”按钮，可随机抽取一条记录，支持按人物/时间段筛选。</p>
                        <p><strong>📜 浏览正史：</strong>点击“正史”后选择年级，查看对应年级的纪传。</p>
                        <p><strong>👥 相关人物：</strong>点击“相关人物”可查看所有登场人物，点击卡片可查看其详细事迹。</p>
                        <p><strong>📖 纪传详情：</strong>点击时间轴卡片可查看完整内容、史官注释及相关人物。</p>
                        <p><strong>⭐ 提示：</strong>页面支持响应式，手机、平板均可流畅使用。</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalClose(modal, modalId);
    }
    modal.classList.remove("hidden");
    onModalOpen(modalId);
}

// ---------- 免责协议模态框 ----------
export function showDisclaimerModal() {
    const modalId = "disclaimerModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "history-modal hidden";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container" style="max-width: 700px;">
                <button class="modal-close-btn">✕</button>
                <div class="modal-content">
                    <h3 style="color: var(--accent); margin-bottom: 20px;">⚖️ 免责声明</h3>
                    <div style="color: var(--text-primary); line-height: 1.8; max-height: 400px; overflow-y: auto; padding-right: 8px;">
                        <p>本网站（2025级15班班级史记）为班级内部记录平台，仅供同学间娱乐、留念，不代表任何官方立场。</p>
                        <p>所有内容均基于真实事件改编，人物均为化名或昵称，如有雷同纯属巧合。若当事人对记载内容有异议，可联系编纂委员会进行修改或删除。</p>
                        <p>本网站不收集用户隐私信息，登录验证仅用于内部访问控制。</p>
                        <p>最终解释权归壹拾伍班班史编纂委员会所有。</p>
                    </div>
                    <div style="margin-top: 20px; text-align: right;">
                        <a href="${EXTERNAL_LINKS.disclaimer}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dashed;">📄 查看完整协议（PDF）</a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModalClose(modal, modalId);
    }
    modal.classList.remove("hidden");
    onModalOpen(modalId);
}