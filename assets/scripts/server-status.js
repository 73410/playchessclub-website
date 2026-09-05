(() => {
  "use strict";

  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  function detail(label, value) {
    const wrapper = create("div", "status-detail");
    const term = create("dt", "", label);
    const description = create("dd", "", value || "未知");
    wrapper.append(term, description);
    return wrapper;
  }

  function renderLoading(root) {
    root.dataset.state = "loading";
    const row = create("div", "loading-row");
    row.setAttribute("role", "status");
    row.append(create("span", "spinner"), create("span", "", "正在检查服务器状态…"));
    root.replaceChildren(row);
    window.PCCMotion?.reveal(root);
  }

  function renderFailure(root, state, message) {
    root.dataset.state = state;
    const summary = create("div", "server-status__summary");
    summary.append(create("span", "server-status__state", state === "offline" ? "服务器离线" : "暂时无法获取状态"));
    const retry = create("button", "button button--ghost", "重新检查");
    retry.type = "button";
    retry.addEventListener("click", () => load(root));
    summary.append(retry);
    root.replaceChildren(summary, create("p", "muted", message));
    window.PCCMotion?.reveal(root);
  }

  function renderOnline(root, data, address) {
    root.dataset.state = "online";
    const summary = create("div", "server-status__summary");
    summary.append(create("span", "server-status__state", "服务器在线"));
    const retry = create("button", "button button--ghost", "刷新状态");
    retry.type = "button";
    retry.addEventListener("click", () => load(root));
    summary.append(retry);

    const motd = Array.isArray(data.motd?.clean) ? data.motd.clean.join(" · ") : String(data.motd?.clean || "暂无");
    const details = create("dl", "server-status__details");
    details.append(
      detail("服务器地址", address),
      detail("MOTD", motd),
      detail("版本", data.version),
      detail("服务端", data.software || "未公开"),
      detail("在线玩家", `${data.players?.online ?? 0} / ${data.players?.max ?? 0}`),
      detail("状态缓存", data.debug?.cachetime != null ? `${data.debug.cachetime} 秒` : "未知")
    );

    const playersWrap = create("div", "server-status__players");
    const rawPlayers = Array.isArray(data.players?.list) ? data.players.list : [];
    const title = create("h3", "", `当前在线玩家（${data.players?.online ?? 0}）`);
    playersWrap.append(title);

    if (rawPlayers.length) {
      const list = create("ul", "player-list");
      rawPlayers.forEach((player) => {
        const name = typeof player === "string" ? player : player?.name || "未知玩家";
        const item = create("li");
        const avatar = create("img");
        avatar.src = `https://r2.mcpcc.fun/faces/32x32/${encodeURIComponent(name)}.png`;
        avatar.alt = "";
        avatar.width = 24;
        avatar.height = 24;
        avatar.loading = "lazy";
        item.append(avatar, create("span", "", name));
        list.append(item);
      });
      playersWrap.append(list);
    } else {
      playersWrap.append(create("p", "muted", "目前没有玩家在线，或服务器未公开玩家列表。"));
    }

    root.replaceChildren(summary, details, playersWrap);
    window.PCCMotion?.reveal(root);
  }

  async function load(root) {
    const address = root.dataset.server;
    if (!address) {
      renderFailure(root, "error", "页面未配置服务器地址。");
      return;
    }

    renderLoading(root);
    try {
      const response = await fetch(`https://api.mcsrvstat.us/2/${address}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.online) {
        renderOnline(root, data, address);
      } else {
        renderFailure(root, "offline", "服务器当前未响应。有时状态服务会存在延迟，请稍后重试。");
      }
    } catch (error) {
      console.error("Unable to load Minecraft server status:", error);
      renderFailure(root, "error", "状态服务暂时不可用，请检查网络后重试。");
    }
  }

  document.querySelectorAll("[data-server-status]").forEach(load);
})();
