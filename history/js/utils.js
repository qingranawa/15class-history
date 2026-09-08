// 通用工具函数
export function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}

export function parseCustomTags(str) {
    const tagMap = {
        "b": { open: "<strong>", close: "</strong>" },
        "l": { open: "<em>", close: "</em>" },
        "=": { open: "<div style=\"text-align:center;\">", close: "</div>" },
        "poem": { open: "<div class=\"poem\">", close: "</div>" }
    };
    const regex = /\[([a-z=]+)\]([\s\S]*?)\[\/\1\]/;
    let match;
    let result = str;
    while ((match = regex.exec(result)) !== null) {
        const tag = match[1];
        const inner = match[2];
        const innerParsed = parseCustomTags(inner);
        const replacement = tagMap[tag]
            ? `${tagMap[tag].open}${innerParsed}${tagMap[tag].close}`
            : `[${tag}]${innerParsed}[/${tag}]`;
        result = result.substring(0, match.index) + replacement + result.substring(match.index + match[0].length);
    }
    return result;
}

export function formatContent(content) {
    if (!content) return "";
    // 统一换行格式，连续两个 <br> 才能稳定保留空一行。
    const normalizedContent = String(content).replace(/\r\n?/g, "\n");
    return parseCustomTags(normalizedContent).replace(/\n/g, "<br>");
}

export function sortByDate(records) {
    return [...records].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
    });
}

// 安全获取全局数据
export function getSafeData(dataName) {
    const fallback = dataName === "characters" ? [] : { records: [] };
    return typeof window[dataName] !== "undefined" ? window[dataName] : fallback;
}
