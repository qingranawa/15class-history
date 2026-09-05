document.addEventListener("DOMContentLoaded", () => {
  const auth = window.siteAuth;
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const message = document.getElementById("loginMessage");
  if (!auth || !loginForm || !registerForm || !message) return;

  const tabs = {
    login: document.getElementById("loginTab"),
    register: document.getElementById("registerTab"),
  };
  const panels = {
    login: document.getElementById("loginPanel"),
    register: document.getElementById("registerPanel"),
  };

  function showMessage(text, type = "") {
    message.textContent = text;
    message.className = "login-message";
    if (type) message.classList.add("login-message--" + type);
  }

  function switchTab(tabName) {
    Object.entries(tabs).forEach(([name, tab]) => {
      const isActive = name === tabName;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      panels[name].hidden = !isActive;
    });
    showMessage("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    if (!username || !password) return;

    showMessage("登录中...");
    try {
      let user;
      try {
        user = await auth.loginViaAPI(username, password);
      } catch {
        user = await auth.loginFallback(username, password);
        if (!user) throw new Error("用户名或密码错误");
        localStorage.setItem("site_user", JSON.stringify(user));
      }
      showMessage("欢迎，" + user.username + "，正在返回班史...", "success");
      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 400);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    if (!username || !password) return;
    if (/[一-鿿]/.test(username)) {
      showMessage("用户名不能包含中文，请使用英文或拼音", "error");
      return;
    }

    showMessage("注册中...");
    try {
      await auth.registerViaAPI(username, password);
      document.getElementById("loginUsername").value = username;
      document.getElementById("loginPassword").value = password;
      switchTab("login");
      showMessage("注册成功，请登录", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  Object.entries(tabs).forEach(([name, tab]) => {
    tab.addEventListener("click", () => switchTab(name));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const nextTab = name === "login" ? "register" : "login";
        tabs[nextTab].focus();
        switchTab(nextTab);
      }
    });
  });
  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
});
