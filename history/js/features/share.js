// js/share.js — 分享卡片
/* global html2canvas */
import { escapeHtml, formatContent } from "../utils.js";

export function shareRecord(record) {
    const card = document.createElement("div");
    card.style.cssText = `
        width: 600px;
        padding: 40px;
        background: linear-gradient(135deg, #0b0c0e 0%, #111316 50%, #0b0c0e 100%);
        border: 1px solid rgba(201, 169, 89, 0.3);
        border-radius: 20px;
        font-family: "Times New Roman", "Songti SC", serif;
        color: #e6e9f0;
        position: fixed;
        left: -9999px;
        top: 0;
        z-index: -1;
    `;

    let dateHtml = "";
    if (record.date) {
        const d = new Date(record.date);
        if (!isNaN(d)) {
            dateHtml = `<div style="color:#6b7380;font-size:0.8rem;margin-bottom:12px;">
                📅 ${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日
            </div>`;
        }
    }

    const gradeTag = record.grade
        ? `<span style="display:inline-block;background:rgba(201,169,89,0.15);color:#e0c47a;padding:2px 12px;border-radius:20px;font-size:0.75rem;margin-bottom:16px;">${escapeHtml(record.grade)}</span>`
        : "";

    card.innerHTML = `
        <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:2rem;color:#c9a959;font-weight:600;letter-spacing:0.15em;margin-bottom:8px;">
                ${escapeHtml(record.title)}
            </div>
            ${gradeTag}
            ${dateHtml}
        </div>
        <div style="font-size:0.95rem;line-height:1.8;color:#d0d3dc;text-align:justify;">
            ${formatContent(record.content)}
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px dashed rgba(201,169,89,0.2);text-align:right;color:#c9a959;font-size:0.85rem;">
            ${escapeHtml(record.honorific || "")}
        </div>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(201,169,89,0.1);text-align:center;color:#6b7380;font-size:0.75rem;">
            2025级15班 · 班级史记
        </div>
    `;

    document.body.appendChild(card);

    if (typeof html2canvas === "undefined") {
        card.remove();
        alert("html2canvas 加载中，请稍后再试");
        return;
    }

    html2canvas(card, {
        backgroundColor: "#0b0c0e",
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        card.remove();
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${record.title}_史记分享.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }).catch(err => {
        card.remove();
        console.error("分享卡片生成失败:", err);
        alert("生成分享卡片失败，请查看控制台错误");
    });
}
