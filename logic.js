// ══════════════════════════════════════════════════
// OPEN SOURCE SOCIETY — Psychedelic VR logic.js
// Libraries: A-Frame 1.5 + THREE.js (bundled)
// ══════════════════════════════════════════════════

// ── SHARED EFFECT STATE ──────────────────────────
// All components read from here to react to the active effect.
window.OSS = { effect: null, intensity: 0, age: 0 };

// ── EFFECT CONTROLLER ────────────────────────────
// Shuffles 7 fear/disorientation effects, runs each ~2 min,
// then gives the user a false sense of safety before the next one.
AFRAME.registerComponent('effect-controller', {
  init: function () {
    this._effects = this._shuffle([
      'height-drop',   // floor drops away — acrophobia
      'horizon-loss',  // extreme camera roll — vestibular chaos
      'flow-surge',    // aggressive forward/back rush — optical flow mismatch
      'looming',       // objects accelerate directly at camera — startle reflex
      'strobe',        // blackout + white flash — contrast shock
      'scale-shift',   // world scales up/down — spatial confusion
      'vortex',        // entire world spins — full disorientation
    ]);
    this._idx       = 0;
    this._startT    = 0;
    this._dur       = 0;
    this._state     = 'warmup'; // warmup → idle → running → rampout
    this._nextT     = 28000;    // first effect after 28 s warmup
    this.RAMP_IN    = 6000;
    this.RAMP_OUT   = 4000;
  },

  _shuffle: function (a) {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  },

  tick: function (t) {
    const oss = window.OSS;

    if (this._state === 'warmup' || this._state === 'idle') {
      oss.effect = null; oss.intensity = 0; oss.age = 0;
      if (t >= this._nextT) this._start(t);
      return;
    }

    const elapsed = t - this._startT;
    oss.age = elapsed;

    if (this._state === 'running') {
      oss.intensity = Math.min(elapsed / this.RAMP_IN, 1);
      if (elapsed >= this._dur - this.RAMP_OUT) this._state = 'rampout';

    } else if (this._state === 'rampout') {
      const ro = elapsed - (this._dur - this.RAMP_OUT);
      oss.intensity = Math.max(1 - ro / this.RAMP_OUT, 0);
      if (ro >= this.RAMP_OUT) {
        oss.effect = null; oss.intensity = 0;
        this._state = 'idle';
        // Gap: 10-20 s — user thinks it's over
        this._nextT = t + 10000 + Math.random() * 10000;
      }
    }
  },

  _start: function (t) {
    const effect = this._effects[this._idx % this._effects.length];
    this._idx++;
    if (this._idx >= this._effects.length) {
      this._effects = this._shuffle(this._effects);
      this._idx = 0;
    }
    window.OSS.effect    = effect;
    window.OSS.intensity = 0;
    window.OSS.age       = 0;
    this._startT = t;
    this._dur    = 100000 + Math.random() * 40000; // 100-140 s
    this._state  = 'running';
    console.log(`[OSS] effect="${effect}" dur=${Math.round(this._dur/1000)}s`);
  }
});

// ── SKY COLOR CYCLE — deep space palette ─────────
AFRAME.registerComponent('color-cycle-sky', {
  init: function () {
    this._color = new THREE.Color();
    this._mat = null;
  },
  tick: function (t) {
    if (!this._mat) {
      const c = this.el.components.material;
      if (c && c.material) this._mat = c.material;
      else return;
    }
    // Very dark: cycles through deep violet→blue→teal washes
    this._mat.color.setHSL((t * 0.000006) % 1, 0.7, 0.025);
  }
});

