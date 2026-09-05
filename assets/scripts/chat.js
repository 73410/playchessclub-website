(() => {
  "use strict";

  const prompts = {
    server: "你是我的世界pcc服务器的助理机器人，你需要表明你是什么模型。接下来会给你一些数据以便于你解答玩家问题。数据：1. 我们服务器的服主是 chen_xigua，管理员团队有：brockh090、Vex、Kehuan1、XINGKONGLZC。2. 我们服务器插件列表：CatSeedLogin, CMILib, CoreProtect, CustomCrops, dynmap, DynMap_Residence, EClean, Econoblocks, Essentials, GSit, HeadDatabase, ItemsAdder, LoneLibs, Multiverse-Core, Newkit, NoMoreCooked, Pcc_limbo_system, Permission, PlayerTitle, PlugManX, ProtocolLib, qsaddon-dynmap, QuickShop-Hikari, Residence, shop, Vault, ViaBackwards, ViaVersion。3. 我们服务器十一活动正在进行，详细见公告。",
    general: "请你尽力解决问题"
  };

  const mode = document.body.dataset.chatMode === "general" ? "general" : "server";
  const form = document.querySelector("[data-chat-form]");
  const log = document.querySelector("[data-chat-log]");
  const input = document.querySelector("[data-chat-input]");
  const model = document.querySelector("[data-chat-model]");
  const clear = document.querySelector("[data-chat-clear]");
  const loading = document.querySelector("[data-chat-loading]");
  const welcome = document.querySelector("[data-chat-welcome]");
  const submit = form?.querySelector('button[type="submit"]');
  if (!form || !log || !input || !model || !clear || !loading || !submit) return;

  const systemPrompt = prompts[mode];
  let conversation = [{ role: "system", content: systemPrompt }];
  let pending = false;

  function keepHistoryBounded() {
    if (conversation.length > 20) {
      conversation.splice(1, conversation.length - 20);
    }
  }

  function renderMarkdown(message) {
    if (window.marked && window.DOMPurify) {
      return window.DOMPurify.sanitize(window.marked.parse(message));
    }
    const wrapper = document.createElement("div");
    wrapper.textContent = message;
    return wrapper.innerHTML;
  }

  function addMessage(role, message, save = true) {
    welcome.hidden = true;
    const bubble = document.createElement("div");
    bubble.className = `message message--${role}`;
    if (role === "assistant") {
      bubble.innerHTML = renderMarkdown(message);
    } else {
      bubble.textContent = message;
    }
    log.insertBefore(bubble, loading);
    window.PCCMotion?.animate(bubble, [
      { opacity: 0, transform: `translate3d(${role === "user" ? 12 : -12}px, 8px, 0) scale(0.97)` },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
    ], { duration: 380, fill: "none" });
    log.scrollTop = log.scrollHeight;
    if (save) {
      conversation.push({ role: role === "user" ? "user" : "assistant", content: message });
      keepHistoryBounded();
    }
  }

  function setPending(next) {
    pending = next;
    loading.hidden = !next;
    submit.disabled = next;
    model.disabled = next;
    input.setAttribute("aria-busy", String(next));
    if (next) log.scrollTop = log.scrollHeight;
  }

  async function requestReply() {
    const response = await fetch("https://openai.mcpcc.fun/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation, modelChoice: model.value })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `服务器错误（${response.status}）`);
    if (typeof data.reply !== "string") throw new Error("服务器返回了无法识别的回复。");
    return data.reply;
  }

  async function send() {
    const message = input.value.trim();
    if (!message || pending) return;
    addMessage("user", message);
    input.value = "";
    input.style.height = "auto";
    setPending(true);
    try {
      const reply = await requestReply();
      addMessage("assistant", reply);
      if (reply.includes("gpt-4o-mini")) {
        addMessage("assistant", "注意：由于 gpt-4o 速率限制，模型已切换到 gpt-4o-mini。");
      }
    } catch (error) {
      console.error("AI request failed:", error);
      addMessage("assistant", `错误：${error.message}`, false);
    } finally {
      setPending(false);
      input.focus();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    send();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 144)}px`;
  });
  clear.addEventListener("click", () => {
    conversation = [{ role: "system", content: systemPrompt }];
    log.querySelectorAll(".message").forEach((message) => message.remove());
    welcome.hidden = false;
    input.focus();
  });
})();
