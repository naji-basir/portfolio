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
  // Touch devices (phones/tablets) never fire mousemove from a normal tap or scroll,
  // so the cursor-glow effect can never actually appear there — running a 60fps
  // redraw loop for it would just burn battery/CPU for nothing. Draw the static
  // grid once instead and skip the animation loop entirely.
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  const shouldAnimate = !reduceMotion && hasFinePointer;

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
    if (!shouldAnimate) draw();
  });

  resize();
  if (shouldAnimate) {
    loop();
  } else {
    draw();
  }
})();

// Custom cursor — dot follows exactly, ring trails with easing, both
// grow/react on hover over interactive elements. Skipped entirely on
// touch devices, since there's no real cursor there to replace.
(function () {
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  if (!hasFinePointer) return;

  const dot = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  if (!dot || !ring) return;

  let dotX = window.innerWidth / 2;
  let dotY = window.innerHeight / 2;
  let ringX = dotX;
  let ringY = dotY;

  window.addEventListener("mousemove", (e) => {
    dotX = e.clientX;
    dotY = e.clientY;
  });

  function loop() {
    // Dot snaps instantly to the real cursor position; the ring eases
    // toward it, which is what creates the trailing effect.
    dot.style.left = `${dotX}px`;
    dot.style.top = `${dotY}px`;

    ringX += (dotX - ringX) * 0.18;
    ringY += (dotY - ringY) * 0.18;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;

    requestAnimationFrame(loop);
  }
  loop();

  // Grow the ring over anything clickable
  const interactiveSelector = "a, button, input, textarea, [role='button']";
  document.querySelectorAll(interactiveSelector).forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hover"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
  });

  // Hide the custom cursor when it leaves the window
  document.addEventListener("mouseleave", () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  });
  document.addEventListener("mouseenter", () => {
    dot.style.opacity = "1";
    ring.style.opacity = "0.6";
  });
})();

// Scroll-spy — highlight the nav link matching the section currently in view
(function () {
  const navLinks = document.querySelectorAll(".nav-link[data-section]");
  if (!navLinks.length) return;

  // Sections in document order (matters — the algorithm below relies on it)
  const sections = Array.from(navLinks)
    .map((link) => document.getElementById(link.dataset.section))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.section === id);
    });
  };

  let ticking = false;

  function updateActiveNav() {
    // A section is "current" once its top has scrolled past this line near
    // the top of the viewport. Walking sections in order and keeping the
    // last one that qualifies avoids the ambiguity of "which overlapping
    // section counts" that IntersectionObserver ran into.
    const triggerLine = window.innerHeight * 0.35;
    let currentId = sections[0].id;

    for (const section of sections) {
      if (section.getBoundingClientRect().top <= triggerLine) {
        currentId = section.id;
      } else {
        break;
      }
    }
    setActive(currentId);
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateActiveNav);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateActiveNav();
})();

// Contact form — submit via Formspree without leaving the page
(function () {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    status.textContent = "";
    status.className =
      "text-center font-label-caps text-sm text-on-surface-variant";
    status.textContent = "Sending...";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        status.classList.remove("text-on-surface-variant");
        status.classList.add("accent-text");
        status.textContent = "Message sent — thanks for reaching out!";
        form.reset();
      } else {
        throw new Error("Submission failed");
      }
    } catch (err) {
      status.classList.remove("text-on-surface-variant", "accent-text");
      status.classList.add("text-red-400");
      status.textContent =
        "Something went wrong — please email me directly instead.";
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

// Email link — copies the address to clipboard (works regardless of whether
// the visitor has a mail client registered) while still letting the
// underlying mailto: link fire normally for anyone who does have one set up.
(function () {
  const link = document.getElementById("email-link");
  const label = document.getElementById("email-label");
  const circle = document.getElementById("email-icon-circle");
  const iconSlot = document.getElementById("email-icon-slot");
  if (!link || !label || !circle || !iconSlot) return;

  const mailIcon = iconSlot.innerHTML;
  const checkIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  let revertTimer = null;

  link.addEventListener("click", async (e) => {
    const email = link.dataset.email;
    try {
      await navigator.clipboard.writeText(email);

      clearTimeout(revertTimer);
      iconSlot.innerHTML = checkIcon;
      circle.classList.add("accent-border", "accent-text");
      label.textContent = "Copied!";
      label.classList.add("accent-text");
      label.classList.remove("opacity-60");

      revertTimer = setTimeout(() => {
        iconSlot.innerHTML = mailIcon;
        circle.classList.remove("accent-border", "accent-text");
        label.textContent = "Email";
        label.classList.remove("accent-text");
        label.classList.add("opacity-60");
      }, 1500);
    } catch (err) {
      // Clipboard API unavailable (e.g. insecure context) — mailto: still fires
      // as the normal link behavior, so no explicit fallback needed here.
    }
  });
})();