// ── CAMERA SWAY & ROLL ───────────────────────────
// Base: irrational-frequency sines. Each effect amplifies different axes.
AFRAME.registerComponent('camera-sway', {
  init: function () {
    this.φ  = 1.6180339887;
    this.r2 = 1.4142135624;
    this.r3 = 1.7320508076;
    this.r5 = 2.2360679775;
  },
  tick: function (t) {
    const s = t * 0.001;
    const { φ, r2, r3, r5 } = this;
    const oss = window.OSS;
    const fx  = oss.effect;
    const i   = oss.intensity;

    // Base sway (always on)
    const xB    = Math.sin(s*0.61)*0.48 + Math.sin(s*0.61*φ)*0.30 + Math.sin(s*0.61*r2)*0.18 + Math.sin(s*0.61*r3)*0.11;
    const yB    = Math.sin(s*0.44)*0.35 + Math.sin(s*0.44*φ)*0.20 + Math.sin(s*0.44*r5)*0.12;
    const zB    = Math.sin(s*0.27)*0.65 + Math.sin(s*0.27*r3)*0.38 + Math.sin(s*0.27*φ)*0.20;
    const rollB = Math.sin(s*0.37)*0.14 + Math.sin(s*0.37*φ)*0.09 + Math.sin(s*0.37*r2)*0.05;

    let x = xB, y = yB, z = zB, roll = rollB;

    if (fx === 'horizon-loss') {
      // Horizon tilts up to ±45 degrees — vestibular system panics
      roll = rollB + Math.sin(s*0.52)*i*0.65 + Math.sin(s*0.52*φ)*i*0.38;
    } else if (fx === 'flow-surge') {
      // Aggressive Z rush — feel like falling forward/backward through space
      z = zB + Math.sin(s*0.85)*i*3.2 + Math.sin(s*0.85*φ)*i*1.8;
    } else if (fx === 'height-drop') {
      // Slow sink + amplified lateral sway — vertigo of falling
      y = yB - i*1.8 + Math.sin(s*0.28)*i*0.5;
      x = xB * (1 + i*0.9);
    } else if (fx === 'looming') {
      // Slight forward lean — instinctive duck
      z = zB - i*0.9;
    } else if (fx === 'vortex') {
      // Tilt as the world spins around you
      roll = rollB + Math.sin(s*0.15)*i*0.2;
    }

    this.el.object3D.position.set(x, y, z);
    this.el.object3D.rotation.z = roll;
  }
});

