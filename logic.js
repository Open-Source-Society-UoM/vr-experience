// ══════════════════════════════════════════════════
// OPEN SOURCE SOCIETY — Psychedelic VR logic.js
// Libraries used: A-Frame 1.5 + THREE.js (bundled),
//   aframe-particle-system-component (CDN)
// ══════════════════════════════════════════════════

// ── SKY COLOR CYCLE ──────────────────────────────
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
    this._mat.color.setHSL((t * 0.000018) % 1, 1, 0.07);
  }
});

// ── CAMERA SWAY & ROLL ───────────────────────────
// Runs on the camera rig to add physical disorientation
AFRAME.registerComponent('camera-sway', {
  tick: function (t) {
    const s = t / 1000;
    this.el.object3D.position.x = Math.sin(s * 0.7) * 0.45 + Math.sin(s * 0.23) * 0.25;
    this.el.object3D.position.y = Math.sin(s * 0.53) * 0.3 + Math.sin(s * 0.19) * 0.12;
    // Roll: two overlapping sine waves = unpredictable feel
    this.el.object3D.rotation.z = Math.sin(s * 0.41) * 0.13 + Math.sin(s * 0.11) * 0.07;
    // Slow forward/back drift creates depth confusion
    this.el.object3D.position.z = Math.sin(s * 0.17) * 0.4;
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
// Color-cycling torus rings scrolling toward camera
AFRAME.registerComponent('psychedelic-tunnel', {
  init: function () {
    this.rings = [];
    const NUM = 30, SPACING = 5;
    this.totalLen = NUM * SPACING;

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
        baseZ: z,
        hueOff: (i / NUM),
        rotX: (Math.random() - 0.5) * 0.014,
        rotZ: (Math.random() - 0.5) * 0.018
      });
    }
  },
  tick: function (t, dt) {
    const SPEED = 0.007;
    const c = new THREE.Color();
    this.rings.forEach((r, i) => {
      let z = r.baseZ + (t * SPEED % this.totalLen);
      if (z > 4) z -= this.totalLen;
      r.mesh.position.z = z;
      r.mesh.rotation.z += r.rotZ;
      r.mesh.rotation.x += r.rotX;
      c.setHSL(((r.hueOff + t * 0.00008) % 1), 1, 0.62);
      r.mat.color.copy(c);
      r.mesh.scale.setScalar(1 + Math.sin(t * 0.0022 + i * 0.9) * 0.18);
    });
  }
});

// ── SECOND TUNNEL (inner, counter-rotating) ──────
AFRAME.registerComponent('inner-tunnel', {
  init: function () {
    this.rings = [];
    const NUM = 20, SPACING = 6;
    this.totalLen = NUM * SPACING;

    for (let i = 0; i < NUM; i++) {
      const geo = new THREE.TorusGeometry(2.5, 0.05, 12, 60);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      const z = -i * SPACING - 2.5;
      mesh.position.set(0, 1.6, z);
      this.el.object3D.add(mesh);
      this.rings.push({ mesh, mat, baseZ: z, hueOff: (i / NUM) + 0.5 });
    }
  },
  tick: function (t) {
    const SPEED = -0.004;
    const c = new THREE.Color();
    this.rings.forEach((r, i) => {
      let z = r.baseZ + (t * SPEED % this.totalLen);
      if (z > 4)  z -= this.totalLen;
      if (z < -this.totalLen) z += this.totalLen;
      r.mesh.position.z = z;
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
