(() => {
  "use strict";

  const CACHE_MS = 30 * 60 * 1000;
  const CACHE_DATA = "pcc:rss:data";
  const CACHE_TIME = "pcc:rss:timestamp";
  const endpoint = "https://news.mcpcc.fun/rss.xml";
  const markdownTags = ["p", "br", "strong", "em", "del", "a", "ul", "ol", "li", "blockquote", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6"];
  const root = document.querySelector("[data-rss-feed]");
  if (!root) return;

  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  function plainText(html) {
    const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
    return parsed.body.textContent.replace(/\s+/g, " ").trim();
  }

  function markdownSummary(source) {
    const summary = create("div", "rss-card__summary rss-card__summary--markdown");
    const markdown = String(source || "").trim();
    if (!markdown) return null;

    if (!window.marked || !window.DOMPurify) {
      summary.textContent = plainText(markdown);
      return summary.textContent ? summary : null;
    }

    const rendered = window.marked.parse(markdown, { gfm: true, breaks: true });
    summary.innerHTML = window.DOMPurify.sanitize(rendered, {
      ALLOWED_TAGS: markdownTags,
      ALLOWED_ATTR: ["href", "title"],
      ALLOW_ARIA_ATTR: false,
      ALLOW_DATA_ATTR: false
    });
    summary.querySelectorAll("a").forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
    return summary.textContent.trim() ? summary : null;
  }

  function showLoading() {
    const placeholder = create("div", "card card--padded rss-placeholder");
    const row = create("div", "loading-row");
    row.append(create("span", "spinner"), create("span", "", "正在加载最新消息…"));
    placeholder.append(row);
    root.replaceChildren(placeholder);
    window.PCCMotion?.reveal(root);
  }

  function showError() {
    const placeholder = create("div", "card card--padded rss-placeholder");
    placeholder.append(create("h3", "", "新闻暂时未能加载"), create("p", "muted", "请检查网络连接，或稍后再试。"));
    const retry = create("button", "button button--secondary", "重新加载");
    retry.type = "button";
    retry.addEventListener("click", () => load(true));
    placeholder.append(retry);
    root.replaceChildren(placeholder);
    window.PCCMotion?.reveal(root);
  }

  function render(xml) {
    const documentXml = new DOMParser().parseFromString(xml, "text/xml");
    if (documentXml.querySelector("parsererror")) throw new Error("Invalid RSS XML");
    const items = [...documentXml.querySelectorAll("item")].slice(0, 9);
    if (!items.length) throw new Error("RSS contains no items");

    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const card = create("article", "card rss-card");
      const title = plainText(item.querySelector("title")?.textContent) || "未命名消息";
      const href = item.querySelector("link")?.textContent?.trim() || "https://news.mcpcc.fun";
      const description = item.querySelector("description")?.textContent;
      const imageUrl = item.querySelector("enclosure")?.getAttribute("url");

      if (imageUrl) {
        const image = create("img", "rss-card__image");
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        card.append(image);
      }

      const body = create("div", "rss-card__body");
      const heading = create("h3");
      const link = create("a", "", title);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      heading.append(link);
      body.append(heading);
      const summary = markdownSummary(description);
      if (summary) body.append(summary);
      const more = create("a", "rss-card__link", "阅读完整内容 →");
      more.href = href;
      more.target = "_blank";
      more.rel = "noopener noreferrer";
      body.append(more);
      card.append(body);
      fragment.append(card);
    });
    root.replaceChildren(fragment);
    window.PCCMotion?.reveal(root);
  }

  function readCache() {
    try {
      const data = localStorage.getItem(CACHE_DATA);
      const timestamp = Number(localStorage.getItem(CACHE_TIME));
      return data && timestamp && Date.now() - timestamp < CACHE_MS ? data : null;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_DATA, data);
      localStorage.setItem(CACHE_TIME, String(Date.now()));
    } catch {
      // The news still renders when storage is unavailable.
    }
  }

  async function load(force = false) {
    showLoading();
    try {
      const cached = force ? null : readCache();
      if (cached) {
        render(cached);
        return;
      }
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      render(xml);
      writeCache(xml);
    } catch (error) {
      console.error("Unable to load PCC news:", error);
      showError();
    }
  }

  load();
})();