// ── WARP STARS ───────────────────────────────────
// Three.js Points rushing toward camera
AFRAME.registerComponent('warp-stars', {
  init: function () {
    const COUNT = 2500;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    this.speeds = new Float32Array(COUNT);
    const c = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 140;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = -(Math.random() * 220 + 20);
      this.speeds[i] = Math.random() * 0.18 + 0.06;
      c.setHSL(Math.random(), 1, 0.8);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    this.pos = pos; this.geo = geo; this.COUNT = COUNT;

    const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, sizeAttenuation: true });
    this.el.object3D.add(new THREE.Points(geo, mat));
  },
  tick: function (t, dt) {
    for (let i = 0; i < this.COUNT; i++) {
      this.pos[i * 3 + 2] += this.speeds[i] * dt * 0.12;
      if (this.pos[i * 3 + 2] > 3) {
        this.pos[i * 3]     = (Math.random() - 0.5) * 140;
        this.pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
        this.pos[i * 3 + 2] = -220;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
});

// ── PSYCHEDELIC TUNNEL ───────────────────────────
// Each ring has an irrational-frequency sine driving its speed,
// so direction naturally reverses at different times per ring.
AFRAME.registerComponent('psychedelic-tunnel', {
  init: function () {
    this.rings = [];
    const NUM = 30, SPACING = 5;
    this.totalLen = NUM * SPACING;
    // Irrational multipliers — rings never sync their reversals
    const φFactors = [1, 1.6180339887, 1.4142135624, 1.7320508076, 2.2360679775];

    for (let i = 0; i < NUM; i++) {
      const geo = new THREE.TorusGeometry(4.8, 0.06, 16, 90);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      const z = -i * SPACING;
      mesh.position.set(0, 1.6, z);
      mesh.rotation.x = (Math.random() - 0.5) * 0.6;
      mesh.rotation.y = (Math.random() - 0.5) * 0.6;
      this.el.object3D.add(mesh);
      this.rings.push({
        mesh, mat,
        pos: z,
        hueOff: (i / NUM),
        rotX: (Math.random() - 0.5) * 0.014,
        rotZ: (Math.random() - 0.5) * 0.018,
        baseSpeed: 4 + Math.random() * 5,          // units/sec
        φf: φFactors[i % φFactors.length],          // unique reversal frequency
        phase: Math.random() * Math.PI * 2
      });
    }
  },
  tick: function (t, dt) {
    const dt_s = dt * 0.001;
    const c = new THREE.Color();
    this.rings.forEach((r, i) => {
      // sine drives direction: positive = toward camera, negative = away
      const dir = Math.sin(t * 0.0008 * r.φf + r.phase);
      r.pos += dir * r.baseSpeed * dt_s;
      // wrap seamlessly in both directions
      if (r.pos >  6)              r.pos -= this.totalLen;
      if (r.pos < -this.totalLen)  r.pos += this.totalLen;
      r.mesh.position.z = r.pos;
      r.mesh.rotation.z += r.rotZ;
      r.mesh.rotation.x += r.rotX;
      c.setHSL(((r.hueOff + t * 0.00008) % 1), 1, 0.62);
      r.mat.color.copy(c);
      r.mesh.scale.setScalar(1 + Math.sin(t * 0.0022 + i * 0.9) * 0.18);
    });
  }
});

// ── SECOND TUNNEL (inner) ────────────────────────
AFRAME.registerComponent('inner-tunnel', {
  init: function () {
    this.rings = [];
    const NUM = 20, SPACING = 6;
    this.totalLen = NUM * SPACING;
    const φFactors = [1.6180339887, 1.4142135624, 2.2360679775, 1.7320508076, 1];

    for (let i = 0; i < NUM; i++) {
      const geo = new THREE.TorusGeometry(2.5, 0.05, 12, 60);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      const z = -i * SPACING - 2.5;
      mesh.position.set(0, 1.6, z);
      this.el.object3D.add(mesh);
      this.rings.push({
        mesh, mat,
        pos: z,
        hueOff: (i / NUM) + 0.5,
        baseSpeed: 3 + Math.random() * 4,
        φf: φFactors[i % φFactors.length],
        phase: Math.random() * Math.PI * 2
      });
    }
  },
  tick: function (t, dt) {
    const dt_s = dt * 0.001;
    const c = new THREE.Color();
    this.rings.forEach((r, i) => {
      const dir = Math.sin(t * 0.0006 * r.φf + r.phase);
      r.pos += dir * r.baseSpeed * dt_s;
      if (r.pos >  6)             r.pos -= this.totalLen;
      if (r.pos < -this.totalLen) r.pos += this.totalLen;
      r.mesh.position.z = r.pos;
      r.mesh.rotation.z = t * 0.0012 + i * 0.4;
      c.setHSL(((r.hueOff + t * 0.00006) % 1), 1, 0.7);
      r.mat.color.copy(c);
    });
  }
});

// ── OSS GLOW TEXT ─────────────────────────────────
// Layered A-Frame text entities create a bloom glow
AFRAME.registerComponent('oss-glow-text', {
  init: function () {
    const MSG = 'OPEN SOURCE SOCIETY';
    this.layers = [];
    // Each layer: larger + more transparent = fake bloom
    const defs = [
      { scale: 1.0,  opacity: 1.0,  z: 0,     width: 8 },
      { scale: 1.07, opacity: 0.55, z: -0.01, width: 8.5 },
      { scale: 1.15, opacity: 0.35, z: -0.02, width: 9 },
      { scale: 1.3,  opacity: 0.2,  z: -0.04, width: 10 },
      { scale: 1.6,  opacity: 0.1,  z: -0.06, width: 12 },
      { scale: 2.2,  opacity: 0.05, z: -0.09, width: 16 },
    ];
    defs.forEach(d => {
      const el = document.createElement('a-text');
      el.setAttribute('value', MSG);
      el.setAttribute('align', 'center');
      el.setAttribute('width', d.width);
      el.setAttribute('position', `0 0 ${d.z}`);
      el.setAttribute('scale', `${d.scale} ${d.scale} 1`);
      el.setAttribute('opacity', d.opacity);
      el.setAttribute('side', 'double');
      this.el.appendChild(el);
      this.layers.push({ el, hueShift: defs.indexOf(d) * 0.08 });
    });
    this.initY = this.el.object3D.position.y;
    this.initX = this.el.object3D.position.x;
  },
  tick: function (t) {
    // Bob, sway, and gently face the camera
    this.el.object3D.position.y = this.initY + Math.sin(t * 0.0014) * 0.5;
    this.el.object3D.position.x = this.initX + Math.sin(t * 0.0008) * 0.3;
    this.el.object3D.rotation.y = Math.sin(t * 0.0005) * 0.3;
    // Scale pulse
    const ps = 1 + Math.sin(t * 0.0018) * 0.08;
    this.el.object3D.scale.setScalar(ps);

    const c = new THREE.Color();
    const baseH = (t * 0.00009) % 1;
    this.layers.forEach((layer, i) => {
      c.setHSL((baseH + layer.hueShift) % 1, 1, 0.65);
      layer.el.setAttribute('color', '#' + c.getHexString());
    });
  }
});

// ── CHAOS CLUSTER ────────────────────────────────
// Orbiting + self-spinning geometric shapes
AFRAME.registerComponent('chaos-cluster', {
  init: function () {
    this.objects = [];
    const geoFactories = [
      () => new THREE.TorusKnotGeometry(0.5, 0.07, 80, 12, 2, 3),
      () => new THREE.TorusKnotGeometry(0.6, 0.08, 80, 12, 3, 5),
      () => new THREE.OctahedronGeometry(0.5),
      () => new THREE.IcosahedronGeometry(0.38),
      () => new THREE.DodecahedronGeometry(0.42),
      () => new THREE.TorusGeometry(0.55, 0.1, 12, 40),
      () => new THREE.TetrahedronGeometry(0.52),
      () => new THREE.TorusKnotGeometry(0.45, 0.06, 60, 10, 4, 7),
    ];

    geoFactories.forEach((fn, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0x440044,
        metalness: 0.7,
        roughness: 0.25
      });
      const mesh = new THREE.Mesh(fn(), mat);
      const angle = (i / geoFactories.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 2.2, 0, Math.sin(angle) * 2.2);
      this.el.object3D.add(mesh);
      this.objects.push({
        mesh, mat, angle,
        hueOff: i / geoFactories.length,
        orbitSpeed: 0.0004 + Math.random() * 0.0004,
        spin: { x: Math.random() * 0.03, y: Math.random() * 0.04, z: Math.random() * 0.025 }
      });
    });

    // Central mega knot
    const cGeo = new THREE.TorusKnotGeometry(1.1, 0.13, 150, 18, 5, 7);
    this.cMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff, emissive: 0x004444, metalness: 0.9, roughness: 0.1
    });
    this.center = new THREE.Mesh(cGeo, this.cMat);
    this.el.object3D.add(this.center);
  },
  tick: function (t) {
    const c = new THREE.Color();
    this.objects.forEach((obj, i) => {
      const a = obj.angle + t * obj.orbitSpeed;
      const r = 2.2 + Math.sin(t * 0.001 + i) * 0.55;
      obj.mesh.position.set(
        Math.cos(a) * r,
        Math.sin(t * 0.0009 + i * 1.3) * 1.1,
        Math.sin(a) * r
      );
      obj.mesh.rotation.x += obj.spin.x;
      obj.mesh.rotation.y += obj.spin.y;
      obj.mesh.rotation.z += obj.spin.z;
      const h = (obj.hueOff + t * 0.00005) % 1;
      c.setHSL(h, 1, 0.5);
      obj.mat.color.copy(c);
      obj.mat.emissive.setHSL(h, 1, 0.18);
      obj.mesh.scale.setScalar(1 + Math.sin(t * 0.0022 + i * 0.8) * 0.28);
    });

    this.center.rotation.x += 0.008;
    this.center.rotation.y += 0.012;
    this.center.rotation.z += 0.006;
    const ch = (t * 0.00003) % 1;
    c.setHSL(ch, 1, 0.55);
    this.cMat.color.copy(c);
    this.cMat.emissive.setHSL(ch, 1, 0.22);
    this.center.scale.setScalar(1 + Math.sin(t * 0.0016) * 0.35);
  }
});

