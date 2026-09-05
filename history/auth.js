/* global historyData, extraHistory, dramaHistory, characters */
// ======================= 前端登录验证（支持后端 JWT + 本地回退） =======================
window._historyInitialized = false;

// API 基础路径（部署时修改为实际 Worker 地址）
const API_BASE = "/api";

// 令牌管理
function getToken() {
  return localStorage.getItem("site_token");
}
function setToken(t) {
  localStorage.setItem("site_token", t);
}
function clearToken() {
  localStorage.removeItem("site_token");
  localStorage.removeItem("site_user");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

function showWelcomeMessage(username, role, isDev) {
  const hero = document.querySelector(".hero");
  const welcomeDiv = document.createElement("div");
  welcomeDiv.className = "welcome-message";
  if (isDev) {
    welcomeDiv.innerHTML = "<span>✨ 开发模式，已跳过验证 ✨</span>";
  } else {
    const roleMap = {
      Chairperson: "主任委员",
      ExecutiveDeputyChair: "常务副主任委员",
      SupervisorGeneral: "总监制委员",
      DeputySupervisor: "总副监制委员",
      Reviewer: "审定委员",
      DraftWriter: "执笔委员",
      MaterialCollector: "执书委员",
      user: "",
    };
    const roleLabel = roleMap[role] || "";
    welcomeDiv.innerHTML = `<span>✨ 欢迎！${escapeHtml(username)}${roleLabel ? " · " + roleLabel : ""} ✨</span>`;

    // 非普通用户显示管理入口
    if (role && role !== "user") {
      const adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.className = "admin-entry-link";
      adminLink.textContent = "⚙️ 管理面板";
      adminLink.style.cssText =
        "display:inline-block;margin-left:12px;padding:4px 12px;background:rgba(99,102,241,0.3);border:1px solid rgba(99,102,241,0.6);border-radius:6px;color:#c7d2fe;font-size:13px;text-decoration:none;transition:all 0.2s";
      adminLink.onmouseenter = function () {
        this.style.background = "rgba(99,102,241,0.5)";
      };
      adminLink.onmouseleave = function () {
        this.style.background = "rgba(99,102,241,0.3)";
      };
      welcomeDiv.appendChild(adminLink);
    }

    // 显示投稿入口（所有登录用户）
    const submitLink = document.getElementById("submitLink");
    if (submitLink) submitLink.classList.remove("hidden");
  }
  hero.insertAdjacentElement("afterend", welcomeDiv);
}

/** 从 API 加载数据并覆盖全局变量 */
async function loadDataFromAPI() {
  try {
    // 加载正史（已审核）+ 外史 + 戏史
    const [zhengshiRecords, waishiRecords, xishiRecords, chars] = await Promise.all([
      apiFetch("/records?type=zhengshi&status=approved"),
      apiFetch("/records?type=waishi&status=approved"),
      apiFetch("/records?type=xishi&status=approved"),
      apiFetch("/characters"),
    ]);

    // 覆盖 data.js 中的全局变量（修改现有对象，保持引用不变）
    historyData.records.length = 0;
    historyData.records.push(...zhengshiRecords);

    if (typeof extraHistory !== "undefined") {
      extraHistory.records.length = 0;
      extraHistory.records.push(...waishiRecords);
    }
    if (typeof dramaHistory !== "undefined") {
      dramaHistory.records.length = 0;
      dramaHistory.records.push(...xishiRecords);
    }

    const mappedChars = chars.map((c) => ({
      ...c,
      nicknames: c.nicknames || [],
      firstAge: c.firstAge || c.first_age || "",
      desc: c.desc || c.description || "",
    }));
    if (typeof characters !== "undefined") {
      characters.length = 0;
      characters.push(...mappedChars);
    } else {
      window.characters = mappedChars;
    }
    return true;
  } catch (err) {
    console.warn("API 数据加载失败，使用静态数据回退:", err.message);
    return false;
  }
}

/** 加载首页默认年级配置，API 不可用时由 controls.js 使用本地默认值 */
async function loadSiteConfig() {
  try {
    const config = await apiFetch("/config/public");
    window.historyDefaultGrade = config.defaultGrade;
  } catch (err) {
    console.warn("首页配置加载失败，使用本地默认值:", err.message);
  }
}

/** 从后端登录 */
async function loginViaAPI(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  localStorage.setItem("site_user", JSON.stringify(data.user));
  return data.user;
}

/** 注册站点账户 */
async function registerViaAPI(username, password) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

/** 自动登录（已存储 token） */
async function autoLogin() {
  const token = getToken();
  if (!token) return null;
  try {
    const data = await apiFetch("/auth/me");
    return data;
  } catch {
    clearToken();
    return null;
  }
}

/** 静态密码回退（旧版兼容） */
const CORRECT_HASH = "5fae31539e070a690c1b63720c25eb5b86084b5098a942c86c89c1d67157ed6b";

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(hashBuffer);
}

async function loginFallback(username, password) {
  const inputHash = await hashPassword(password);
  if (inputHash !== CORRECT_HASH) return null;
  return { username, role: "user" };
}

window.siteAuth = {
  apiFetch,
  loginViaAPI,
  loginFallback,
  registerViaAPI,
  autoLogin,
  getToken,
  setToken,
  clearToken,
};

// ===================== 主流程 =====================
document.addEventListener("DOMContentLoaded", () => {
  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  const urlParams = new URLSearchParams(window.location.search);
  const devParam = urlParams.get("dev");

  // 手动关闭 dev 模式
  if (devParam === "0" || devParam === "off") localStorage.removeItem("autoDev");
  // 手动开启 dev 模式
  if (devParam === "1" || devParam === "true") localStorage.setItem("autoDev", "true");

  const isDevMode = devParam === "true" || localStorage.getItem("autoDev") === "true";

  /** 初始化网站（加载数据 + 启动应用） */
  async function initSite(user, isDev) {
    mainContent.classList.remove("hidden");
    if (user) showWelcomeMessage(user.username, user.role, isDev);

    // 优先从 API 加载数据，失败则使用静态数据
    if (!isDev) {
      await Promise.all([loadDataFromAPI(), loadSiteConfig()]);
    }

    if (typeof window.initHistory === "function") {
      window.initHistory();
    }
  }

  // 开发模式
  if (isDevMode) {
    initSite({ username: "开发者", role: "Chairperson" }, true);
    return;
  }

  // 先以访客身份打开首页，不再强制等待登录
  initSite(null, false);

  // 已有登录态时继续自动识别，并恢复登录用户专属入口
  autoLogin().then((user) => {
    if (user) {
      showWelcomeMessage(user.username, user.role, false);
    }
  });
});
