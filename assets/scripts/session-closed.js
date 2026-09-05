(() => {
  "use strict";
  const closeButton = document.querySelector("[data-close-window]");
  const status = document.querySelector("[data-close-status]");
  if (!closeButton) return;

  closeButton.addEventListener("click", () => {
    window.close();
    window.setTimeout(() => {
      status.hidden = false;
      status.focus();
    }, 250);
  });
})();