// ── MANDALA ──────────────────────────────────────
AFRAME.registerComponent('mandala', {
  init: function () {
    this.inner = []; this.outer = [];

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0080, emissive: 0x330020, metalness: 0.6, roughness: 0.3 });
      const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.045, 60, 10), mat);
      const a = (i / 8) * Math.PI * 2;
      mesh.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
      this.el.object3D.add(mesh);
      this.inner.push({ mesh, mat, angle: a, hueOff: i / 8 });
    }

    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x00ff80, emissive: 0x003320, metalness: 0.5, roughness: 0.4 });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mat);
      const a = (i / 16) * Math.PI * 2;
      mesh.position.set(Math.cos(a) * 4.5, 0, Math.sin(a) * 4.5);
      this.el.object3D.add(mesh);
      this.outer.push({ mesh, mat, angle: a, hueOff: i / 16 });
    }
  },
  tick: function (t) {
    const c = new THREE.Color();
    this.inner.forEach((obj, i) => {
      const a = obj.angle + t * 0.00042;
      obj.mesh.position.set(Math.cos(a) * 2.2, Math.sin(t * 0.0012 + i) * 0.7, Math.sin(a) * 2.2);
      obj.mesh.rotation.x += 0.026; obj.mesh.rotation.z += 0.019;
      c.setHSL((obj.hueOff + t * 0.00006) % 1, 1, 0.6);
      obj.mat.color.copy(c); obj.mat.emissive.setHSL((obj.hueOff + t * 0.00006) % 1, 1, 0.2);
    });
    this.outer.forEach((obj, i) => {
      const a = obj.angle - t * 0.00028;
      obj.mesh.position.set(Math.cos(a) * 4.5, Math.sin(t * 0.0009 + i * 0.5) * 0.35, Math.sin(a) * 4.5);
      obj.mesh.rotation.y += 0.04; obj.mesh.rotation.z += 0.03;
      c.setHSL((obj.hueOff + t * 0.00004) % 1, 1, 0.7);
      obj.mat.color.copy(c); obj.mat.emissive.setHSL((obj.hueOff + t * 0.00004) % 1, 1, 0.25);
    });
    this.el.object3D.rotation.y += 0.0025;
  }
});

// ── SCROLLING FLOOR GRID ─────────────────────────
AFRAME.registerComponent('floor-grid', {
  init: function () {
    this.CELL = 2;
    this.grid = new THREE.GridHelper(200, 100, 0xff00ff, 0x00ffff);
    this.el.object3D.add(this.grid);
    this.el.object3D.position.set(0, 0, -50);
  },
  tick: function (t) {
    this.grid.position.z = (t * 0.0045) % this.CELL;
    const mats = this.grid.material;
    const h1 = (t * 0.000032) % 1;
    if (Array.isArray(mats)) {
      mats[0].color.setHSL(h1, 1, 0.65);
      mats[1].color.setHSL((h1 + 0.5) % 1, 1, 0.55);
    }
  }
});

