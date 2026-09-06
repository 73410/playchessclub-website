// Keep this entry independent of WebGL imports so import/network failures also fall back.
const journey = document.querySelector('[data-home-journey]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const shortViewport = window.matchMedia('(max-height: 500px)');
let active = null;
let pending = null;
let generation = 0;

function staticLayout(reason = 'static') {
  pending?.abort();
  pending = null;
  const anchor = [...journey.querySelectorAll('[data-journey-stop]')].find(section => section.getBoundingClientRect().bottom > 100) || journey.nextElementSibling;
  const offset = anchor?.getBoundingClientRect().top;
  const preserve = journey.classList.contains('journey--enhanced') && journey.getBoundingClientRect().top < 0;
  active?.dispose();
  active = null;
  journey.dataset.sceneState = reason;
  journey.classList.remove('journey--enhanced');
  journey.querySelectorAll('[data-journey-stop]').forEach(section => section.removeAttribute('style'));
  if (preserve && anchor) window.scrollBy({ top: anchor.getBoundingClientRect().top - offset, behavior: 'instant' });
}

async function initialize() {
  const token = ++generation;
  if (!journey || reducedMotion.matches || shortViewport.matches) {
    if (journey) staticLayout(reducedMotion.matches ? 'reduced-motion' : 'short-viewport');
    return;
  }
  journey.dataset.sceneState = 'loading';
  pending = new AbortController();
  const signal = pending.signal;
  try {
    const { createHomeScene } = await import('./home-scene-renderer.js');
    if (token !== generation) return;
    const scene = await createHomeScene(journey, reason => {
      if (token !== generation) return;
      generation++;
      staticLayout(reason);
    }, signal);
    if (token !== generation) {
      scene.dispose();
      return;
    }
    active = scene;
    active.start();
  } catch (error) {
    if (token !== generation) return;
    console.warn('PCC: using the static riverside cover.', error);
    staticLayout('fallback');
  }
}

if (journey) {
  initialize();
  const preferencesChanged = () => {
    generation++;
    staticLayout();
    initialize();
  };
  reducedMotion.addEventListener('change', preferencesChanged);
  shortViewport.addEventListener('change', preferencesChanged);
  window.addEventListener('pagehide', () => { generation++; staticLayout(); });
  window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
}
