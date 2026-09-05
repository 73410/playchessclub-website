(() => {
  "use strict";

  const form = document.querySelector("[data-mail-form]");
  if (!form) return;
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-form-status]");

  function animateStatus() {
    window.PCCMotion?.animate(status, [
      { opacity: 0, transform: "translateY(0.35rem)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration: 300, fill: "none" });
  }

  async function parseResponse(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    status.textContent = "正在提交，请稍候…";
    status.dataset.state = "loading";
    animateStatus();
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");

    const data = new FormData(form);
    const payload = {
      email: String(data.get("email") || "").trim(),
      last_name: String(data.get("last_name") || "").trim(),
      first_name: String(data.get("first_name") || "").trim()
    };

    try {
      const response = await fetch("https://mail.mcpcc.fun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(result.message || `提交失败（${response.status}）`);

      status.textContent = result.message || "添加成功，正在前往确认页面…";
      status.dataset.state = "success";
      animateStatus();
      window.setTimeout(() => {
        window.location.href = new URL("mail/success/", document.baseURI).href;
      }, 900);
    } catch (error) {
      status.textContent = error instanceof TypeError ? "网络连接失败，请稍后再试。" : error.message;
      status.dataset.state = "error";
      animateStatus();
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
    }
  });
})();