// ── CYCLING POINT LIGHTS ─────────────────────────
AFRAME.registerComponent('cycling-lights', {
  init: function () {
    this.lights = [];
    const pos = [[6, 4, -4], [-6, 4, -4], [0, 6, -10], [5, 2, -14], [-5, 2, -14], [0, 3, -7]];
    pos.forEach((p, i) => {
      const light = new THREE.PointLight(0xff00ff, 3, 18);
      light.position.set(...p);
      this.el.object3D.add(light);
      this.lights.push({ light, hueOff: i / pos.length });
    });
  },
  tick: function (t) {
    const c = new THREE.Color();
    this.lights.forEach(l => {
      c.setHSL(((l.hueOff + t * 0.0001) % 1), 1, 0.6);
      l.light.color.copy(c);
      l.light.intensity = 2.5 + Math.sin(t * 0.0032 + l.hueOff * Math.PI * 2) * 1.5;
    });
  }
});

// ── FRACTAL SPHERE SWARM ─────────────────────────
// Hundreds of small spheres forming a morphing cloud
AFRAME.registerComponent('sphere-swarm', {
  init: function () {
    this.meshes = [];
    const GEO = new THREE.SphereGeometry(0.08, 6, 6);
    const N = 120;
    for (let i = 0; i < N; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(GEO, mat);
      this.el.object3D.add(mesh);
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      this.meshes.push({
        mesh, mat,
        phi0: phi, theta0: theta,
        r: Math.random() * 2.5 + 1.5,
        speed: Math.random() * 0.0006 + 0.0002,
        hueOff: Math.random()
      });
    }
  },
  tick: function (t) {
    const c = new THREE.Color();
    this.meshes.forEach(obj => {
      const phi   = obj.phi0   + Math.sin(t * obj.speed * 0.7) * 0.5;
      const theta = obj.theta0 + t * obj.speed;
      const r     = obj.r + Math.sin(t * obj.speed * 1.3 + obj.phi0) * 0.8;
      obj.mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      c.setHSL((obj.hueOff + t * 0.00004) % 1, 1, 0.7);
      obj.mat.color.copy(c);
    });
  }
});

