/* CYBER SNAKE 3D — city streets edition */
(function () {
  "use strict";

  // ─── Config ───────────────────────────────────────────────
  const N = 21;                 // grid size (odd → center street)
  const CELL = 1.15;
  const FOOD_PER_LEVEL = 5;
  const INITIAL_LENGTH = 3;
  const MAX_DPR = 1.25;
  const MAX_PARTICLES = 36;

  // Difficulty presets — plazaChance = chance an interior block is OPEN
  const DIFFICULTIES = {
    easy: {
      label: "简单",
      hint: "宽阔大道 · 楼距大 · 节奏舒缓",
      plazaChance: 0.78,
      roadPeriod: 3, // roads every 3 cells → ~2-wide avenues
      baseTick: 320,
      minTick: 140,
      speedStep: 8,
      scoreMul: 1,
    },
    medium: {
      label: "中等",
      hint: "楼群适中 · 速度中等 · 标准挑战",
      plazaChance: 0.32,
      roadPeriod: 2,
      baseTick: 240,
      minTick: 100,
      speedStep: 10,
      scoreMul: 1.5,
    },
    hard: {
      label: "困难",
      hint: "楼密路窄 · 速度更快 · 分数加倍",
      plazaChance: 0.12,
      roadPeriod: 2,
      baseTick: 175,
      minTick: 80,
      speedStep: 12,
      scoreMul: 2.2,
    },
  };
  let difficultyKey = "easy";
  function diff() {
    return DIFFICULTIES[difficultyKey];
  }

  // ─── DOM ──────────────────────────────────────────────────
  const canvas = document.getElementById("game-canvas");
  const scoreEl = document.getElementById("score");
  const highEl = document.getElementById("high-score");
  const levelEl = document.getElementById("level");
  const speedEl = document.getElementById("speed-display");
  const lengthEl = document.getElementById("length-val");
  const statusEl = document.getElementById("status-text");
  const flashEl = document.getElementById("flash");
  const overlayStart = document.getElementById("overlay-start");
  const overlayPause = document.getElementById("overlay-pause");
  const overlayOver = document.getElementById("overlay-over");
  const finalScore = document.getElementById("final-score");
  const finalBest = document.getElementById("final-best");
  const finalLevel = document.getElementById("final-level");
  const newBestEl = document.getElementById("new-best");
  const btnStart = document.getElementById("btn-start");
  const btnResume = document.getElementById("btn-resume");
  const btnRestart = document.getElementById("btn-restart");

  // ─── State ────────────────────────────────────────────────
  let scene, camera, renderer, clock;
  let snakeGroup, foodMesh, foodPad, cityMeshGroup, streetLinesGroup;
  const FOOD_Y = 0.32;
  let solid = [];            // solid[z][x] === 1 → building / blocked
  let snakeBody = [];        // [{x,z}]
  let prevBody = [];         // for interpolation
  let dir = { x: 1, z: 0 };
  let nextDir = { x: 1, z: 0 };
  let food = { x: 0, z: 0 };
  let score = 0;
  let level = 1;
  let foodEaten = 0;
  let highScore = loadHigh();
  let state = "start";
  let tickMs = 320;
  let acc = 0;
  let shakeT = 0;
  let touchStart = null;

  // Shared assets
  let segGeo, headMat, bodyMat, glowGeo, glowMat, eyeGeo, eyeMat;
  const particlePool = [];
  const activeParticles = [];

  // Scratch
  const _hp = { x: 0, z: 0 };
  const _m4 = new THREE.Matrix4();
  const _v3 = new THREE.Vector3();
  const _s3 = new THREE.Vector3();
  const _c = new THREE.Color();

  // Smoothed camera state (avoid discrete-tick jumps)
  let camHeadX = 0;
  let camHeadZ = 0;
  let camLookX = 0;
  let camLookZ = 0;
  let faceX = 1;
  let faceZ = 0;

  highEl.textContent = highScore;

  // ─── Helpers ──────────────────────────────────────────────
  function cellToWorld(gx, gz, out) {
    out = out || {};
    const half = (N - 1) / 2;
    out.x = (gx - half) * CELL;
    out.z = (gz - half) * CELL;
    return out;
  }

  function isOpen(x, z) {
    if (x < 0 || z < 0 || x >= N || z >= N) return false;
    return solid[z][x] === 0;
  }

  // ─── City map ─────────────────────────────────────────────
  // Roads on a period grid; buildings fill the rest (minus plazas).
  function isRoadCell(x, z) {
    const p = diff().roadPeriod;
    return x % p === 0 || z % p === 0;
  }

  function buildCityMap() {
    const cfg = diff();
    const plazaChance = cfg.plazaChance;
    solid = [];
    for (let z = 0; z < N; z++) {
      solid[z] = [];
      for (let x = 0; x < N; x++) {
        const border = x === 0 || z === 0 || x === N - 1 || z === N - 1;
        if (border) solid[z][x] = 1;
        else if (isRoadCell(x, z)) solid[z][x] = 0;
        else solid[z][x] = Math.random() < plazaChance ? 0 : 1;
      }
    }
    // Clear start corridor (center + a few cells ahead)
    const c = (N - 1) / 2 | 0;
    const halfW = cfg.roadPeriod >= 3 ? 1 : 0;
    for (let i = -2; i <= 6; i++) {
      const x = c + i;
      if (x <= 0 || x >= N - 1) continue;
      for (let dz = -halfW; dz <= halfW + 1; dz++) {
        const z = c + dz;
        if (z > 0 && z < N - 1) solid[z][x] = 0;
      }
    }
  }

  function randomOpenCell() {
    const streets = [];
    const anyOpen = [];
    for (let z = 1; z < N - 1; z++) {
      for (let x = 1; x < N - 1; x++) {
        if (solid[z][x] !== 0) continue;
        anyOpen.push({ x, z });
        if (isRoadCell(x, z)) streets.push({ x, z });
      }
    }
    const list = streets.length ? streets : anyOpen;
    if (!list.length) return { x: 2, z: 2 };
    return list[(Math.random() * list.length) | 0];
  }

  // ─── Three init ───────────────────────────────────────────
  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1628);

    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 10, 10);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;

    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    initShared();
    buildCityMap();
    buildGround();
    rebuildCityVisuals();
    buildStars();
    initParticlePool();
    buildSnakeMeshes(INITIAL_LENGTH);
    buildFoodMesh();
  }

  function initShared() {
    const s = 0.85;
    segGeo = new THREE.BoxGeometry(s, s * 0.5, s);
    headMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    headMat.toneMapped = false;
    bodyMat = new THREE.MeshBasicMaterial({ color: 0x00c8f0 });
    bodyMat.toneMapped = false;
    glowGeo = new THREE.BoxGeometry(s + 0.18, s * 0.55 + 0.12, s + 0.18);
    glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e8ff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    glowMat.toneMapped = false;
    eyeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.08);
    eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });
    eyeMat.toneMapped = false;
  }

  // ─── Ground: asphalt + neon lane marks ────────────────────
  function buildGround() {
    const size = N * CELL + 4;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ color: 0x1a2438 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(N * CELL * 0.55, N * CELL * 0.62, 64),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    buildStreetLines();
  }

  function buildStreetLines() {
    if (streetLinesGroup) {
      streetLinesGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      scene.remove(streetLinesGroup);
    }
    streetLinesGroup = new THREE.Group();
    scene.add(streetLinesGroup);

    const p = diff().roadPeriod;
    const half = (N - 1) / 2;
    const span = half * CELL + 1.2;
    const pts = [];
    const dashPts = [];
    for (let i = 0; i < N; i++) {
      if (i % p !== 0) continue;
      const w = (i - half) * CELL;
      pts.push(w, 0.02, -span, w, 0.02, span);
      pts.push(-span, 0.02, w, span, 0.02, w);
      for (let k = -span; k < span; k += 0.7) {
        dashPts.push(w, 0.025, k, w, 0.025, k + 0.28);
        dashPts.push(k, 0.025, w, k + 0.28, 0.025, w);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x3ab0e0,
      transparent: true,
      opacity: 0.75,
    });
    streetLinesGroup.add(new THREE.LineSegments(geo, mat));

    const dashGeo = new THREE.BufferGeometry();
    dashGeo.setAttribute("position", new THREE.Float32BufferAttribute(dashPts, 3));
    const dashMat = new THREE.LineBasicMaterial({
      color: 0xf5ff3c,
      transparent: true,
      opacity: 0.35,
    });
    dashMat.toneMapped = false;
    streetLinesGroup.add(new THREE.LineSegments(dashGeo, dashMat));
  }

  // ─── Buildings (instanced) ────────────────────────────────
  function disposeCityMeshes() {
    if (!cityMeshGroup) return;
    cityMeshGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    scene.remove(cityMeshGroup);
    cityMeshGroup = null;
  }

  function rebuildCityVisuals() {
    disposeCityMeshes();
    buildStreetLines();
    cityMeshGroup = new THREE.Group();
    scene.add(cityMeshGroup);
    buildBuildings();
    buildStreetLights();
  }

  function buildBuildings() {
    const cells = [];
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (solid[z][x] === 1) cells.push({ x, z });
      }
    }

    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const buildings = new THREE.InstancedMesh(bGeo, bMat, cells.length);
    buildings.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const bCol = new Float32Array(cells.length * 3);

    // Vertical neon edge strips
    const sGeo = new THREE.BoxGeometry(0.05, 1, 0.05);
    const sMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    sMat.toneMapped = false;
    const strips = new THREE.InstancedMesh(sGeo, sMat, cells.length);
    strips.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const stripCol = new Float32Array(cells.length * 3);

    // Horizontal neon bands (signage)
    const bandGeo = new THREE.BoxGeometry(1, 0.06, 1);
    const bandMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
    bandMat.toneMapped = false;
    const bands = new THREE.InstancedMesh(bandGeo, bandMat, cells.length * 2);
    bands.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const bandCol = new Float32Array(cells.length * 2 * 3);
    let bandN = 0;

    // Roof beacons
    const dGeo = new THREE.BoxGeometry(0.22, 0.14, 0.22);
    const dMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    dMat.toneMapped = false;
    const dots = new THREE.InstancedMesh(dGeo, dMat, cells.length);
    dots.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dotCol = new Float32Array(cells.length * 3);
    let dotN = 0;

    // Window points
    const maxWin = 1400;
    const winPos = new Float32Array(maxWin * 3);
    const winCol = new Float32Array(maxWin * 3);
    let winN = 0;

    const neon = [0x00f0ff, 0xff2bd6, 0xf5ff3c, 0x7b6cff, 0x00ff9d, 0xff6a3d];
    const bodyTints = [0x1a2a42, 0x203048, 0x182438, 0x243050, 0x1c2c40];
    const identity = new THREE.Quaternion();
    const half = (N - 1) / 2;
    const bodyCol = new THREE.Color();

    for (let i = 0; i < cells.length; i++) {
      const { x, z } = cells[i];
      const wx = (x - half) * CELL;
      const wz = (z - half) * CELL;
      const border = x === 0 || z === 0 || x === N - 1 || z === N - 1;
      // Skylines: taller outer ring, varied inner blocks
      const h = border
        ? 6 + Math.random() * 10
        : 2.0 + Math.random() * 4.5 + (Math.random() > 0.85 ? 3 : 0);
      const w = CELL * 0.9;
      const d = CELL * 0.9;

      _v3.set(wx, h / 2, wz);
      _s3.set(w, h, d);
      _m4.compose(_v3, identity, _s3);
      buildings.setMatrixAt(i, _m4);
      bodyCol.setHex(bodyTints[i % bodyTints.length]);
      bCol[i * 3] = bodyCol.r;
      bCol[i * 3 + 1] = bodyCol.g;
      bCol[i * 3 + 2] = bodyCol.b;

      const c = neon[i % neon.length];
      _c.setHex(c);

      // Corner strip
      _v3.set(wx + w * 0.46, h * 0.5, wz + d * 0.46);
      _s3.set(1, h * 0.85, 1);
      _m4.compose(_v3, identity, _s3);
      strips.setMatrixAt(i, _m4);
      stripCol[i * 3] = _c.r;
      stripCol[i * 3 + 1] = _c.g;
      stripCol[i * 3 + 2] = _c.b;

      // 1–2 horizontal neon bands
      const bandsHere = Math.random() > 0.35 ? 2 : 1;
      for (let b = 0; b < bandsHere && bandN < cells.length * 2; b++) {
        const y = h * (0.25 + b * 0.35 + Math.random() * 0.1);
        _v3.set(wx, y, wz);
        _s3.set(w * 1.04, 1, d * 1.04);
        _m4.compose(_v3, identity, _s3);
        bands.setMatrixAt(bandN, _m4);
        const bc = neon[(i + b + 1) % neon.length];
        _c.setHex(bc);
        bandCol[bandN * 3] = _c.r;
        bandCol[bandN * 3 + 1] = _c.g;
        bandCol[bandN * 3 + 2] = _c.b;
        bandN++;
      }

      // Roof beacon
      if (Math.random() > 0.4 && dotN < cells.length) {
        _v3.set(wx, h + 0.12, wz);
        _s3.set(1, 1, 1);
        _m4.compose(_v3, identity, _s3);
        dots.setMatrixAt(dotN, _m4);
        _c.setHex(c);
        dotCol[dotN * 3] = _c.r;
        dotCol[dotN * 3 + 1] = _c.g;
        dotCol[dotN * 3 + 2] = _c.b;
        dotN++;
      }

      // Dense window lights
      const rows = Math.max(2, (h / 0.42) | 0);
      const cols = Math.max(2, (w / 0.28) | 0);
      for (let r = 0; r < rows && winN < maxWin; r++) {
        for (let col = 0; col < cols && winN < maxWin; col++) {
          if (Math.random() > 0.48) continue;
          const face = (Math.random() * 4) | 0;
          let px, pz;
          if (face === 0) { px = wx - w * 0.35 + col * (w * 0.7 / cols); pz = wz + d * 0.51; }
          else if (face === 1) { px = wx - w * 0.35 + col * (w * 0.7 / cols); pz = wz - d * 0.51; }
          else if (face === 2) { px = wx + w * 0.51; pz = wz - d * 0.35 + col * (d * 0.7 / cols); }
          else { px = wx - w * 0.51; pz = wz - d * 0.35 + col * (d * 0.7 / cols); }
          winPos[winN * 3] = px;
          winPos[winN * 3 + 1] = 0.25 + r * 0.42;
          winPos[winN * 3 + 2] = pz;
          // Warm/cool mix (independent of band overwrite)
          const warm = Math.random() > 0.7;
          const neonR = ((c >> 16) & 255) / 255;
          const neonG = ((c >> 8) & 255) / 255;
          const neonB = (c & 255) / 255;
          winCol[winN * 3] = warm ? 1.0 : neonR * 0.75;
          winCol[winN * 3 + 1] = warm ? 0.82 : neonG * 0.9;
          winCol[winN * 3 + 2] = warm ? 0.42 : Math.max(neonB, 0.85);
          winN++;
        }
      }
    }

    buildings.instanceMatrix.needsUpdate = true;
    buildings.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(bCol, 3));
    strips.instanceMatrix.needsUpdate = true;
    strips.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(stripCol, 3));
    bands.count = bandN;
    bands.instanceMatrix.needsUpdate = true;
    bands.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(bandCol, 3));
    dots.count = dotN;
    dots.instanceMatrix.needsUpdate = true;
    dots.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(dotCol, 3));

    cityMeshGroup.add(buildings, strips, bands, dots);

    const winGeo = new THREE.BufferGeometry();
    winGeo.setAttribute("position", new THREE.Float32BufferAttribute(winPos.subarray(0, winN * 3), 3));
    winGeo.setAttribute("color", new THREE.Float32BufferAttribute(winCol.subarray(0, winN * 3), 3));
    const winMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      depthWrite: false,
    });
    winMat.toneMapped = false;
    cityMeshGroup.add(new THREE.Points(winGeo, winMat));
  }

  function buildStreetLights() {
    // Sparse neon poles along streets
    const poles = [];
    const half = (N - 1) / 2;
    for (let z = 2; z < N - 2; z += 4) {
      for (let x = 2; x < N - 2; x += 4) {
        if (solid[z][x] !== 0) continue;
        poles.push({ x, z });
      }
    }
    if (!poles.length) return;

    const pGeo = new THREE.BoxGeometry(0.08, 1.4, 0.08);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x203040 });
    const lamps = new THREE.InstancedMesh(pGeo, pMat, poles.length);
    const lGeo = new THREE.BoxGeometry(0.22, 0.08, 0.22);
    const lMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    lMat.toneMapped = false;
    const lampHeads = new THREE.InstancedMesh(lGeo, lMat, poles.length);
    const cols = new Float32Array(poles.length * 3);
    const identity = new THREE.Quaternion();

    for (let i = 0; i < poles.length; i++) {
      const wx = (poles[i].x - half) * CELL;
      const wz = (poles[i].z - half) * CELL;
      _v3.set(wx, 0.7, wz);
      _s3.set(1, 1, 1);
      _m4.compose(_v3, identity, _s3);
      lamps.setMatrixAt(i, _m4);
      _v3.set(wx, 1.45, wz);
      _m4.compose(_v3, identity, _s3);
      lampHeads.setMatrixAt(i, _m4);
      const c = i % 2 === 0 ? 0x00f0ff : 0xff2bd6;
      _c.setHex(c);
      cols[i * 3] = _c.r;
      cols[i * 3 + 1] = _c.g;
      cols[i * 3 + 2] = _c.b;
    }
    lamps.instanceMatrix.needsUpdate = true;
    lampHeads.instanceMatrix.needsUpdate = true;
    lampHeads.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(cols, 3));
    if (cityMeshGroup) cityMeshGroup.add(lamps, lampHeads);
    else scene.add(lamps, lampHeads);
  }

  function buildStars() {
    const n = 180;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 28 + Math.random() * 40;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 12 + Math.random() * 30;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x88bbff,
      size: 0.1,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })));
  }

  // ─── Snake meshes ─────────────────────────────────────────
  function makeSegmentMesh(isHead) {
    const mesh = new THREE.Mesh(segGeo, isHead ? headMat : bodyMat);
    mesh.add(new THREE.Mesh(glowGeo, glowMat));
    if (isHead) {
      const e1 = new THREE.Mesh(eyeGeo, eyeMat);
      e1.position.set(0.16, 0.08, 0.36);
      const e2 = new THREE.Mesh(eyeGeo, eyeMat);
      e2.position.set(-0.16, 0.08, 0.36);
      mesh.add(e1);
      mesh.add(e2);
    }
    mesh.userData.isHead = isHead;
    return mesh;
  }

  function buildSnakeMeshes(len) {
    if (snakeGroup) scene.remove(snakeGroup);
    snakeGroup = new THREE.Group();
    scene.add(snakeGroup);
    snakeBody = [];
    prevBody = [];
    const c = (N - 1) / 2 | 0;
    for (let i = 0; i < len; i++) {
      const gx = c - i;
      const gz = c;
      snakeBody.push({ x: gx, z: gz });
      prevBody.push({ x: gx, z: gz });
      const mesh = makeSegmentMesh(i === 0);
      const p = cellToWorld(gx, gz);
      mesh.position.set(p.x, 0.35, p.z);
      snakeGroup.add(mesh);
    }
    dir.x = 1;
    dir.z = 0;
    nextDir.x = 1;
    nextDir.z = 0;

    // Snap camera rails to start head so first frames don't swing in
    const p0 = cellToWorld(snakeBody[0].x, snakeBody[0].z);
    camHeadX = p0.x;
    camHeadZ = p0.z;
    camLookX = p0.x + CELL * 2;
    camLookZ = p0.z;
    faceX = 1;
    faceZ = 0;
    camera.position.set(p0.x - CELL * 2, 11.2, p0.z);
    camera.lookAt(camLookX, 0, camLookZ);
  }

  // Smooth visual position: lerp previous → current by tick progress
  function updateSnakeVisuals(alpha) {
    const n = snakeBody.length;
    while (snakeGroup.children.length < n) snakeGroup.add(makeSegmentMesh(false));
    while (snakeGroup.children.length > n) {
      snakeGroup.remove(snakeGroup.children[snakeGroup.children.length - 1]);
    }

    for (let i = 0; i < n; i++) {
      const mesh = snakeGroup.children[i];
      const cur = snakeBody[i];
      const prev = prevBody[i] || cur;
      const px = (prev.x + (cur.x - prev.x) * alpha - (N - 1) / 2) * CELL;
      const pz = (prev.z + (cur.z - prev.z) * alpha - (N - 1) / 2) * CELL;
      mesh.position.x = px;
      mesh.position.z = pz;
      mesh.position.y = 0.35 + Math.sin(clock.elapsedTime * 7 + i * 0.45) * 0.03;

      if (i === 0) {
        // Face movement direction (prev→cur if moving, else dir)
        let fx = cur.x - prev.x;
        let fz = cur.z - prev.z;
        if (fx === 0 && fz === 0) {
          fx = dir.x;
          fz = dir.z;
        }
        if (fx !== 0 || fz !== 0) {
          mesh.rotation.y = Math.atan2(fx, fz);
        }
      } else {
        mesh.rotation.y = 0;
      }
    }
  }

  function placeFood() {
    const head = snakeBody[0] || { x: (N - 1) / 2 | 0, z: (N - 1) / 2 | 0 };
    let gx = head.x;
    let gz = head.z;
    let bestDist = Infinity;
    // Sample open street cells, keep one that's a short ride away
    for (let tries = 0; tries < 50; tries++) {
      const cell = randomOpenCell();
      if (isSnake(cell.x, cell.z)) continue;
      const dist = Math.abs(cell.x - head.x) + Math.abs(cell.z - head.z);
      if (dist < 3) continue;
      if (dist < bestDist && dist <= 14) {
        gx = cell.x;
        gz = cell.z;
        bestDist = dist;
        if (dist <= 8) break;
      }
    }
    // Fallback
    if (bestDist === Infinity || isSnake(gx, gz)) {
      const cell = randomOpenCell();
      gx = cell.x;
      gz = cell.z;
    }
    food.x = gx;
    food.z = gz;
    const p = cellToWorld(gx, gz);
    foodMesh.position.set(p.x, FOOD_Y, p.z);
    foodMesh.visible = true;
    if (foodPad) {
      foodPad.position.set(p.x, 0.03, p.z);
      foodPad.visible = true;
    }
  }

  function isSnake(x, z) {
    for (let i = 0; i < snakeBody.length; i++) {
      if (snakeBody[i].x === x && snakeBody[i].z === z) return true;
    }
    return false;
  }

  function buildFoodMesh() {
    foodMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      new THREE.MeshBasicMaterial({ color: 0xff2bd6 })
    );
    foodMesh.material.toneMapped = false;
    const g = new THREE.MeshBasicMaterial({
      color: 0xff6ae0,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    g.toneMapped = false;
    foodMesh.add(new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 10), g));

    // Street-level pad so food clearly sits ON the road plane
    const padMat = new THREE.MeshBasicMaterial({
      color: 0xff2bd6,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    padMat.toneMapped = false;
    foodPad = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 24), padMat);
    foodPad.rotation.x = -Math.PI / 2;
    foodPad.position.y = 0.03;
    scene.add(foodPad);

    scene.add(foodMesh);
  }

  // ─── Particles ────────────────────────────────────────────
  function initParticlePool() {
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff2bd6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      mat.toneMapped = false;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      particlePool.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 });
    }
  }

  function spawnBurst(x, z) {
    for (let i = 0; i < 10 && particlePool.length; i++) {
      const p = particlePool.pop();
      p.mesh.visible = true;
      p.mesh.material.opacity = 1;
      p.mesh.position.set(x, 0.4, z);
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random() * 2.2;
      p.vx = Math.cos(a) * sp;
      p.vy = 1.8 + Math.random() * 2;
      p.vz = Math.sin(a) * sp;
      p.life = 0.5 + Math.random() * 0.25;
      p.maxLife = p.life;
      activeParticles.push(p);
    }
  }

  function updateParticles(dt) {
    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        p.mesh.material.opacity = 0;
        activeParticles.splice(i, 1);
        particlePool.push(p);
        continue;
      }
      p.vy -= 7 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity = p.life / p.maxLife;
    }
  }

  // ─── Game ─────────────────────────────────────────────────
  function resetGame() {
    score = 0;
    level = 1;
    foodEaten = 0;
    tickMs = diff().baseTick;
    acc = 0;
    shakeT = 0;
    buildCityMap();
    rebuildCityVisuals();
    buildSnakeMeshes(INITIAL_LENGTH);
    placeFood();
    updateHUD();
  }

  function startGame() {
    resetGame();
    state = "playing";
    hideAllOverlays();
    setStatus("LIVE");
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    overlayPause.classList.add("show");
    setStatus("PAUSED");
  }

  function resumeGame() {
    if (state !== "paused") return;
    state = "playing";
    overlayPause.classList.remove("show");
    setStatus("LIVE");
  }

  function togglePause() {
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
  }

  function gameOver() {
    state = "over";
    shakeT = 0.5;
    flash("die");
    if (score > highScore) {
      highScore = score;
      saveHigh(highScore);
      highEl.textContent = highScore;
      newBestEl.classList.remove("hidden");
    } else {
      newBestEl.classList.add("hidden");
    }
    finalScore.textContent = score;
    finalBest.textContent = highScore;
    finalLevel.textContent = level;
    setDifficulty(difficultyKey);
    setTimeout(() => overlayOver.classList.add("show"), 320);
    setStatus("OFFLINE");
  }

  function step() {
    dir.x = nextDir.x;
    dir.z = nextDir.z;

    const head = snakeBody[0];
    const nx = head.x + dir.x;
    const nz = head.z + dir.z;

    if (!isOpen(nx, nz)) {
      gameOver();
      return;
    }

    const willEat = nx === food.x && nz === food.z;
    const check = snakeBody.length - (willEat ? 0 : 1);
    for (let i = 0; i < check; i++) {
      if (snakeBody[i].x === nx && snakeBody[i].z === nz) {
        gameOver();
        return;
      }
    }

    // Snapshot only when the step actually commits
    prevBody = snakeBody.map((s) => ({ x: s.x, z: s.z }));
    snakeBody.unshift({ x: nx, z: nz });

    if (willEat) {
      foodEaten++;
      score += Math.round(10 * level * diff().scoreMul);
      flash("eat");
      bumpEl(scoreEl);
      const p = cellToWorld(food.x, food.z);
      spawnBurst(p.x, p.z);
      placeFood();
      if (foodEaten % FOOD_PER_LEVEL === 0) {
        level++;
        tickMs = Math.max(diff().minTick, diff().baseTick - (level - 1) * diff().speedStep);
      }
    } else {
      snakeBody.pop();
    }

    updateHUD();
  }

  function setDir(dx, dz) {
    if (dir.x === -dx && dir.z === -dz) return;
    if (nextDir.x === -dx && nextDir.z === -dz) return;
    nextDir.x = dx;
    nextDir.z = dz;
  }

  function updateHUD() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    lengthEl.textContent = snakeBody.length;
    speedEl.textContent = (diff().baseTick / tickMs).toFixed(1) + "x";
  }

  function setStatus(t) { statusEl.textContent = t; }

  function flash(cls) {
    flashEl.classList.remove("eat", "die");
    void flashEl.offsetWidth;
    flashEl.classList.add(cls);
    setTimeout(() => flashEl.classList.remove(cls), 160);
  }

  function bumpEl(el) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function hideAllOverlays() {
    overlayStart.classList.remove("show");
    overlayPause.classList.remove("show");
    overlayOver.classList.remove("show");
  }

  function setDifficulty(key) {
    if (!DIFFICULTIES[key]) return;
    difficultyKey = key;
    document.querySelectorAll(".diff-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-diff") === key);
    });
    const hint = document.getElementById("diff-hint");
    if (hint) hint.textContent = DIFFICULTIES[key].hint;
  }

  function showStartScreen() {
    state = "start";
    hideAllOverlays();
    overlayStart.classList.add("show");
    setStatus("STANDBY");
    setDifficulty(difficultyKey);
    buildCityMap();
    rebuildCityVisuals();
    buildSnakeMeshes(INITIAL_LENGTH);
    placeFood();
  }

  function loadHigh() {
    try { return parseInt(localStorage.getItem("cyber-snake-high") || "0", 10) || 0; }
    catch { return 0; }
  }

  function saveHigh(v) {
    try { localStorage.setItem("cyber-snake-high", String(v)); } catch { /* ignore */ }
  }

  // ─── Camera: stable elevated follow (no tick snap / no turn whip) ──
  function smoothTo(cur, target, dt, rate) {
    // exponential damp — frame-rate independent
    return cur + (target - cur) * (1 - Math.exp(-rate * dt));
  }

  function updateCamera(dt, t) {
    // Interpolated head world position (same basis as snake visuals)
    const head = snakeBody[0] || { x: (N - 1) / 2, z: (N - 1) / 2 };
    const prev = prevBody[0] || head;
    // alpha is recomputed here so camera always matches visuals
    let alpha = 1;
    if (state === "playing") {
      alpha = Math.min(1, Math.max(0, acc / tickMs));
    }
    const hx = (prev.x + (head.x - prev.x) * alpha - (N - 1) / 2) * CELL;
    const hz = (prev.z + (head.z - prev.z) * alpha - (N - 1) / 2) * CELL;

    // Smooth facing so 90° turns don't fling the camera to the other side
    faceX = smoothTo(faceX, dir.x, dt, 5);
    faceZ = smoothTo(faceZ, dir.z, dt, 5);
    const fl = Math.hypot(faceX, faceZ) || 1;
    const fx = faceX / fl;
    const fz = faceZ / fl;

    // Track interpolated head
    camHeadX = smoothTo(camHeadX, hx, dt, 8);
    camHeadZ = smoothTo(camHeadZ, hz, dt, 8);

    // Desired pose: slightly behind, fixed height, no idle breathe
    const back = CELL * 1.8;
    const desiredX = camHeadX - fx * back;
    const desiredZ = camHeadZ - fz * back;
    const desiredY = 11.0;

    camera.position.x = smoothTo(camera.position.x, desiredX, dt, 3.5);
    camera.position.y = smoothTo(camera.position.y, desiredY, dt, 3.5);
    camera.position.z = smoothTo(camera.position.z, desiredZ, dt, 3.5);

    if (shakeT > 0) {
      shakeT -= dt;
      const s = shakeT * 0.3;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s * 0.35;
    }

    // Look-at also smoothed — never snaps with the grid tick
    const lookAhead = CELL * 2.0;
    camLookX = smoothTo(camLookX, camHeadX + fx * lookAhead, dt, 6);
    camLookZ = smoothTo(camLookZ, camHeadZ + fz * lookAhead, dt, 6);
    camera.lookAt(camLookX, 0.0, camLookZ);
  }

  // ─── Input (relative to current facing — works with follow cam) ──
  // Follow-cam looks along dir. With Y-up, screen-right is +Z when looking +X,
  // so clockwise (right turn) on XZ is (x,z) -> (-z, x).
  function turnLeft() {
    setDir(dir.z, -dir.x);
  }

  function turnRight() {
    setDir(-dir.z, dir.x);
  }

  function goForward() {
    // already moving this way; allow re-assert after a queued turn
    setDir(dir.x, dir.z);
  }

  function goBackward() {
    setDir(-dir.x, -dir.z);
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") {
      e.preventDefault();
      if (state === "playing") goForward();
    } else if (k === "arrowdown" || k === "s") {
      e.preventDefault();
      if (state === "playing") goBackward();
    } else if (k === "arrowleft" || k === "a") {
      e.preventDefault();
      if (state === "playing") turnLeft();
    } else if (k === "arrowright" || k === "d") {
      e.preventDefault();
      if (state === "playing") turnRight();
    } else if (k === " " || k === "spacebar") {
      e.preventDefault();
      if (state === "playing" || state === "paused") togglePause();
      else if (state === "start") startGame();
      else if (state === "over") startGame();
    } else if (k === "enter") {
      e.preventDefault();
      if (state === "start") startGame();
      else if (state === "paused") resumeGame();
      else if (state === "over") startGame();
    } else if (k === "r") {
      e.preventDefault();
      if (state === "playing" || state === "paused" || state === "over" || state === "start") {
        startGame();
      }
    }
  }

  function onTouchStart(e) {
    if (!e.touches.length) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function onTouchEnd(e) {
    if (!touchStart || !e.changedTouches.length) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (state !== "playing") {
      if (state === "start" || state === "over") startGame();
      return;
    }
    // Swipe relative to current facing (same feel as A/D)
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) turnRight();
      else turnLeft();
    } else {
      if (dy < 0) goForward();
      else goBackward();
    }
  }

  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  btnStart.addEventListener("click", startGame);
  btnResume.addEventListener("click", resumeGame);
  // Game Over → one-click restart with selected difficulty
  btnRestart.addEventListener("click", startGame);

  // Difficulty pickers (start screen + game over) share one state
  document.querySelectorAll(".diff-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      const btn = e.target.closest(".diff-btn");
      if (!btn) return;
      setDifficulty(btn.getAttribute("data-diff"));
      if (state === "start") {
        buildCityMap();
        rebuildCityVisuals();
      }
    });
  });
  setDifficulty(difficultyKey);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  // ─── Animate ──────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (foodMesh && foodMesh.visible) {
      foodMesh.rotation.y += dt * 1.4;
      foodMesh.rotation.x += dt * 0.6;
      // Stay on the street plane — small bob only
      foodMesh.position.y = FOOD_Y + Math.sin(t * 2.8) * 0.04;
      const s = 1 + Math.sin(t * 3.5) * 0.05;
      foodMesh.scale.set(s, s, s);
    }
    if (foodPad && foodPad.visible) {
      const ps = 1 + Math.sin(t * 3.5) * 0.08;
      foodPad.scale.set(ps, ps, 1);
      foodPad.material.opacity = 0.3 + Math.sin(t * 3.5) * 0.12;
    }

    updateParticles(dt);

    let alpha = 1;
    if (state === "playing") {
      acc += dt * 1000;
      if (acc >= tickMs) {
        acc -= tickMs;
        step();
        alpha = acc / tickMs;
      } else {
        alpha = acc / tickMs;
      }
    } else {
      alpha = 1;
    }

    updateSnakeVisuals(alpha);
    updateCamera(dt, t);

    renderer.render(scene, camera);
  }

  // ─── Boot ─────────────────────────────────────────────────
  if (typeof THREE === "undefined") {
    document.body.innerHTML =
      '<div style="color:#00f0ff;font-family:monospace;padding:40px;text-align:center">Three.js failed to load.</div>';
    return;
  }

  initThree();
  updateHUD();
  setStatus("STANDBY");
  // Lightweight probe for local QA (harmless in play)
  window.__camProbe = function () {
    return {
      p: camera.position.toArray(),
      look: [camLookX, 0, camLookZ],
      head: [camHeadX, camHeadZ],
      face: [faceX, faceZ],
      dir: [dir.x, dir.z],
      next: [nextDir.x, nextDir.z],
      state,
    };
  };
  window.__turnL = turnLeft;
  window.__turnR = turnRight;
  animate();
})();
