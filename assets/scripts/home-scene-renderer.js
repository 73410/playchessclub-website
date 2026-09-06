import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAMERA_STOPS, MOBILE_CAMERA_STOPS } from './home-world.js';

const clamp = THREE.MathUtils.clamp;
const themes = {
  light: { sky: 0xa7cce0, fill: 0xc0dced, fog: 0xb7d4da, sun: 0xffefd2, sunPower: 2.65, ambient: 1.75, ground: 0x728257, water: 0x246588, glow: 0.12, beam: 0.09, exposure: 1.08 },
  dark: { sky: 0x101e30, fill: 0x8caac4, fog: 0x233b48, sun: 0x9bbddc, sunPower: 1.5, ambient: 1.45, ground: 0x536766, water: 0x173a50, glow: 3.0, beam: 0.4, exposure: 1.1 }
};

// A lightweight ripple shader keeps the water transparent enough to see the stepped bed.
function waterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color() }, night: { value: 0 }, fogColor: { value: new THREE.Color() } },
    vertexShader: `varying vec3 world;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        world = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `uniform float time; uniform vec3 tint; uniform float night; uniform vec3 fogColor;
      varying vec3 world;
      void main() {
        vec2 p = floor(world.xz * 3.0) / 3.0;
        float wave = sin(p.x * 1.5 + p.y * 0.7 + time * 0.6) * sin(p.y * 2.4 - time * 0.4);
        float glint = smoothstep(0.72, 0.98, wave) * 0.17;
        float lightTrail = exp(-pow((world.x - 30.0 + sin(world.z * 1.7) * 1.8) / 3.5, 2.0)) * night * 0.13;
        vec3 color = tint + glint * vec3(0.45, 0.65, 0.7) + lightTrail * vec3(1.0, 0.5, 0.1);
        color = mix(color, fogColor, smoothstep(85.0, 230.0, length(cameraPosition - world)));
        gl_FragColor = vec4(color, 0.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

export async function createHomeScene(journey, onFailure, externalSignal) {
  const canvas = journey.querySelector('canvas');
  const viewport = journey.querySelector('[data-journey-viewport]');
  const stops = [...journey.querySelectorAll('[data-journey-stop]')];
  const markers = [...journey.querySelectorAll('[data-journey-marker]')];
  const abort = new AbortController();
  const { signal } = abort;
  let renderer;
  let world;
  let water;
  let halos;
  let raf = 0;
  let disposed = false;
  let visible = true;
  let started = false;
  let progress = 0;
  let cameraProgress = 0;
  let cameraNeedsSnap = true;
  let clockTime = 0;
  let lastTime = 0;
  let currentStop = -1;
  let compact = false;
  let controlsDirty = true;
  let resizeObserver;
  let intersectionObserver;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(53, 1, 0.2, 400);
  const sun = new THREE.DirectionalLight();
  const sky = new THREE.HemisphereLight();
  sun.position.set(-45, 80, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 1, far: 220 });
  sun.shadow.normalBias = 0.12;
  sun.shadow.bias = -0.0002;
  sun.target.position.set(0, 0, -28);
  scene.add(sun, sun.target, sky);
  const pointLights = [];
  const curve = new THREE.CatmullRomCurve3(CAMERA_STOPS.map(s => new THREE.Vector3(...s.position)), false, 'centripetal');
  const targets = new THREE.CatmullRomCurve3(CAMERA_STOPS.map(s => new THREE.Vector3(...s.target)), false, 'centripetal');
  const mobileCurve = new THREE.CatmullRomCurve3(MOBILE_CAMERA_STOPS.map(s => new THREE.Vector3(...s.position)), false, 'centripetal');
  const mobileTargets = new THREE.CatmullRomCurve3(MOBILE_CAMERA_STOPS.map(s => new THREE.Vector3(...s.target)), false, 'centripetal');
  const lookAt = new THREE.Vector3();
  const position = new THREE.Vector3();
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  function collectResources(object) {
    object?.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      const list = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
      list.forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      });
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    abort.abort();
    externalSignal?.removeEventListener('abort', dispose);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    collectResources(scene);
    textures.forEach(texture => { texture.dispose(); texture.source?.data?.close?.(); });
    materials.forEach(material => material.dispose());
    geometries.forEach(geometry => geometry.dispose());
    world?.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
    sun.shadow.dispose();
    renderer?.dispose();
    // Contexts are reused when reduced motion is switched off again; avoid forceContextLoss.
  }

  function fail(reason) {
    dispose();
    onFailure(reason);
  }

  function resize() {
    if (disposed) return;
    const headerHeight = document.querySelector('pcc-header')?.getBoundingClientRect().height || 72;
    journey.style.setProperty('--journey-header', `${headerHeight}px`);
    compact = window.innerWidth < 760;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.5));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = !compact;
    camera.aspect = width / height;
    cameraNeedsSnap = true;
    controlsDirty = true;
    schedule();
  }

  function updateProgress() {
    const bounds = journey.getBoundingClientRect();
    const headerHeight = parseFloat(journey.style.getPropertyValue('--journey-header')) || 72;
    progress = clamp((headerHeight - bounds.top) / Math.max(1, journey.offsetHeight - viewport.clientHeight), 0, 1);
    const index = Math.min(3, Math.floor(progress * 3 + 0.5));
    if (index !== currentStop) {
      currentStop = index;
      journey.dataset.activeStop = String(index);
      markers.forEach((marker, i) => {
        if (i === index) marker.setAttribute('aria-current', 'step');
        else marker.removeAttribute('aria-current');
      });
    }
    journey.style.setProperty('--journey-progress', String(progress));
    controlsDirty = false;
  }

  function updateCamera(delta, snap = false) {
    // Exponential damping is independent of refresh rate: about 0.75 seconds
    // to cover 95% of a scroll change, without overshooting when direction reverses.
    cameraProgress = snap ? progress : THREE.MathUtils.damp(cameraProgress, progress, 4, delta);
    if (Math.abs(cameraProgress - progress) < 0.0001) cameraProgress = progress;
    canvas.dataset.cameraProgress = cameraProgress.toFixed(5);
    canvas.dataset.cameraMoving = String(cameraProgress !== progress);
    (compact ? mobileCurve : curve).getPoint(cameraProgress, position);
    (compact ? mobileTargets : targets).getPoint(cameraProgress, lookAt);
    camera.position.copy(position);
    camera.lookAt(lookAt);
    camera.fov = (compact ? 67 : 53) + Math.sin(cameraProgress * Math.PI) * 3;
    camera.updateProjectionMatrix();
    cameraNeedsSnap = false;
  }

  function applyTheme(event) {
    if (disposed) return;
    const resolved = event?.detail?.resolved || window.PCCTheme?.resolveMode() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const theme = themes[resolved] || themes.light;
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.fog, 100, 240);
    sun.color.setHex(theme.sun);
    sun.intensity = theme.sunPower;
    sky.color.setHex(theme.fill);
    sky.groundColor.setHex(theme.ground);
    sky.intensity = theme.ambient;
    renderer.toneMappingExposure = theme.exposure;
    materials.forEach(material => {
      if (material.name === 'lantern-glow') material.emissiveIntensity = theme.glow;
      if (material.name === 'beacon-beam') material.opacity = theme.beam;
      if (material.name === 'gold') {
        material.emissive.setHex(0xf5a32b);
        material.emissiveIntensity = resolved === 'dark' ? 0.7 : 0;
      }
    });
    water.material.uniforms.tint.value.setHex(theme.water);
    water.material.uniforms.fogColor.value.setHex(theme.fog);
    water.material.uniforms.night.value = resolved === 'dark' ? 1 : 0;
    pointLights.forEach(light => { light.intensity = resolved === 'dark' ? light.userData.power : 0; });
    halos.material.opacity = resolved === 'dark' ? 0.5 : 0;
    journey.dataset.sceneTheme = resolved;
    schedule();
  }

  function frame(now) {
    raf = 0;
    if (disposed || !visible || document.hidden || !started) { lastTime = 0; return; }
    try {
      if (controlsDirty) updateProgress();
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 1 / 60;
      updateCamera(delta, cameraNeedsSnap);
      clockTime += delta;
      lastTime = now;
      water.material.uniforms.time.value = clockTime;
      renderer.render(scene, camera);
      schedule();
    } catch (error) {
      console.warn('PCC: scene rendering stopped.', error);
      fail('fallback');
    }
  }

  function schedule() {
    if (!disposed && started && visible && !document.hidden && !raf) raf = requestAnimationFrame(frame);
  }

  try {
    if (externalSignal?.aborted) throw new Error('Scene initialization cancelled');
    externalSignal?.addEventListener('abort', dispose, { once: true });
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail('context-lost'); }, { signal });
    const timeout = setTimeout(() => abort.abort(), 20000);
    let bytes;
    try {
      const response = await fetch(new URL('../models/home/pcc-riverside.glb', import.meta.url), { signal });
      if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
      bytes = await response.arrayBuffer();
    } finally { clearTimeout(timeout); }
    const gltf = await new GLTFLoader().parseAsync(bytes, new URL('../models/home/', import.meta.url).href);
    world = gltf.scene;
    if (disposed) {
      collectResources(world);
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => { texture.dispose(); texture.source?.data?.close?.(); });
      throw new Error('Scene was disposed while loading');
    }
    world.traverse(node => {
      if (!node.isMesh) return;
      if (node.material.name === 'river-water') water = node;
      node.castShadow = !['lantern-glow', 'window-glass', 'beacon-beam', 'river-water'].includes(node.material.name);
      node.receiveShadow = true;
    });
    scene.add(world);
    collectResources(world);
    if (!water) throw new Error('The riverside model has no water surface');
    water.material = waterMaterial();
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = haloCanvas.height = 32;
    const haloContext = haloCanvas.getContext('2d');
    const glow = haloContext.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgba(255,225,150,0.8)');
    glow.addColorStop(0.15, 'rgba(255,181,85,0.35)');
    glow.addColorStop(1, 'rgba(255,160,60,0)');
    haloContext.fillStyle = glow;
    haloContext.fillRect(0, 0, 32, 32);
    const lightsPositions = [];
    world.traverse(node => node.userData.lamps?.forEach(p => lightsPositions.push(...p)));
    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lightsPositions, 3));
    halos = new THREE.Points(haloGeometry, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(haloCanvas), color: 0xffcf80, size: 3.8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(halos);
    // Only a few real lights; the many voxel lanterns use emissive materials.
    [[-10, 7, 4, 24], [10, 7, 4, 24], [-37, 5, 7, 18], [33, 20, -62, 45], [-42, 8, -74, 28]].forEach(([x, y, z, power]) => {
      const light = new THREE.PointLight(0xffbd63, 0, 24, 1.5);
      light.position.set(x, y, z);
      light.userData.power = power;
      scene.add(light); pointLights.push(light);
    });
    applyTheme();
    resize();
    // Compile/upload while the static cover remains visible.
    updateProgress();
    updateCamera(0, true);
    await renderer.compileAsync(scene, camera);
    if (disposed) throw new Error('Scene disposed during shader compilation');
  } catch (error) {
    dispose();
    throw error;
  }

  function start() {
    if (disposed) return;
    started = true;
    // Preserve a reader's chapter if they scrolled while the model was loading.
    const atTop = journey.getBoundingClientRect().top >= 0;
    const anchor = stops.find(stop => stop.getBoundingClientRect().bottom > 100) || journey.nextElementSibling;
    const oldOffset = anchor?.getBoundingClientRect().top;
    journey.classList.add('journey--enhanced');
    if (!atTop && anchor) {
      window.scrollBy({ top: anchor.getBoundingClientRect().top - oldOffset, behavior: 'instant' });
    }
    resize();
    updateProgress();
    updateCamera(0, true);
    applyTheme();
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    journey.dataset.sceneState = 'ready';
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resizeObserver.observe(document.querySelector('pcc-header'));
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      journey.dataset.inView = String(visible);
      if (!visible) { cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
      else { controlsDirty = true; cameraNeedsSnap = true; schedule(); }
    });
    intersectionObserver.observe(journey);
    window.addEventListener('scroll', () => { controlsDirty = true; schedule(); }, { passive: true, signal });
    window.addEventListener('resize', resize, { passive: true, signal });
    window.addEventListener('pcc:theme-change', applyTheme, { signal });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
      else { controlsDirty = true; cameraNeedsSnap = true; schedule(); }
    }, { signal });
    schedule();
  }

  return { start, dispose };
}
