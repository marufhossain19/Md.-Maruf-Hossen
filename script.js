/* ============================================================
   MARUF HOSSEN — CINEMATIC PORTFOLIO
   Main JavaScript — Animations & Interactivity
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     1. LENIS SMOOTH SCROLL
     ========================================================== */
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  gsap.registerPlugin(ScrollTrigger);

  /* ==========================================================
     2. SCROLL PROGRESS
     ========================================================== */
  const scrollProgress = document.getElementById('scrollProgress');
  lenis.on('scroll', ({ progress }) => {
    if (scrollProgress) scrollProgress.style.width = `${progress * 100}%`;
  });

  /* ==========================================================
     3. CURSOR GLOW
     ========================================================== */
  const cursorGlow = document.getElementById('cursorGlow');
  if (cursorGlow && window.innerWidth > 768) {
    let mx = 0, my = 0, gx = 0, gy = 0;
    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
    (function animGlow() {
      gx += (mx - gx) * 0.07; gy += (my - gy) * 0.07;
      cursorGlow.style.left = gx + 'px'; cursorGlow.style.top = gy + 'px';
      requestAnimationFrame(animGlow);
    })();
  }

  /* ==========================================================
     4. NAVIGATION — Centered Pill
     ========================================================== */
  const navPill = document.getElementById('navPill');
  const navToggle = document.getElementById('navToggle');

  // Mobile toggle
  if (navToggle && navPill) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navPill.classList.toggle('mobile-open');
    });
    navPill.querySelectorAll('.nav-pill-item').forEach((item) => {
      item.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navPill.classList.remove('mobile-open');
      });
    });
  }

  // Smooth scroll for all hash links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) lenis.scrollTo(target, { offset: -80 });
    });
  });

  // Active nav item tracking
  const navItems = document.querySelectorAll('.nav-pill-item[data-section]');
  const navSections = [];
  navItems.forEach((item) => {
    const el = document.getElementById(item.dataset.section);
    if (el) navSections.push({ item, el });
  });

  function updateActiveNav() {
    const sy = window.scrollY + window.innerHeight * 0.4;
    let active = navSections[0];
    navSections.forEach((s) => { if (sy >= s.el.offsetTop) active = s; });
    navItems.forEach((i) => i.classList.remove('active'));
    if (active) active.item.classList.add('active');
  }
  lenis.on('scroll', updateActiveNav);
  updateActiveNav();

  /* ==========================================================
     5. CHAPTER DOTS
     ========================================================== */
  const chapterDots = document.querySelectorAll('.chapter-dot');
  const dotSections = [];
  chapterDots.forEach((dot) => {
    const el = document.getElementById(dot.dataset.target);
    if (el) dotSections.push({ dot, el });
    dot.addEventListener('click', () => { if (el) lenis.scrollTo(el, { offset: -80 }); });
  });

  function updateDots() {
    const sy = window.scrollY + window.innerHeight / 2;
    dotSections.forEach(({ dot, el }) => {
      const inView = sy >= el.offsetTop && sy < el.offsetTop + el.offsetHeight;
      dot.classList.toggle('active', inView);
    });
  }
  lenis.on('scroll', updateDots);
  updateDots();

  /* ==========================================================
     6. WEBGL WAVE BACKGROUND — Three.js + GLSL
     ========================================================== */
  const waveCanvas = document.getElementById('waveCanvas');
  if (waveCanvas && typeof THREE !== 'undefined') {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas: waveCanvas, antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uScroll: { value: 0 },
    };

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;

    const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uScroll;

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        float aspect = uResolution.x / uResolution.y;
        float x = uv.x * aspect;

        /* Ultra-fine continuous micro-grid mesh (2px repeating) */
        float lineX = step(1.0, mod(gl_FragCoord.x, 2.0));
        float lineY = step(1.0, mod(gl_FragCoord.y, 2.0));
        
        /* teal accent for lines */
        vec3 teal = vec3(0.28, 0.75, 0.68);

        /* Balanced visibility of the texture */
        float gridMesh = max(lineX, lineY) * 0.14; 
        
        /* Fade the grid out towards the upper side of the waves */
        float gridFade = smoothstep(0.8, 0.1, uv.y); 
        gridMesh *= gridFade;

        /* Strictly pure pitch black background */
        vec3 bg = vec3(0.0);
        /* Subtle tinted grid texture - visible but balanced for deep blacks */
        vec3 gridColor = vec3(gridMesh) * teal * 0.65; 

        float totalWave = 0.0;

        /* mouse influence — subtle global offset */
        float mouseOffY = (uMouse.y - 0.5) * 0.03;
        float mouseOffX = (uMouse.x - 0.5) * 0.02;

        /* 6 wide, smooth flowing wave lines that cross over each other */
        for (int i = 0; i < 6; i++) {
          float fi = float(i);
          /* each wave sits at a different vertical base */
          float baseY = 0.25 + fi * 0.1;

          /* scroll modifies phase (horizontal flow) and amplitude, not vertical separation */
          float scrollPhase = uScroll * 0.0015;
          float scrollAmp = 1.0 + min(uScroll * 0.00015, 0.5); // waves get up to 50% larger when scrolled deep

          /* Large amplitude, wide sweeping curves for a fluid, deep wave aesthetic */
          float wave = 0.0;
          wave += sin(x * 0.85 + fi * 1.1 + uTime * 0.8 + scrollPhase) * 0.22 * scrollAmp;
          wave += sin(x * 1.4 - fi * 0.7 + uTime * 0.5 + 1.5 + scrollPhase * 1.2) * 0.12 * scrollAmp;
          wave += sin(x * 2.2 + fi * 2.3 + uTime * 0.4 + 3.0 + scrollPhase * 0.8) * 0.05 * scrollAmp;

          /* add mouse reactivity */
          wave += mouseOffY + mouseOffX * sin(x * 0.5 + fi);

          /* calculate vertical position without tearing them apart */
          float y = uv.y - baseY - wave;

          /* Thinner line and much softer glow to prevent unwanted 'shininess' on steep curves */
          float line = smoothstep(0.0018, 0.0, abs(y));       /* slightly thicker sharp core */
          float glow = smoothstep(0.015, 0.0, abs(y)) * 0.18; /* slightly larger halo */

          /* vary brightness per line for depth */
          float brightness = 0.6 + 0.4 * sin(fi * 1.2 + 0.5);

          /* Boosted visibility of the line core and glow */
          totalWave += (line * 0.12 + glow * 0.08) * brightness;
        }

        vec3 color = bg + gridColor + teal * totalWave;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      depthWrite: false, depthTest: false,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    function resizeWave() {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
    resizeWave();
    window.addEventListener('resize', resizeWave);

    let targetMX = 0.5, targetMY = 0.5, smoothMX = 0.5, smoothMY = 0.5;
    document.addEventListener('mousemove', (e) => {
      targetMX = e.clientX / window.innerWidth;
      targetMY = 1.0 - e.clientY / window.innerHeight;
    });

    lenis.on('scroll', ({ scroll }) => { uniforms.uScroll.value = scroll; });

    const clock = new THREE.Clock();
    function animateWave() {
      requestAnimationFrame(animateWave);
      smoothMX += (targetMX - smoothMX) * 0.04;
      smoothMY += (targetMY - smoothMY) * 0.04;
      uniforms.uMouse.value.set(smoothMX, smoothMY);
      if (!prefersReduced) uniforms.uTime.value = clock.getElapsedTime() * 0.035;
      renderer.render(scene, camera);
    }
    animateWave();
  }

  /* ==========================================================
     7. HERO ZOOM ON SCROLL
     ========================================================== */
  const heroEl = document.getElementById('hero');
  if (heroEl) {
    gsap.to('.hero-content', {
      scale: 0.93, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: 1 },
    });
  }

  /* ==========================================================
     8. TYPING ANIMATION
     ========================================================== */
  const typingEl = document.getElementById('typingText');
  if (typingEl) {
    const titles = ['Software Engineer', 'Flutter Developer', 'AI Researcher', 'Problem Solver', 'Future Innovator'];
    let ti = 0, ci = 0, deleting = false, delay = 100;
    (function typeStep() {
      const word = titles[ti];
      if (!deleting) {
        typingEl.textContent = word.substring(0, ++ci);
        if (ci === word.length) { deleting = true; delay = 2200; }
        else delay = 70 + Math.random() * 40;
      } else {
        typingEl.textContent = word.substring(0, --ci);
        if (ci === 0) { deleting = false; ti = (ti + 1) % titles.length; delay = 400; }
        else delay = 35;
      }
      setTimeout(typeStep, delay);
    })();
  }

  /* ==========================================================
     9. GSAP SCROLL REVEALS
     ========================================================== */
  const revealConfig = {
    '.reveal':       { from: { opacity: 0, y: 35 },  to: { opacity: 1, y: 0 } },
    '.reveal-left':  { from: { opacity: 0, x: -35 }, to: { opacity: 1, x: 0 } },
    '.reveal-right': { from: { opacity: 0, x: 35 },  to: { opacity: 1, x: 0 } },
    '.reveal-scale': { from: { opacity: 0, scale: 0.92 }, to: { opacity: 1, scale: 1 } },
  };
  Object.entries(revealConfig).forEach(([sel, { from, to }]) => {
    gsap.utils.toArray(sel).forEach((el) => {
      gsap.fromTo(el, from, {
        ...to, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
      });
    });
  });

  /* ==========================================================
     10. TIMELINE FILL
     ========================================================== */
  const timelineFill = document.getElementById('timelineFill');
  const timeline = document.getElementById('universityTimeline');
  if (timelineFill && timeline) {
    gsap.to(timelineFill, {
      height: '100%', ease: 'none',
      scrollTrigger: { trigger: timeline, start: 'top 70%', end: 'bottom 50%', scrub: 1 },
    });
    timeline.querySelectorAll('.timeline-dot').forEach((dot) => {
      ScrollTrigger.create({
        trigger: dot.closest('.timeline-item'), start: 'top 70%',
        onEnter: () => dot.classList.add('active'),
      });
    });
  }

  /* ==========================================================
     11. CGPA COUNTER
     ========================================================== */
  const cgpaEl = document.getElementById('cgpaCounter');
  if (cgpaEl) {
    let done = false;
    ScrollTrigger.create({
      trigger: cgpaEl, start: 'top 80%',
      onEnter: () => {
        if (done) return; done = true;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: 3.90, duration: 2, ease: 'power2.out',
          onUpdate: () => { cgpaEl.textContent = obj.v.toFixed(2); },
        });
      },
    });
  }

  /* ==========================================================
     12. 3D CARD TILT
     ========================================================== */
  document.querySelectorAll('.glass-card-tilt').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -5;
      const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 5;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  /* ==========================================================
     13. MAGNETIC BUTTONS
     ========================================================== */
  document.querySelectorAll('.btn-magnetic').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.18}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
  });

  /* ==========================================================
     14. PROJECT MODALS
     ========================================================== */
  const projectData = {
    'bus-tracking': { icon: '🚌', type: 'Mobile Application', title: 'Bus Tracking App', desc: 'A real-time DIU campus bus tracking mobile application developed using Flutter, improving bus tracking for students. Provides live GPS-based bus location updates, estimated arrival times, and route information.', tech: ['Flutter', 'Dart', 'Google Maps API', 'Real-time GPS', 'Firebase'] },
    'expense-tracker': { icon: '💰', type: 'Mobile Application', title: 'Daily Expense Tracker', desc: 'A comprehensive mobile application for tracking daily expenses. Supports family invitation, weekly expense graphs, monthly heatmaps, and alert notifications when spending exceeds limits.', tech: ['Flutter', 'Dart', 'Charts', 'Notifications', 'Supabase'] },
    'health-record': { icon: '🏥', type: 'Web Application', title: 'Health Record System', desc: 'A web-based application for managing patient health records digitally. Features patient registration, medical history tracking, appointment scheduling, and secure data storage.', tech: ['HTML', 'CSS', 'JavaScript', 'SQL', 'Backend API'] },
    'task-manager': { icon: '✅', type: 'Web Application', title: 'Task Manager', desc: 'A productivity web application for creating, assigning, and tracking tasks with deadlines and priority management. Supports team collaboration with task assignment and status tracking.', tech: ['HTML', 'CSS', 'JavaScript', 'SQL', 'Backend'] },
    'air-quality': { icon: '🌬️', type: 'Embedded System + Web', title: 'Air Quality Monitoring', desc: 'Built using embedded systems with a real-time web dashboard for monitoring air quality data and visualizing pollution levels. Uses IoT sensors and real-time analytics.', tech: ['Embedded C', 'IoT Sensors', 'Web Dashboard', 'Charts'] },
    'data-mining': { icon: '📊', type: 'Research', title: 'Data Mining Research', desc: 'Analyzed the correlation among student club participation, co-curricular activities, and their influence on academic success and employment outcomes among university students.', tech: ['Python', 'Pandas', 'Data Mining', 'ML'] },
  };

  const modal = document.getElementById('projectModal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const d = projectData[card.dataset.project];
      if (!d || !modal || !modalBody) return;
      modalBody.innerHTML = `
        <div style="font-size:2.5rem;margin-bottom:1rem;">${d.icon}</div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--accent-muted);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:0.4rem;">${d.type}</div>
        <h2 style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;margin-bottom:1rem;color:var(--text-white);">${d.title}</h2>
        <p style="color:var(--text-secondary);line-height:1.8;margin-bottom:1.25rem;font-size:0.9rem;">${d.desc}</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">${d.tech.map((t) => `<span class="tech-pill">${t}</span>`).join('')}</div>`;
      modal.classList.add('active'); lenis.stop();
    });
  });
  if (modalClose) modalClose.addEventListener('click', () => { modal.classList.remove('active'); lenis.start(); });
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('active'); lenis.start(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal?.classList.contains('active')) { modal.classList.remove('active'); lenis.start(); } });

  /* ==========================================================
     15. SKILLS CONSTELLATION CANVAS
     ========================================================== */
  const skillsCanvas = document.getElementById('skillsCanvas');
  if (skillsCanvas) {
    const ctx = skillsCanvas.getContext('2d');
    let sw, sh;
    const skillData = [
      { label: 'Python', c: 0 }, { label: 'Java', c: 0 }, { label: 'C', c: 0 },
      { label: 'Dart', c: 0 }, { label: 'HTML/CSS', c: 0 },
      { label: 'Flutter', c: 1 }, { label: 'SQL', c: 2 }, { label: 'Firebase', c: 2 },
      { label: 'Git', c: 2 }, { label: 'Data Analysis', c: 3 }, { label: 'AI/ML', c: 3 },
      { label: 'Communication', c: 4 }, { label: 'Leadership', c: 4 },
      { label: 'Teamwork', c: 4 }, { label: 'Project Mgmt', c: 4 },
    ];
    const colors = [
      'rgba(94, 234, 212, 0.8)', 'rgba(56, 189, 248, 0.8)',
      'rgba(52, 211, 153, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(244, 114, 182, 0.8)',
    ];
    let nodes = [];

    function resize() {
      const p = skillsCanvas.parentElement;
      sw = skillsCanvas.width = p.offsetWidth;
      sh = skillsCanvas.height = p.offsetHeight;
      layout();
    }
    function layout() {
      nodes = [];
      const cx = sw / 2, cy = sh / 2;
      const centers = [
        { x: cx - sw * 0.22, y: cy - sh * 0.2 },
        { x: cx + sw * 0.18, y: cy - sh * 0.22 },
        { x: cx + sw * 0.22, y: cy + sh * 0.15 },
        { x: cx - sw * 0.18, y: cy + sh * 0.18 },
        { x: cx, y: cy },
      ];
      skillData.forEach((s, i) => {
        const ctr = centers[s.c];
        const a = i * 2.4 + s.c * 1.2;
        const r = 35 + Math.random() * 45;
        nodes.push({
          x: ctr.x + Math.cos(a) * r, y: ctr.y + Math.sin(a) * r,
          r: 4 + Math.random() * 3, label: s.label, c: s.c,
          color: colors[s.c], phase: Math.random() * Math.PI * 2,
        });
      });
    }
    resize();
    window.addEventListener('resize', resize);

    let hoveredNode = null, frame = 0;
    skillsCanvas.addEventListener('mousemove', (e) => {
      const rect = skillsCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      hoveredNode = nodes.find((n) => Math.hypot(mx - n.x, my - n.y) < 25) || null;
      skillsCanvas.style.cursor = hoveredNode ? 'pointer' : 'default';
    });

    let running = false;
    function draw() {
      if (!running) return;
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, sw, sh);
      frame++;
      // connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < 180) {
            const a = (1 - d / 180) * 0.08;
            const h = hoveredNode && (hoveredNode === nodes[i] || hoveredNode === nodes[j]);
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = h ? `rgba(94, 234, 212, ${a * 4})` : `rgba(255,255,255,${a})`;
            ctx.lineWidth = h ? 1.2 : 0.5; ctx.stroke();
          }
        }
      }
      // nodes
      nodes.forEach((n) => {
        const pulse = Math.sin(frame * 0.014 + n.phase) * 0.3 + 0.7;
        const isH = hoveredNode === n;
        const r = isH ? n.r * 1.8 : n.r * pulse;
        // glow
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        g.addColorStop(0, n.color.replace('0.8', isH ? '0.35' : '0.12'));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fill();
        // core
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = n.color; ctx.fill();
        if (isH) {
          ctx.font = '600 12px Inter, sans-serif'; ctx.fillStyle = '#e2e8f0';
          ctx.textAlign = 'center'; ctx.fillText(n.label, n.x, n.y - r - 10);
        }
      });
    }
    ScrollTrigger.create({
      trigger: skillsCanvas.parentElement, start: 'top bottom', end: 'bottom top',
      onEnter: () => { running = true; draw(); }, onLeave: () => { running = false; },
      onEnterBack: () => { running = true; draw(); }, onLeaveBack: () => { running = false; },
    });
  }

  /* ==========================================================
     16. INDIVIDUAL CARD SCROLL ANIMATIONS
     ========================================================== */
  const scrollCards = gsap.utils.toArray('.project-card, .achievement-card, .tech-card, .future-pillar, .glass-card, .milestone-card, .research-card');
  
  scrollCards.forEach((card) => {
    gsap.fromTo(card, 
      { opacity: 0, y: 80, scale: 0.92, rotationX: 15 },
      { 
        opacity: 1, y: 0, scale: 1, rotationX: 0,
        transformPerspective: 1000,
        transformOrigin: "center bottom",
        ease: 'power3.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 98%', 
          end: 'top 75%',
          scrub: 1.5,
        }
      }
    );
  });

  /* ==========================================================
     DONE
     ========================================================== */
  console.log('%c✦ Md. Maruf Hossen — Portfolio ✦', 'color:#5EEAD4;font-size:14px;font-weight:bold;font-family:monospace;');
})();
