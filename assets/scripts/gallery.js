(() => {
  "use strict";

  const filters = document.querySelector("[data-gallery-filters]");
  const items = [...document.querySelectorAll("[data-gallery-item]")];
  const dialog = document.querySelector("[data-gallery-dialog]");
  if (!filters || !items.length || !dialog) return;

  const dialogImage = dialog.querySelector("[data-dialog-image]");
  const dialogTitle = dialog.querySelector("[data-dialog-title]");
  const dialogCategory = dialog.querySelector("[data-dialog-category]");
  const closeButton = dialog.querySelector("[data-dialog-close]");
  let opener = null;
  let filterRun = 0;
  let closing = false;

  function playItemAnimation(item, keyframes, options) {
    item._galleryAnimation?.cancel();
    const animation = window.PCCMotion?.animate(item, keyframes, options);
    item._galleryAnimation = animation;
    animation?.finished.finally(() => {
      if (item._galleryAnimation === animation) item._galleryAnimation = null;
    }).catch(() => {});
    return animation;
  }

  async function applyFilter(value) {
    const run = ++filterRun;
    const outgoing = items.filter((item) => !item.hidden && value !== "all" && item.dataset.category !== value);
    const incoming = items.filter((item) => item.hidden && (value === "all" || item.dataset.category === value));

    if (window.PCCMotion?.reduced() || !window.PCCMotion) {
      items.forEach((item) => { item.hidden = value !== "all" && item.dataset.category !== value; });
      return;
    }

    const outgoingAnimations = [];
    await Promise.all(outgoing.map((item, index) => {
      const animation = playItemAnimation(item, [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(0.5rem) scale(0.94)" }
      ], { duration: 180, delay: index * 25 });
      outgoingAnimations.push([item, animation]);
      return animation?.finished.catch(() => {}) || Promise.resolve();
    }));
    if (run !== filterRun) {
      outgoingAnimations.forEach(([, animation]) => animation?.cancel());
      return;
    }

    outgoingAnimations.forEach(([item, animation]) => {
      item.hidden = true;
      animation?.cancel();
      item._galleryAnimation = null;
    });
    incoming.forEach((item, index) => {
      item.hidden = false;
      playItemAnimation(item, [
        { opacity: 0, transform: "translateY(0.8rem) scale(0.92)" },
        { opacity: 1, transform: "translateY(0) scale(1)" }
      ], { duration: 420, delay: index * 65, fill: "backwards" });
    });
  }

  async function closeDialog() {
    if (!dialog.open || closing) return;
    if (window.PCCMotion?.reduced() || !window.PCCMotion) {
      dialog.close();
      return;
    }
    closing = true;
    const animation = window.PCCMotion.animate(dialog, [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(0.8rem) scale(0.95)" }
    ], { duration: 220 });
    if (!animation) {
      dialog.close();
      closing = false;
      return;
    }
    await animation.finished.catch(() => {});
    if (dialog.open) dialog.close();
    animation.cancel();
    closing = false;
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    const value = button.dataset.filter;
    filters.querySelectorAll("[data-filter]").forEach((candidate) => {
      candidate.setAttribute("aria-pressed", String(candidate === button));
    });
    applyFilter(value);
  });

  items.forEach((item) => {
    const button = item.querySelector("button");
    button.addEventListener("click", () => {
      opener = button;
      dialogImage.src = item.dataset.full;
      dialogImage.alt = item.dataset.title;
      dialogTitle.textContent = item.dataset.title;
      dialogCategory.textContent = item.dataset.categoryLabel;
      dialog.showModal();
    });
  });

  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) closeDialog();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("close", () => {
    dialogImage.removeAttribute("src");
    opener?.focus();
  });
})();
