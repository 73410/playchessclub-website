(() => {
  "use strict";
  const target = document.querySelector('meta[name="redirect-target"]')?.content;
  if (!target) return;
  const destination = new URL(target, document.baseURI);
  destination.search = window.location.search;
  destination.hash = window.location.hash;
  window.location.replace(destination.href);
})();
