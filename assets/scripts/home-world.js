import * as THREE from 'three';

// One unit is one block. +Z faces the riverbank in the original homepage image.
// This is a reference reconstruction, not an export of the original game world.
export const WORLD_VERSION = 1;
export const CAMERA_STOPS = [
  { position: [23, 14, 48], target: [-3, 6, -4], fov: 53 },
  { position: [8, 11, 22], target: [-20, 6, -3], fov: 57 },
  { position: [56, 40, 10], target: [6, 17, -42], fov: 56 },
  { position: [65, 65, 85], target: [-12, 8, -40], fov: 54 }
];
export const MOBILE_CAMERA_STOPS = [
  { position: [28, 22, 80], target: [-2, 2, -12] },
  { position: [15, 23, 60], target: [-20, 3, -6] },
  { position: [88, 65, 68], target: [13, 8, -50] },
  { position: [70, 85, 105], target: [-10, 4, -32] }
];

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function pixelTexture(color, pattern, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const rng = randomGenerator(seed);
  const base = new THREE.Color(color);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 32, 32);
  for (let y = 0; y < 32; y += 2) {
    for (let x = 0; x < 32; x += 2) {
      const shift = 0.75 + rng() * 0.46;
      ctx.fillStyle = '#' + base.clone().multiplyScalar(shift).getHexString();
      ctx.fillRect(x, y, 2, pattern === 'wood' ? 1 : 2);
    }
  }
  if (pattern === 'brick') {
    ctx.fillStyle = '#27312d55';
    for (let y = 0; y < 32; y += 8) {
      ctx.fillRect(0, y, 32, 1);
      for (let x = (y % 16 ? 8 : 0); x < 32; x += 16) ctx.fillRect(x, y, 1, 8);
    }
  } else if (pattern === 'wood') {
    ctx.fillStyle = '#372b2855';
    [0, 8, 16, 24].forEach(y => ctx.fillRect(0, y, 32, 1));
    ctx.fillRect(7, 1, 1, 7);
    ctx.fillRect(24, 9, 1, 7);
  } else if (pattern === 'bark') {
    ctx.fillStyle = '#30251f70';
    for (let x = 1; x < 32; x += 5) ctx.fillRect(x, 0, 2, 32);
  } else if (pattern === 'leaf') {
    ctx.fillStyle = '#192f3155';
    for (let i = 0; i < 32; i++) ctx.fillRect(Math.floor(rng() * 16) * 2, Math.floor(rng() * 16) * 2, 3, 3);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestMipmapLinearFilter;
  map.name = `pcc-original-${pattern}-${seed}`;
  return map;
}

