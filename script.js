// Reveal animation on scroll

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("opacity-100");
        entry.target.classList.remove("opacity-0", "translate-y-10");
      }
    });
  },
  { threshold: 0.1 },
);
document.querySelectorAll("section").forEach((section) => {
  section.classList.add(
    "transition-all",
    "duration-1000",
    "opacity-0",
    "translate-y-10",
  );
  observer.observe(section);
});

// Interactive dotted background — dots brighten near the cursor
(function () {
  const canvas = document.getElementById("dot-bg");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const GAP = 18;
  const DOT_RADIUS = 1;
  const BASE_ALPHA = 0.12;
  const MAX_ALPHA = 0.55;
  const GLOW_RADIUS = 160;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width, height, cols, rows;
  let mouse = { x: -9999, y: -9999, targetX: -9999, targetY: -9999 };
  let raf = null;

  function resize() {
    width = window.innerWidth;
    height = document.documentElement.scrollHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / GAP) + 1;
    rows = Math.ceil(height / GAP) + 1;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const scrollY = window.scrollY;
    const viewTop = scrollY - GLOW_RADIUS;
    const viewBottom = scrollY + window.innerHeight + GLOW_RADIUS;

    const rowStart = Math.max(0, Math.floor(viewTop / GAP));
    const rowEnd = Math.min(rows, Math.ceil(viewBottom / GAP));

    for (let r = rowStart; r < rowEnd; r++) {
      const y = r * GAP;
      for (let c = 0; c < cols; c++) {
        const x = c * GAP;
        const dx = x - mouse.x;
        const dy = y - (mouse.y + scrollY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        let alpha = BASE_ALPHA;
        if (dist < GLOW_RADIUS) {
          const t = 1 - dist / GLOW_RADIUS;
          alpha = BASE_ALPHA + (MAX_ALPHA - BASE_ALPHA) * t;
        }
        ctx.beginPath();
        ctx.arc(x, y - scrollY, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
    }
  }

  function loop() {
    mouse.x += (mouse.targetX - mouse.x) * 0.15;
    mouse.y += (mouse.targetY - mouse.y) * 0.15;
    draw();
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener("mousemove", (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.targetX = -9999;
    mouse.targetY = -9999;
  });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", () => {
    if (reduceMotion) draw();
  });

  resize();
  if (reduceMotion) {
    draw();
  } else {
    loop();
  }
})();
