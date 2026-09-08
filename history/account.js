document.addEventListener("DOMContentLoaded", () => {
  const auth = window.siteAuth;
  const guard = document.getElementById("accountGuard");
  const content = document.getElementById("accountContent");
  const passwordForm = document.getElementById("passwordForm");
  if (!auth || !guard || !content || !passwordForm) return;

  const roleLabels = {
    user: "普通用户",
    MaterialCollector: "执书委员",
    DraftWriter: "执笔委员",
    Reviewer: "审定委员",
    SupervisorGeneral: "总监制委员",
    DeputySupervisor: "总副监制委员",
    Chairperson: "主任委员",
    ExecutiveDeputyChair: "常务副主任委员",
  };
  const decisionLabels = {
    pending: ["待处理", "pending"],
    accepted: ["已采纳", "accepted"],
    rejected: ["未采纳", "rejected"],
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "时间未知";
    const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(date);
  }

  function getExcerpt(content) {
    const text = String(content ?? "").replace(/\s+/g, " ").trim();
    return text.length > 120 ? `${text.slice(0, 120)}…` : text || "未填写正文";
  }

  function renderSubmissions(submissions) {
    const state = document.getElementById("submissionsState");
    const count = document.getElementById("submissionCount");
    count.textContent = `${submissions.length} 条`;
    if (!submissions.length) {
      state.innerHTML = "<div class=\"account-empty\"><strong>还没有投稿</strong><span>提交你的第一条班级史事建议吧。</span><a href=\"submit.html\">去提交草稿</a></div>";
      return;
    }

    state.innerHTML = `<div class="account-submission-list">${submissions.map((submission) => {
      const [label, className] = decisionLabels[submission.decision] || decisionLabels.pending;
      return `<article class="account-submission">
        <div class="account-submission__topline">
          <time datetime="${escapeHtml(submission.created_at || "")}">${formatDate(submission.created_at)}</time>
          <span class="account-decision account-decision--${className}">${label}</span>
        </div>
        <h3>${escapeHtml(submission.title)}</h3>
        <p>${escapeHtml(getExcerpt(submission.content))}</p>
        ${submission.decision_at ? `<small>结果更新于 ${formatDate(submission.decision_at)}</small>` : ""}
      </article>`;
    }).join("")}</div>`;
  }

  function showPasswordMessage(text, type = "") {
    const message = document.getElementById("passwordMessage");
    message.textContent = text;
    message.className = "account-form__message";
    if (type) message.classList.add(`account-form__message--${type}`);
  }

  async function loadAccount(user) {
    document.getElementById("accountUsername").textContent = user.username;
    document.getElementById("accountRole").textContent = roleLabels[user.role] || user.role;
    guard.hidden = true;
    content.hidden = false;

    try {
      const submissions = await auth.apiFetch("/materials?mine=1");
      renderSubmissions(Array.isArray(submissions) ? submissions : []);
    } catch (error) {
      document.getElementById("submissionsState").innerHTML = `<div class="account-empty account-empty--error"><strong>投稿记录加载失败</strong><span>${escapeHtml(error.message)}</span></div>`;
    }
  }

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitButton = passwordForm.querySelector("button[type=submit]");
    if (newPassword !== confirmPassword) {
      showPasswordMessage("两次输入的新密码不一致", "error");
      return;
    }

    submitButton.disabled = true;
    showPasswordMessage("正在保存...");
    try {
      await auth.apiFetch("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      passwordForm.reset();
      showPasswordMessage("密码已更新", "success");
    } catch (error) {
      showPasswordMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  auth.autoLogin().then((user) => {
    if (!user) {
      guard.innerHTML = "账户页需要登录，请先<a class=\"info-page__link\" href=\"login.html?redirect=account.html\">登录账户</a>。";
      return;
    }
    return loadAccount(user);
  }).catch((error) => {
    guard.textContent = error.message;
  });
});