export function createWorld() {
  const root = new THREE.Group();
  root.name = 'PCC Riverside — reference reconstruction';
  root.userData = { version: WORLD_VERSION, source: 'hero.jpg and September 6 reference video', unit: 'block' };
  const rng = randomGenerator(73410);
  const materials = {};
  const batches = new Map();
  const lamps = [];
  const palette = {
    grass: ['#638741', 'noise'], grassLight: ['#79964a', 'noise'], dirt: ['#806347', 'noise'],
    sand: ['#b9b497', 'noise'], stone: ['#858c85', 'brick'], darkStone: ['#42494b', 'brick'],
    moss: ['#6d7960', 'brick'], wood: ['#ae8653', 'wood'], darkWood: ['#624932', 'bark'],
    roof: ['#666f70', 'brick'], redRoof: ['#8a4740', 'brick'], leaf: ['#4e7636', 'leaf'],
    leafLight: ['#668746', 'leaf'], pine: ['#345648', 'leaf'], pink: ['#b879a4', 'leaf'],
    white: ['#c9d0c7', 'brick'], path: ['#b09b69', 'noise'], gold: ['#c19449', 'brick'],
    black: ['#262b31', 'brick'], silver: ['#c3d3d3', 'brick'], red: ['#a34c45', 'brick'],
    flower: ['#e7c45b', 'noise'], lilac: ['#ad79bc', 'noise']
  };
  Object.entries(palette).forEach(([name, [color, pattern]], i) => {
    materials[name] = new THREE.MeshStandardMaterial({ map: pixelTexture(color, pattern, i + 25), roughness: 0.96 });
    materials[name].name = name;
  });
  materials.glow = new THREE.MeshStandardMaterial({ color: '#ffdaa2', emissive: '#ffb64e', emissiveIntensity: 0.35, roughness: 0.6 });
  materials.glow.name = 'lantern-glow';
  materials.beacon = new THREE.MeshBasicMaterial({ color: '#ffbf66', transparent: true, opacity: 0.19, depthWrite: false });
  materials.beacon.name = 'beacon-beam';
  materials.glass = new THREE.MeshStandardMaterial({ color: '#97c7c1', roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.48, depthWrite: false });
  materials.glass.name = 'window-glass';

  function block(type, x, y, z, sx = 1, sy = 1, sz = 1, rotation = 0) {
    if (!batches.has(type)) batches.set(type, []);
    batches.get(type).push([x, y, z, sx, sy, sz, rotation]);
  }
  function layer(type, x, y, z, width, depth, scale = 1) {
    for (let a = 0; a < width; a++) for (let b = 0; b < depth; b++) {
      block(type, x + a * scale, y, z + b * scale, scale, scale, scale);
    }
  }
  function lamp(x, y, z, tall = false) {
    if (tall) {
      block('darkWood', x, y + 1.6, z, 0.28, 3.2, 0.28);
      block('darkWood', x + 0.38, y + 3.1, z, 1, 0.23, 0.23);
      x += 0.65; y += 2.5;
    }
    block('black', x, y, z, 0.62, 0.12, 0.62);
    block('glow', x, y + 0.35, z, 0.43, 0.6, 0.43);
    block('black', x, y + 0.71, z, 0.62, 0.12, 0.62);
    for (const dx of [-0.24, 0.24]) for (const dz of [-0.24, 0.24]) block('darkWood', x + dx, y + 0.35, z + dz, 0.065, 0.68, 0.065);
    lamps.push([x, y + 0.4, z]);
  }

  // Terraced riverbank: the water widens in the foreground and bends behind the bridge.
  function channel(x, z) {
    const center = z < -16 ? 10 + (-z - 16) * 0.27 : 0;
    const halfWidth = z > 12 ? 25 + (z - 12) * 0.16 : z < -16 ? 9 : 17;
    return Math.abs(x - center) < halfWidth;
  }
  for (let x = -100; x <= 100; x += 4) {
    for (let z = -112; z <= 72; z += 4) {
      if (channel(x, z)) {
        block('sand', x, -3.4 + Math.sin(x * 0.25) * 0.3, z, 4, 1, 4);
      } else {
        const nearBank = channel(x - 4, z) || channel(x + 4, z) || channel(x, z + 4);
        const elevation = nearBank ? 0 : 0.5 + (z < -85 ? Math.floor((-z - 85) / 8) : 0);
        block('dirt', x, elevation - 1.4, z, 4, 3, 4);
        block(rng() > 0.7 ? 'grassLight' : 'grass', x, elevation + 0.18, z, 4, 0.5, 4);
        if (nearBank) block('sand', x + (x < 0 ? 1 : -1), -1.4, z, 4, 0.7, 4);
      }
    }
  }
  // Walkways and banks visible in both references.
  for (let z = -83; z < 36; z++) {
    for (const x of [-30, 37]) block('path', x, 0.98, z, 3, 0.18, 1);
    if (z % 10 === 0) for (const x of [-32.5, 39.5]) lamp(x, 1, z, true);
  }
  for (let x = -53; x < 61; x++) block('path', x, 1.06, -21, 1, 0.18, 3);

  // Stone bridge: five piers, stepped arches, plank deck, moss and hanging vines.
  for (let x = -23; x <= 23; x++) {
    const arch = 3.2 + Math.max(0, 2.0 * (1 - Math.abs(x) / 23));
    for (let z = -2; z <= 2; z++) block('wood', x, arch, z, 1, 0.48, 1);
    for (const z of [-3, 3]) {
      block((x + 23) % 3 ? 'moss' : 'stone', x, arch + 0.05, z);
      block('stone', x, arch + 1.0, z, 1, 0.8, 0.65);
      if (x % 5 === 0) {
        block('darkWood', x, arch + 1.65, z, 0.8, 1.2, 0.8);
        lamp(x, arch + 2.3, z);
      }
      if (x % 7 !== 0) {
        block(rng() > 0.4 ? 'leaf' : 'leafLight', x, arch + 1.05, z + 0.45, 1.12, 1.12, 1.12);
        const length = 1 + Math.floor(rng() * 4);
        if (x % 3 === 0) for (let y = 0; y < length; y++) block('leaf', x, arch - y * 0.78, z + 0.6, 0.72, 0.85, 0.5);
        if (x % 4 === 0) block('lilac', x + 0.2, arch + 1.18, z + 1, 0.25, 0.25, 0.15);
      }
    }
    if ([-20, -10, 0, 10, 20].includes(x)) {
      for (const z of [-2.25, 2.25]) block('stone', x, 1.25, z, 1.6, 5.5, 1.6);
    } else {
      const distance = Math.min(...[-20, -10, 0, 10, 20].map(p => Math.abs(p - x)));
      if (distance < 3) for (const z of [-2.25, 2.25]) block('stone', x, arch - distance * 0.45 - 0.55, z, 1, 1, 1.3);
    }
  }
  for (const sign of [-1, 1]) for (let i = 0; i < 6; i++) block('stone', sign * (24 + i), 3.0 - i * 0.35, 0, 1, 0.5, 6);

  function cottage(x, z, width = 12, depth = 11, roof = 'roof') {
    block('stone', x, 1.4, z, width + 1, 1.3, depth + 1);
    for (let y = 2; y <= 7; y++) {
      for (let a = -width / 2; a <= width / 2; a++) {
        for (const side of [-1, 1]) {
          const isDoor = side === 1 && Math.abs(a) < 1.4 && y < 6;
          const isWindow = Math.abs(a) > 2 && Math.abs(a) < 5 && y >= 4 && y <= 5;
          block(isDoor ? 'darkWood' : isWindow ? 'glow' : 'wood', x + a, y, z + side * depth / 2);
          if (isWindow) block('glass', x + a, y, z + side * (depth / 2 + 0.51), 0.92, 0.92, 0.08);
        }
      }
      for (let b = -depth / 2 + 1; b < depth / 2; b++) for (const side of [-1, 1]) block('wood', x + side * width / 2, y, z + b);
    }
    for (const a of [-width / 2, 0, width / 2]) for (const b of [-depth / 2 - 0.1, depth / 2 + 0.1]) block('darkWood', x + a, 4.5, z + b, 0.8, 6, 0.8);
    for (let level = 0; level <= width / 2 + 1; level++) {
      const half = width / 2 + 1 - level;
      for (const sign of [-1, 1]) for (let b = -depth / 2 - 1; b <= depth / 2 + 1; b++) block(roof, x + sign * half, 7.7 + level * 0.7, z + b, 1.3, 0.8, 1);
      if (half > 0) for (const side of [-1, 1]) block('wood', x, 7.3 + level * 0.7, z + side * depth / 2, half * 2, 0.7, 0.8);
    }
    block('stone', x + 3, 11.7, z - 2, 1.6, 5, 1.6);
    block('darkStone', x + 3, 14.4, z - 2, 2, 0.4, 2);
    for (const a of [-width / 2 + 1, width / 2 - 1]) lamp(x + a, 3.4, z + depth / 2 + 1);
    for (let a = -width / 2; a <= width / 2; a++) {
      block('grass', x + a, 1.5, z + depth / 2 + 1.8, 1, 0.65, 0.8);
      block(a % 2 ? 'flower' : 'white', x + a, 2.1, z + depth / 2 + 1.8, 0.33, 0.3, 0.33);
    }
  }
  cottage(-39, -2, 14, 12);
  cottage(-45, -31, 10, 10, 'redRoof');
  cottage(-63, -17, 12, 11);
  cottage(-24, -67, 12, 12, 'redRoof');
  cottage(54, -8, 10, 9);

  function tree(x, z, height = 7, kind = 'leaf') {
    block('darkWood', x, 1 + height / 2, z, 0.95, height, 0.95);
    for (let y = 0; y < 3; y++) {
      const radius = y === 2 ? 1 : 2;
      for (let a = -radius; a <= radius; a++) for (let b = -radius; b <= radius; b++) {
        if (Math.abs(a) === radius && Math.abs(b) === radius && rng() > 0.4) continue;
        block(kind, x + a * 1.25, height + y * 1.2, z + b * 1.25, 1.3, 1.3, 1.3);
      }
    }
  }
  for (const [x, z, h] of [[-29, 18, 7], [-52, 7, 8], [-54, -6, 9], [-21, -16, 6], [-48, 22, 9], [31, 22, 7], [49, 15, 8], [53, -24, 7], [-15, -39, 7], [-6, -59, 8]]) tree(x, z, h);
  for (let i = 0; i < 100; i++) {
    const x = -94 + rng() * 188;
    const z = -108 + rng() * 135;
    if (channel(x, z) || (x > -70 && x < 68 && z > -84)) continue;
    tree(Math.round(x), Math.round(z), 7 + Math.floor(rng() * 6), i % 3 ? 'pine' : 'leaf');
  }
  for (let i = 0; i < 180; i++) {
    const x = -55 + rng() * 106; const z = 9 + rng() * 32;
    if (channel(x, z) || Math.abs(x + 30) < 3 || Math.abs(x - 37) < 3) continue;
    block('leaf', x, 1.25, z, 0.12, 0.6, 0.12);
    block(i % 3 ? 'flower' : 'white', x, 1.65, z, 0.24, 0.18, 0.24);
  }
  // Foreground rowboat, reeds, and a small timber landing.
  block('darkWood', -14, -0.1, 25, 3.4, 0.35, 1.8, -0.3);
  for (const side of [-1, 1]) block('wood', -14, 0.25, 25 + side * 0.85, 3.4, 0.7, 0.25, -0.3);
  for (const x of [-15.5, -12.5]) block('wood', x, 0.25, 25, 0.25, 0.7, 1.65, -0.3);
  block('wood', -14, 0.4, 25, 0.45, 0.2, 1.65);
  block('darkWood', -12.8, 0.3, 26.4, 0.15, 0.15, 3, -0.7);
  for (let i = 0; i < 8; i++) block('wood', 25 + i, 1.6, 21, 1, 0.4, 5);
  for (const x of [26, 31]) for (const z of [18.7, 23.3]) block('darkWood', x, 0.6, z, 0.65, 4, 0.65);

  // Crossed-sword PVP platform and its elevated dark walkway.
  const arenaX = -7, arenaZ = -38;
  for (let i = 0; i < 4; i++) block('white', arenaX, 1 + i * 0.7, arenaZ, 25 - i * 2, 0.7, 21 - i * 2);
  layer('stone', arenaX - 9, 3.45, arenaZ - 7, 19, 15);
  for (const x of [-18, 4]) for (const z of [-47, -29]) lamp(x, 3.8, z);
  for (let x = -20; x <= 8; x++) block('white', x, 4.2, -47, 1, 1.1, 0.5);
  // Pixel outlines and blades assembled as solid cubes in the X/Y plane.
  for (const direction of [-1, 1]) {
    for (let i = -4; i <= 9; i++) {
      const x = arenaX + direction * i * 0.82; const y = 10 + i * 0.86;
      const material = i < 0 ? 'darkWood' : 'silver';
      for (let edge = -1; edge <= 1; edge++) block(edge === 0 ? material : 'black', x + edge * 0.7, y, arenaZ, 0.8, 0.92, 0.75);
    }
    for (let i = -2; i <= 2; i++) block('gold', arenaX + direction * -1.64 + i, 8.3 - direction * i, arenaZ + 0.12, 0.9, 0.9, 1);
  }
  for (let x = -29; x < 46; x++) block('black', x, 12, -27, 1, 0.7, 2);
  for (const x of [-28, 12, 44]) block('darkStone', x, 6, -27, 1.5, 12, 1.5);
  for (let x = -29; x < 45; x += 5) block('glow', x, 12.45, -27.85, 0.35, 0.12, 0.2);

  // Tall stone platform behind the bridge, recognizable in the daytime photograph.
  for (const x of [-27, -16]) block('darkStone', x, 18, -55, 1.8, 36, 1.8);
  block('stone', -21.5, 36, -55, 17, 1.4, 11);
  block('darkStone', -21.5, 34.8, -55, 13, 1.2, 8);

  // Beacon tower: stepped buttresses, orange seams, lanterns and a vertical beam.
  const tx = 33, tz = -62;
  for (let i = 0; i < 4; i++) block('darkStone', tx, 1.2 + i, tz, 24 - i * 3, 1, 24 - i * 3);
  block('black', tx, 21, tz, 5, 38, 5);
  for (const sign of [-1, 1]) {
    block('gold', tx + sign * 2.65, 22, tz, 0.4, 39, 1.1);
    block('gold', tx, 22, tz + sign * 2.65, 1.1, 39, 0.4);
    for (const cross of [-1, 1]) {
      for (let y = 4; y <= 36; y++) {
        const spread = Math.max(2.8, 10 - (y - 4) * 0.24);
        block('darkStone', tx + sign * spread, y, tz + cross * spread, 2.2, 1, 2.2);
        if (y % 2 === 0) block('glow', tx + sign * (spread + 0.85), y, tz + cross * (spread + 0.85), 0.32, 0.75, 0.32);
      }
      lamp(tx + sign * 10, 4.3, tz + cross * 10);
    }
  }
  for (let y = 6; y < 35; y += 6) block('stone', tx, y, tz, 7, 0.65, 7);
  block('glow', tx, 39.5, tz, 3, 1.4, 3);
  block('beacon', tx, 72, tz, 1.4, 64, 1.4);
  block('beacon', tx, 72, tz, 2.6, 64, 2.6);

  // Firework stage from the supplied historical recording, including its 2024 sign.
  const stageX = -42, stageZ = -77;
  for (let i = 0; i < 4; i++) block('stone', stageX, 1 + i * 0.6, stageZ, 28 - i * 2, 0.65, 13 - i);
  block('darkWood', stageX, 7.5, stageZ - 4, 23, 9, 1.2);
  const digits = { 2: ['111', '001', '111', '100', '111'], 0: ['111', '101', '101', '101', '111'], 4: ['101', '101', '111', '001', '001'] };
  [...'2024'].forEach((digit, d) => digits[digit].forEach((row, y) => [...row].forEach((v, x) => {
    if (v === '1') block('glow', stageX - 8.6 + d * 4.6 + x, 10.6 - y, stageZ - 3.28, 0.82, 0.82, 0.3);
  })));
  for (const side of [-1, 1]) {
    tree(stageX + side * 17, stageZ + 6, 7, 'pink');
    block('gold', stageX + side * 13, 5.7, stageZ - 4, 1.4, 9, 1.4);
  }
  // Warm cylindrical pavilion approximated by stepped square columns, as in the video.
  for (const [x, z] of [[-62, -54], [55, -43]]) {
    block('white', x, 1.6, z, 12, 2, 12);
    block('white', x, 11.5, z, 12, 1, 12);
    block('gold', x, 12.3, z, 9, 0.7, 9);
    for (const a of [-4.5, 4.5]) for (const b of [-4.5, 4.5]) block('white', x + a, 6.5, z + b, 1.2, 9, 1.2);
    for (const a of [-3, 0, 3]) for (const side of [-1, 1]) {
      block('glow', x + a, 6.4, z + side * 4.6, 1.5, 8, 0.65);
      block('glow', x + side * 4.6, 6.4, z + a, 0.65, 8, 1.5);
    }
  }

  const cube = new THREE.BoxGeometry();
  const dummy = new THREE.Object3D();
  for (const [type, instances] of batches) {
    const mesh = new THREE.InstancedMesh(cube, materials[type], instances.length);
    mesh.name = `blocks-${type}`;
    mesh.castShadow = !['glow', 'glass', 'beacon'].includes(type);
    mesh.receiveShadow = true;
    instances.forEach(([x, y, z, sx, sy, sz, rotation], i) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, rotation, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  root.userData.lamps = lamps.filter((_, i) => i % 4 === 0);
  root.userData.blockCount = [...batches.values()].reduce((sum, list) => sum + list.length, 0);
  const riverMaterial = new THREE.MeshStandardMaterial({ color: 0x246588, roughness: 0.38, metalness: 0.12, transparent: true, opacity: 0.88, depthWrite: false });
  riverMaterial.name = 'river-water';
  const river = new THREE.Mesh(new THREE.PlaneGeometry(220, 210), riverMaterial);
  river.name = 'river-surface';
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, -0.65, -20);
  root.add(river);
  return root;
}
