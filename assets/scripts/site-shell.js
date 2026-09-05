(() => {
  "use strict";

  const icon = (name) => {
    const icons = {
      theme: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10 3a1 1 0 0 1-1 1h-1.1a1 1 0 1 1 0-2H21a1 1 0 0 1 1 1ZM5.1 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1.1a1 1 0 0 1 1 1Zm13.97-7.07a1 1 0 0 1 0 1.41l-.78.78a1 1 0 0 1-1.41-1.41l.78-.78a1 1 0 0 1 1.41 0ZM7.12 16.88a1 1 0 0 1 0 1.41l-.78.78a1 1 0 1 1-1.41-1.41l.78-.78a1 1 0 0 1 1.41 0Zm11.95 2.19a1 1 0 0 1-1.41 0l-.78-.78a1 1 0 0 1 1.41-1.41l.78.78a1 1 0 0 1 0 1.41ZM7.12 7.12a1 1 0 0 1-1.41 0l-.78-.78a1 1 0 0 1 1.41-1.41l.78.78a1 1 0 0 1 0 1.41ZM12 18.9a1 1 0 0 1 1 1V21a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1Z"/></svg>',
      menu: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2Zm0 5h16a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2Zm0 5h16a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2Z"/></svg>',
      arrow: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4a1 1 0 0 1 1 1v11.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V5a1 1 0 0 1 1-1Z" transform="rotate(180 12 12)"/></svg>'
    };
    return icons[name] || "";
  };

  const siteUrl = (path = "./") => new URL(path, document.baseURI).href;
  const currentPageUrl = (hash = "") => {
    const url = new URL(window.location.href);
    url.hash = hash;
    return url.href;
  };
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const PCCMotion = (() => {
    const revealSelector = [
      ".home-hero__content > *",
      ".page-hero__inner > *",
      ".section-heading",
      ".two-column > *",
      ".card-grid > *",
      ".gallery-grid > *",
      ".gallery-preview > *",
      ".effect-grid > *",
      ".command-grid > *",
      ".rss-feed > *",
      ".server-status > *",
      ".site-footer__grid > *",
      ".feedback-card",
      ".status-panel",
      ".video-frame",
      ".media-frame"
    ].join(",");
    const staggerParents = ".home-hero__content,.page-hero__inner,.two-column,.card-grid,.gallery-grid,.gallery-preview,.effect-grid,.command-grid,.rss-feed,.server-status,.site-footer__grid";
    const activeAnimations = new Set();
    let observer = null;

    function reduced() {
      return reducedMotionQuery.matches;
    }

    function animate(element, keyframes, options = {}) {
      if (!element || reduced() || typeof element.animate !== "function") return null;
      const animation = element.animate(keyframes, {
        duration: 420,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both",
        ...options
      });
      activeAnimations.add(animation);
      animation.finished.then(
        () => activeAnimations.delete(animation),
        () => activeAnimations.delete(animation)
      );
      return animation;
    }

    function getStaggerIndex(element) {
      const parent = element.parentElement;
      if (!parent?.matches(staggerParents)) return 0;
      return [...parent.children].indexOf(element) % 7;
    }

    function prepare(element) {
      if (element.dataset.motionObserved === "true" || reduced()) return;
      element.dataset.motionObserved = "true";
      element.dataset.motionReady = "true";
      const isHero = element.closest(".home-hero,.page-hero");
      const staggerIndex = getStaggerIndex(element);
      const isGridItem = element.parentElement?.matches(staggerParents);
      const compactViewport = window.innerWidth <= 640;
      const direction = staggerIndex % 2 === 0 ? -1 : 1;
      const offsetX = isHero || !isGridItem || compactViewport ? 0 : direction * 28;
      const offsetY = isHero ? 46 : 32;
      const rotation = isHero || !isGridItem || compactViewport ? 0 : direction * 1.35;
      const animation = animate(element, [
        { opacity: 0, transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${isHero ? 0.94 : 0.955}) rotate(${rotation}deg)` },
        { opacity: 1, transform: `translate3d(${-offsetX * 0.08}px, -5px, 0) scale(1.018) rotate(${-rotation * 0.12}deg)`, offset: 0.76 },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
      ], {
        duration: isHero ? 920 : 760,
        delay: staggerIndex * (isHero ? 120 : 90),
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
      });
      if (!animation) return;
      animation.pause();
      element._pccRevealAnimation = animation;
      observer.observe(element);
    }

    function show(element) {
      const animation = element._pccRevealAnimation;
      if (!animation) return;
      animation.play();
      animation.finished.then(() => {
        animation.cancel();
        delete element._pccRevealAnimation;
        delete element.dataset.motionReady;
      }).catch(() => {});
      observer.unobserve(element);
    }

    function reveal(container = document) {
      if (reduced() || !("IntersectionObserver" in window)) return;
      const candidates = new Set();
      if (container instanceof Element && container.matches(revealSelector)) candidates.add(container);
      container.querySelectorAll?.(revealSelector).forEach((element) => candidates.add(element));
      candidates.forEach(prepare);
    }

    function resetForReducedMotion() {
      document.querySelectorAll('[data-motion-observed="true"]').forEach((element) => {
        const wasPending = Boolean(element._pccRevealAnimation);
        element._pccRevealAnimation?.cancel();
        observer?.unobserve(element);
        delete element._pccRevealAnimation;
        delete element.dataset.motionReady;
        if (wasPending) delete element.dataset.motionObserved;
      });
    }

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) show(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
    }
    reducedMotionQuery.addEventListener?.("change", (event) => {
      if (event.matches) {
        activeAnimations.forEach((animation) => animation.cancel());
        activeAnimations.clear();
        resetForReducedMotion();
      }
      else reveal(document);
    });

    return { animate, reduced, reveal };
  })();

  window.PCCMotion = PCCMotion;

  const navItems = [
    ["./", "首页"],
    ["gallery/", "风景画廊"],
    ["status/", "服务器状态"],
    ["mail/", "邮件订阅"],
    ["ai/server/", "PCC AI"],
    ["pration/", "Pration"]
  ];

  function activeRoute(href) {
    const currentPath = window.location.pathname.replace(/index\.html$/, "");
    const targetPath = new URL(href, document.baseURI).pathname.replace(/index\.html$/, "");
    return href === "./" ? currentPath === targetPath : currentPath.startsWith(targetPath);
  }

  class PCCHeader extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === "true") return;
      this.dataset.ready = "true";
      const compact = this.getAttribute("variant") === "compact";
      const nav = navItems.map(([href, label]) => `<a href="${siteUrl(href)}"${activeRoute(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("");

      this.innerHTML = `
        <a class="skip-link" href="${currentPageUrl("main-content")}">跳到主要内容</a>
        <header class="site-header${compact ? " site-header--compact" : ""}">
          <div class="container site-header__inner">
            <a class="brand" href="${siteUrl()}" aria-label="PlayChessClub 首页">
              <img src="${siteUrl("assets/images/brand/pcc.webp")}" alt="" width="38" height="38">
              <span>PlayChessClub</span>
            </a>
            <nav class="site-nav" id="site-navigation" aria-label="主导航" data-open="false">${nav}</nav>
            <div class="header-actions">
              <button class="icon-button" type="button" data-theme-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="theme-menu">
                ${icon("theme")}<span class="visually-hidden">主题设置</span>
              </button>
              <div class="theme-menu" id="theme-menu" role="menu" hidden>
                <button type="button" role="menuitemradio" data-theme-option="system" aria-checked="true">跟随系统</button>
                <button type="button" role="menuitemradio" data-theme-option="light" aria-checked="false">浅色模式</button>
                <button type="button" role="menuitemradio" data-theme-option="dark" aria-checked="false">深色模式</button>
              </div>
              <button class="icon-button menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">
                ${icon("menu")}<span class="visually-hidden">打开导航</span>
              </button>
            </div>
          </div>
        </header>`;

      this.bindEvents();
      window.PCCTheme?.bindControls(this);
    }

    bindEvents() {
      const nav = this.querySelector(".site-nav");
      const menuToggle = this.querySelector(".menu-toggle");
      const themeToggle = this.querySelector("[data-theme-toggle]");
      const themeMenu = this.querySelector(".theme-menu");
      let themeCloseTimer = 0;

      const closeNav = () => {
        nav.dataset.open = "false";
        menuToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      };
      const closeTheme = () => {
        if (themeMenu.hidden) return;
        window.clearTimeout(themeCloseTimer);
        themeMenu.classList.remove("is-open");
        themeToggle.setAttribute("aria-expanded", "false");
        themeCloseTimer = window.setTimeout(() => {
          if (!themeMenu.classList.contains("is-open")) themeMenu.hidden = true;
        }, PCCMotion.reduced() ? 0 : 320);
      };

      menuToggle.addEventListener("click", () => {
        const open = nav.dataset.open !== "true";
        nav.dataset.open = String(open);
        menuToggle.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("nav-open", open);
        closeTheme();
      });

      themeToggle.addEventListener("click", () => {
        const open = themeMenu.hidden || !themeMenu.classList.contains("is-open");
        if (!open) {
          closeTheme();
          return;
        }
        window.clearTimeout(themeCloseTimer);
        themeMenu.hidden = false;
        requestAnimationFrame(() => themeMenu.classList.add("is-open"));
        themeToggle.setAttribute("aria-expanded", String(open));
        window.setTimeout(() => themeMenu.querySelector('[aria-checked="true"]')?.focus(), PCCMotion.reduced() ? 0 : 120);
      });

      themeMenu.addEventListener("click", (event) => {
        if (event.target.closest("[data-theme-option]")) closeTheme();
      });
      nav.addEventListener("click", closeNav);
      window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) closeNav();
      });
      document.addEventListener("click", (event) => {
        if (!this.contains(event.target)) {
          closeTheme();
          if (window.innerWidth <= 1024) closeNav();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeTheme();
          closeNav();
          themeToggle.focus();
        }
      });
    }
  }

  class PCCFooter extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === "true") return;
      this.dataset.ready = "true";
      this.innerHTML = `
        <footer class="site-footer">
          <div class="container">
            <div class="site-footer__grid">
              <div>
                <a class="brand" href="${siteUrl()}">
                  <img src="${siteUrl("assets/images/brand/pcc.webp")}" alt="" width="38" height="38">
                  <span>PlayChessClub</span>
                </a>
                <p class="site-footer__intro">一个温馨、稳定、长期运营的 Minecraft 公益服务器。正如象棋，在探索中修身，在创造中相遇。</p>
              </div>
              <div>
                <h2>快速访问</h2>
                <ul class="footer-links">
                  <li><a href="${siteUrl("gallery/")}">风景画廊</a></li>
                  <li><a href="${siteUrl("status/")}">服务器状态</a></li>
                  <li><a href="${siteUrl("mail/")}">邮件订阅</a></li>
                  <li><a href="https://news.mcpcc.fun" rel="noopener">PCC 新闻</a></li>
                </ul>
              </div>
              <div>
                <h2>项目与工具</h2>
                <ul class="footer-links">
                  <li><a href="${siteUrl("ai/server/")}">服务器 AI 助手</a></li>
                  <li><a href="${siteUrl("ai/general/")}">通用 AI 助手</a></li>
                  <li><a href="${siteUrl("pration/")}">Pration 插件</a></li>
                  <li><a href="https://github.com/73410/playchessclub-website" rel="noopener">官网代码库</a></li>
                </ul>
              </div>
            </div>
            <div class="site-footer__bottom">
              <p>© <span data-current-year></span> PlayChessClub · 3B3T 工作室</p>
              <div class="site-footer__records" aria-label="网站备案信息">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2026045898号</a>
                <a href="https://beian.mps.gov.cn/#/query/webSearch?code=33010502013205" target="_blank" rel="noopener noreferrer">
                  <img src="${siteUrl("assets/images/legal/gongan.png")}" alt="" width="16" height="17">
                  <span>浙公网安备33010502013205号</span>
                </a>
              </div>
            </div>
          </div>
        </footer>`;
      this.querySelector("[data-current-year]").textContent = String(new Date().getFullYear());
    }
  }

  customElements.define("pcc-header", PCCHeader);
  customElements.define("pcc-footer", PCCFooter);

  const header = document.querySelector("pcc-header");
  let scrollFrame = 0;
  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
    scrollFrame = 0;
  };
  window.addEventListener("scroll", () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  updateHeader();

  PCCMotion.reveal(document);

  if (!document.body.hasAttribute("data-no-back-top")) {
    const button = document.createElement("a");
    button.href = currentPageUrl("main-content");
    button.className = "icon-button back-to-top";
    button.setAttribute("aria-label", "返回顶部");
    button.innerHTML = icon("arrow");
    document.body.append(button);
    const update = () => button.classList.toggle("is-visible", window.scrollY > 700);
    window.addEventListener("scroll", update, { passive: true });
    update();
  }
})();