// ── PSYCHEDELIC DUST ─────────────────────────────
// Additive-blended colored points drifting in all directions
AFRAME.registerComponent('psychedelic-dust', {
  init: function () {
    const COUNT = 800;
    const pos   = new Float32Array(COUNT * 3);
    const col   = new Float32Array(COUNT * 3);
    const vel   = new Float32Array(COUNT * 3);
    const ages  = new Float32Array(COUNT);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random()-0.5)*35;
      pos[i*3+1] = (Math.random()-0.5)*20;
      pos[i*3+2] = (Math.random()-0.5)*35;
      vel[i*3]   = (Math.random()-0.5)*0.4;
      vel[i*3+1] = (Math.random()-0.5)*0.5;
      vel[i*3+2] = (Math.random()-0.5)*0.4;
      ages[i]    = Math.random() * 9;
      c.setHSL(Math.random(), 1, 0.7);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    this.pos=pos; this.vel=vel; this.ages=ages; this.geo=geo; this.COUNT=COUNT;
    const mat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.el.object3D.add(new THREE.Points(geo, mat));
  },
  tick: function (t, dt) {
    const dt_s = dt * 0.001;
    for (let i = 0; i < this.COUNT; i++) {
      this.pos[i*3]   += this.vel[i*3]   * dt_s;
      this.pos[i*3+1] += this.vel[i*3+1] * dt_s;
      this.pos[i*3+2] += this.vel[i*3+2] * dt_s;
      this.ages[i] += dt_s;
      if (this.ages[i] > 9) {
        this.pos[i*3]   = (Math.random()-0.5)*35;
        this.pos[i*3+1] = (Math.random()-0.5)*20;
        this.pos[i*3+2] = (Math.random()-0.5)*35;
        this.ages[i] = 0;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
});

// ── RISING SPARKS ────────────────────────────────
// Sparks that shoot upward and reset, additive blend
AFRAME.registerComponent('rising-sparks', {
  init: function () {
    const COUNT = 400;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const spd = new Float32Array(COUNT);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random()-0.5)*12;
      pos[i*3+1] = Math.random()*8;
      pos[i*3+2] = (Math.random()-0.5)*12;
      spd[i]     = Math.random()*2+0.5;
      c.setHSL(Math.random(), 1, 0.75);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    this.pos=pos; this.spd=spd; this.geo=geo; this.COUNT=COUNT;
    const mat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.el.object3D.add(new THREE.Points(geo, mat));
  },
  tick: function (t, dt) {
    const dt_s = dt * 0.001;
    for (let i = 0; i < this.COUNT; i++) {
      this.pos[i*3+1] += this.spd[i] * dt_s;
      if (this.pos[i*3+1] > 8) {
        this.pos[i*3]   = (Math.random()-0.5)*12;
        this.pos[i*3+1] = 0;
        this.pos[i*3+2] = (Math.random()-0.5)*12;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
});

// ── ACID RIBBONS ─────────────────────────────────
// Morphing tubes tracing Lissajous-like curves
AFRAME.registerComponent('acid-ribbons', {
  init: function () {
    this.tubes = [];
    const ribbonDefs = [
      { a: 3, b: 2, d: Math.PI / 4, r: 3.5, hOff: 0 },
      { a: 5, b: 4, d: Math.PI / 6, r: 4,   hOff: 0.33 },
      { a: 2, b: 3, d: Math.PI / 3, r: 3,   hOff: 0.66 },
    ];

    ribbonDefs.forEach(def => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
      // Build initial curve + tube
      const curve = this._makeCurve(def, 0);
      const geo   = new THREE.TubeGeometry(curve, 80, 0.04, 8, true);
      const mesh  = new THREE.Mesh(geo, mat);
      this.el.object3D.add(mesh);
      this.tubes.push({ mesh, mat, geo, def, lastRebuild: 0 });
    });
  },

  _makeCurve: function (def, t) {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const angle = (i / 120) * Math.PI * 2;
      const phase = t * 0.0008;
      pts.push(new THREE.Vector3(
        def.r * Math.sin(def.a * angle + phase + def.d),
        def.r * Math.sin(def.b * angle + phase) * 0.6,
        def.r * Math.cos(def.a * angle + phase * 0.7) * 0.8
      ));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  },

  tick: function (t) {
    const c = new THREE.Color();
    this.tubes.forEach((tube, i) => {
      // Rebuild geometry every ~200ms to morph the curve
      if (t - tube.lastRebuild > 200) {
        tube.geo.dispose();
        const curve = this._makeCurve(tube.def, t);
        tube.geo = new THREE.TubeGeometry(curve, 80, 0.04, 8, true);
        tube.mesh.geometry = tube.geo;
        tube.lastRebuild = t;
      }
      c.setHSL((tube.def.hOff + t * 0.00005) % 1, 1, 0.65);
      tube.mat.color.copy(c);
    });
  }
});

// ── STATIC STARFIELD ─────────────────────────────
// Fixed background star dome — distinct from warp-stars.
// Realistic color distribution: blue-white giants, yellow dwarfs, white.
AFRAME.registerComponent('static-starfield', {
  init: function () {
    const COUNT = 5000;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const c = new THREE.Color();
    const R = 380;

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = R * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = R * Math.cos(phi);
      pos[i*3+2] = R * Math.sin(phi) * Math.sin(theta);

      // Realistic star color distribution
      const roll = Math.random();
      if      (roll < 0.55) c.setHSL(0.60, 0.25, 0.92); // blue-white
      else if (roll < 0.75) c.setHSL(0.13, 0.55, 0.92); // yellow-white
      else if (roll < 0.88) c.setHSL(0.05, 0.80, 0.85); // orange giant
      else                  c.set(1, 1, 1);               // pure white

      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    // Two layers: tiny dim stars + a few brighter ones
    const matDim = new THREE.PointsMaterial({ size: 0.6,  vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85 });
    const matBig = new THREE.PointsMaterial({ size: 1.8,  color: 0xffffff,    sizeAttenuation: true, transparent: true, opacity: 0.6  });

    // Bright star positions (sparse)
    const bCount = 200;
    const bpos = new Float32Array(bCount * 3);
    for (let i = 0; i < bCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      bpos[i*3]   = R * Math.sin(phi) * Math.cos(theta);
      bpos[i*3+1] = R * Math.cos(phi);
      bpos[i*3+2] = R * Math.sin(phi) * Math.sin(theta);
    }
    const bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));

    this.el.object3D.add(new THREE.Points(geo,  matDim));
    this.el.object3D.add(new THREE.Points(bgeo, matBig));

    // Subtle twinkle via opacity animation in tick
    this._matDim = matDim;
    this._matBig = matBig;
  },
  tick: function (t) {
    // Very gentle twinkle
    this._matDim.opacity = 0.8 + Math.sin(t * 0.0009) * 0.05;
    this._matBig.opacity = 0.5 + Math.sin(t * 0.0013) * 0.1;
  }
});

// ── SPACE NEBULA ─────────────────────────────────
// Soft additive-blended point clouds forming colored nebula regions.
// Uses a canvas radial-gradient texture so each point is a soft disc.
AFRAME.registerComponent('space-nebula', {
  init: function () {
    // Soft circular sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0,   'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);

    // Each nebula: a colored point cloud at different positions/colors
    const clouds = [
      { center: [ 25, 10, -90],  radius: 35, color: new THREE.Color(0.7, 0.1, 1.0), count: 600, opacity: 0.35 }, // purple
      { center: [-50, -5, -130], radius: 45, color: new THREE.Color(0.1, 0.4, 1.0), count: 700, opacity: 0.30 }, // blue
      { center: [ 70, 25, -110], radius: 28, color: new THREE.Color(1.0, 0.2, 0.5), count: 450, opacity: 0.28 }, // pink
      { center: [-15, 40, -160], radius: 55, color: new THREE.Color(0.2, 0.8, 0.7), count: 800, opacity: 0.25 }, // teal
      { center: [  5,-20, -200], radius: 70, color: new THREE.Color(0.5, 0.1, 0.8), count: 900, opacity: 0.20 }, // deep violet
    ];

    clouds.forEach(def => {
      const pos = new Float32Array(def.count * 3);
      for (let i = 0; i < def.count; i++) {
        const r     = def.radius * Math.cbrt(Math.random()); // cube-root: softer falloff
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        pos[i*3]   = def.center[0] + r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = def.center[1] + r * Math.cos(phi) * 0.35; // flatten vertically
        pos[i*3+2] = def.center[2] + r * Math.sin(phi) * Math.sin(theta);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size: 5, color: def.color, map: tex,
        transparent: true, opacity: def.opacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      this.el.object3D.add(new THREE.Points(geo, mat));
    });
  }
  // No tick: nebulae are fixed background elements
});

// ══════════════════════════════════════════════════
// FEAR EFFECT COMPONENTS
// Each reads window.OSS and activates only when its
// effect name matches. Intensity ramps 0→1 over 6 s.
// ══════════════════════════════════════════════════

// ── LOOMING OBJECTS ──────────────────────────────
// Objects spawn far away then accelerate directly at the camera.
// Pool-based so no GC pressure mid-effect.
AFRAME.registerComponent('looming-effect', {
  init: function () {
    this._pool = [];
    this._lastSpawn = 0;
    this._spawnInterval = 5000;

    const geos = [
      new THREE.TorusKnotGeometry(4, 0.5, 60, 12, 2, 3),
      new THREE.SphereGeometry(3.5, 14, 10),
      new THREE.OctahedronGeometry(4),
      new THREE.TorusGeometry(3.5, 0.9, 10, 40),
      new THREE.IcosahedronGeometry(3.2),
      new THREE.TorusKnotGeometry(3.5, 0.6, 60, 12, 3, 5),
    ];

    geos.forEach((geo, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.88,
        wireframe: i % 2 === 0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.el.object3D.add(mesh);
      this._pool.push({ mesh, mat, active: false, z: 0, speed: 0 });
    });
  },

  tick: function (t, dt) {
    const oss = window.OSS;
    if (!oss || oss.effect !== 'looming') {
      this._pool.forEach(o => { o.active = false; o.mesh.visible = false; });
      return;
    }

    const dt_s = dt * 0.001;
    const i = oss.intensity;

    // Spawn cadence shortens as intensity grows
    if (t - this._lastSpawn > this._spawnInterval) this._spawnOne(t, i);

    const c = new THREE.Color();
    this._pool.forEach(obj => {
      if (!obj.active) return;
      obj.z += obj.speed * dt_s;
      obj.mesh.position.z = obj.z;
      obj.mesh.rotation.x += 0.035;
      obj.mesh.rotation.y += 0.04;
      c.setHSL(((t * 0.0002 - obj.z * 0.002) % 1 + 1) % 1, 1, 0.6);
      obj.mat.color.copy(c);
      if (obj.z > 6) { obj.active = false; obj.mesh.visible = false; }
    });
  },

  _spawnOne: function (t, intensity) {
    if (intensity < 0.25) return;
    const obj = this._pool.find(o => !o.active);
    if (!obj) return;
    obj.active = true;
    obj.mesh.visible = true;
    obj.z = -110 - Math.random() * 50;
    obj.speed = 45 + Math.random() * 35 + intensity * 25;
    // Near-miss offsets — close enough to feel threatening
    obj.mesh.position.x = (Math.random() - 0.5) * 2.5;
    obj.mesh.position.y = 1.6 + (Math.random() - 0.5) * 1.8;
    obj.mesh.position.z = obj.z;
    this._lastSpawn = t;
    this._spawnInterval = 3500 + Math.random() * 3000;
  }
});

// ── HEIGHT ABYSS ─────────────────────────────────
// Drops the floor away and reveals an infinite-seeming pit below.
// Deep glowing points suggest terrifying depth.
AFRAME.registerComponent('height-abyss', {
  init: function () {
    // Inside-facing cylinder = pit walls stretching down
    const geo = new THREE.CylinderGeometry(28, 6, 220, 36, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x040008, side: THREE.BackSide, transparent: true, opacity: 0
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -111, -5);
    this.el.object3D.add(mesh);
    this._abyssMat = mat;

    // Faint colored points far below — suggest infinite depth
    const pCount = 30;
    const ppos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      ppos[i*3]   = (Math.random() - 0.5) * 18;
      ppos[i*3+1] = -120 - Math.random() * 60;
      ppos[i*3+2] = -5 + (Math.random() - 0.5) * 12;
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
    this._glowMat = new THREE.PointsMaterial({
      color: 0x5500ff, size: 2.5, transparent: true, opacity: 0
    });
    this.el.object3D.add(new THREE.Points(pgeo, this._glowMat));

    this._floorEl  = null;
    this._floorBaseY = 0;
  },

  tick: function (t) {
    const oss    = window.OSS;
    const active = oss && oss.effect === 'height-drop';
    const i      = active ? oss.intensity : 0;

    this._abyssMat.opacity = i * 0.94;
    this._glowMat.opacity  = i * 0.75;
    this._glowMat.color.setHSL((t * 0.00018) % 1, 1, 0.5 + Math.sin(t * 0.003) * 0.2);

    if (!this._floorEl) {
      this._floorEl = document.querySelector('[floor-grid]');
      if (this._floorEl) this._floorBaseY = this._floorEl.object3D.position.y;
    }
    if (this._floorEl) {
      const target = active ? -i * 28 : this._floorBaseY;
      this._floorEl.object3D.position.y += (target - this._floorEl.object3D.position.y) * 0.025;
    }
  }
});

// ── STROBE FLASH ─────────────────────────────────
// Alternates white flash and total blackout at irregular 0.5–3 Hz.
// Irregularity (not constant frequency) maximises startle and disorientation.
AFRAME.registerComponent('strobe-flash', {
  init: function () {
    this._mat         = null;
    this._lastToggle  = 0;
    this._interval    = 400;
    this._isFlash     = false;
  },

  tick: function (t) {
    if (!this._mat) {
      const el = document.querySelector('#flash-overlay');
      if (!el) return;
      const mc = el.components && el.components.material;
      if (mc && mc.material) this._mat = mc.material;
      else return;
    }

    const oss = window.OSS;
    if (!oss || oss.effect !== 'strobe') {
      this._mat.opacity = 0;
      return;
    }

    const i = oss.intensity;
    // Frequency varies: 0.5–3 Hz using a slow sine so it feels unpredictable
    const freqHz  = 0.5 + Math.abs(Math.sin(oss.age * 0.00028)) * 2.5;
    const interval = 1000 / freqHz;

    if (t - this._lastToggle > interval) {
      this._isFlash    = !this._isFlash;
      this._lastToggle = t;
      // Randomise next interval slightly for extra unpredictability
      this._interval = interval * (0.8 + Math.random() * 0.4);
    }

    if (this._isFlash) {
      this._mat.color.set(0xffffff);
      this._mat.opacity = i * 0.88;
    } else {
      this._mat.color.set(0x000000);
      this._mat.opacity = i * 0.93;
    }
  }
});

// ── WORLD EFFECTS (on #worldRoot) ────────────────
// Vortex: spins the entire geometry world around the camera.
// Scale shift: pulses world scale between giant and tiny.
AFRAME.registerComponent('world-effects', {
  init: function () {
    this._unitScale = new THREE.Vector3(1, 1, 1);
    this._rotY      = 0;
  },

  tick: function (t, dt) {
    const oss = window.OSS;
    const obj = this.el.object3D;
    const i   = oss ? oss.intensity : 0;

    // VORTEX ─ world spins, camera stays fixed
    if (oss && oss.effect === 'vortex') {
      // Speed ramps up with intensity + slight pulse so it doesn't feel mechanical
      const spinRate = i * 0.022 * (1 + Math.sin(oss.age * 0.0006) * 0.4);
      this._rotY += spinRate;
    } else {
      this._rotY *= 0.992; // bleed rotation off when effect ends
    }
    obj.rotation.y = this._rotY;

    // SCALE SHIFT ─ irrational sine sums so surges feel uncontrolled
    if (oss && oss.effect === 'scale-shift') {
      const a  = oss.age * 0.001;
      const φ  = 1.6180339887;
      const surge = Math.sin(a * 0.7) * 0.7 + Math.sin(a * 0.7 * φ) * 0.45;
      const s  = 1 + surge * i * 1.6;
      obj.scale.setScalar(Math.max(0.12, Math.min(s, 3.8)));
    } else {
      obj.scale.lerp(this._unitScale, 0.03);
    }
  }
});
