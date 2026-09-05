(() => {
  "use strict";

  const STORAGE_KEY = "pcc-theme";
  const MODES = new Set(["system", "light", "dark"]);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeTransition = null;

  function readMode() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return MODES.has(stored) ? stored : "system";
    } catch {
      return "system";
    }
  }

  function applyMode(mode, persist = false) {
    const nextMode = MODES.has(mode) ? mode : "system";
    const commit = () => {
      if (nextMode === "system") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.dataset.theme = nextMode;
      }

      if (persist) {
        try {
          localStorage.setItem(STORAGE_KEY, nextMode);
        } catch {
          // Storage can be unavailable in strict privacy modes; the active theme still works.
        }
      }

      window.dispatchEvent(new CustomEvent("pcc:theme-change", {
        detail: { mode: nextMode, resolved: resolveMode(nextMode) }
      }));
    };

    if (persist && document.startViewTransition && !reducedMotion.matches) {
      activeTransition?.skipTransition?.();
      const transition = document.startViewTransition(commit);
      activeTransition = transition;
      transition.finished.finally(() => {
        if (activeTransition === transition) activeTransition = null;
      });
    } else {
      commit();
    }
  }

  function resolveMode(mode = readMode()) {
    return mode === "system" ? (media.matches ? "dark" : "light") : mode;
  }

  function updateControls(root = document) {
    const mode = readMode();
    const resolved = resolveMode(mode);
    root.querySelectorAll("[data-theme-option]").forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.themeOption === mode));
    });
    root.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.dataset.resolvedTheme = resolved;
      button.setAttribute("aria-label", `主题设置，当前${mode === "system" ? `跟随系统（${resolved === "dark" ? "深色" : "浅色"}）` : resolved === "dark" ? "深色" : "浅色"}`);
    });
  }

  function bindControls(root = document) {
    root.querySelectorAll("[data-theme-option]").forEach((button) => {
      if (button.dataset.themeBound === "true") return;
      button.dataset.themeBound = "true";
      button.addEventListener("click", () => {
        const mode = button.dataset.themeOption;
        applyMode(mode, true);
        updateControls(document);
      });
    });
    updateControls(root);
  }

  applyMode(readMode());
  media.addEventListener?.("change", () => {
    if (readMode() === "system") {
      applyMode("system");
      updateControls(document);
    }
  });
  window.addEventListener("pcc:theme-change", () => updateControls(document));

  window.PCCTheme = { applyMode, bindControls, readMode, resolveMode };
})();
