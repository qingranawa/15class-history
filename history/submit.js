document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.siteAuth;
  const guard = document.getElementById("submitGuard");
  const form = document.getElementById("submitForm");
  if (!auth || !guard || !form) return;

  const errorMessage = document.getElementById("submitError");
  const successMessage = document.getElementById("submitSuccess");
  try {
    const user = await auth.autoLogin();
    if (!user) {
      guard.innerHTML = "投稿需要登录，请先<a class=\"info-page__link\" href=\"login.html\">登录账户</a>。";
      return;
    }

    guard.hidden = true;
    form.hidden = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorMessage.textContent = "";
      successMessage.textContent = "";
      const title = document.getElementById("submitTitle").value.trim();
      const content = document.getElementById("submitContent").value.trim();
      if (!title || !content) return;

      const submitButton = document.getElementById("submitMaterialBtn");
      submitButton.disabled = true;
      try {
        await auth.apiFetch("/materials", {
          method: "POST",
          body: JSON.stringify({ title, content, materialType: "text" }),
        });
        form.reset();
        successMessage.textContent = "投稿成功！执书委员会整理后交给执笔委员写史。";
      } catch (error) {
        errorMessage.textContent = error.message;
      } finally {
        submitButton.disabled = false;
      }
    });
  } catch (error) {
    guard.textContent = error.message;
  }
});
