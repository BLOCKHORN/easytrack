// useScrollMotion.js
import { useEffect } from "react";
import anime from "animejs";

function toNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export default function useScrollMotion(opts = {}) {
  useEffect(() => {
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

    // ======== REVEALS =======================================================
    const revealNodes = Array.from(
      document.querySelectorAll("[data-reveal], [data-reveal-child]")
    );

    const setInitial = (el, type) => {
      if (prefersReduced) {
        el.style.opacity = 1;
        el.style.transform = "none";
        return;
      }
      const base = { opacity: 0, x: 0, y: 0, s: 1 };
      switch (type) {
        case "fade-up":    base.y = 14; break;
        case "fade-down":  base.y = -14; break;
        case "slide-left": base.x = -16; break;
        case "slide-right":base.x = 16; break;
        case "scale-in":   base.s = 0.96; break;
        default: break; // fade
      }
      el.style.opacity = 0;
      el.style.transform = `translate(${base.x}px, ${base.y}px) scale(${base.s})`;
      el.style.willChange = "transform, opacity";
    };

    revealNodes.forEach((el) => {
      const type = el.dataset.reveal || (el.hasAttribute("data-reveal-child") ? "fade-up" : "fade");
      setInitial(el, type);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (!(entry.intersectionRatio > 0.08)) return;

          const type = el.dataset.reveal || (el.hasAttribute("data-reveal-child") ? "fade-up" : "fade");
          const duration = toNumber(el.dataset.duration, 520);
          const delay = toNumber(el.dataset.delay, 0);
          const repeat = el.dataset.repeat === "true";

          // Stagger container
          if (el.dataset.reveal === "stagger-up") {
            const children = el.querySelectorAll("[data-reveal-child]");
            const stagger = toNumber(el.dataset.stagger, 80);
            if (prefersReduced) {
              children.forEach((c) => { c.style.opacity = 1; c.style.transform = "none"; });
            } else {
              anime({
                targets: children,
                opacity: [0, 1],
                translateY: [-14, 0],
                easing: "easeOutQuad",
                duration,
                delay: anime.stagger(stagger, { start: delay })
              });
            }
            if (!repeat) io.unobserve(el);
            return;
          }

          // Elemento simple
          if (prefersReduced) {
            el.style.opacity = 1; el.style.transform = "none";
          } else {
            let from = {};
            switch (type) {
              case "fade-up":    from = { opacity: [0, 1], translateY: [14, 0] }; break;
              case "fade-down":  from = { opacity: [0, 1], translateY: [-14, 0] }; break;
              case "slide-left": from = { opacity: [0, 1], translateX: [-16, 0] }; break;
              case "slide-right":from = { opacity: [0, 1], translateX: [16, 0] }; break;
              case "scale-in":   from = { opacity: [0, 1], scale: [0.96, 1] }; break;
              default:           from = { opacity: [0, 1] };
            }
            anime({ targets: el, ...from, duration, delay, easing: "easeOutQuad" });
          }
          if (!repeat) io.unobserve(el);
        });
      },
      {
        root: null,
        threshold: opts.threshold ?? 0.12,
        rootMargin: opts.rootMargin ?? "0px 0px -10% 0px",
      }
    );

    revealNodes.forEach((el) => io.observe(el));

    // ======== PARALLAX ======================================================
    const parallaxes = Array.from(document.querySelectorAll("[data-parallax]"));
    let raf = 0;
    const updateParallax = () => {
      raf = 0;
      const vh = window.innerHeight;
      parallaxes.forEach((el) => {
        const speed = toNumber(el.dataset.speed, 16); // px total
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const progress = Math.max(0, Math.min(1, center / vh)); // 0..1
        const offset = (progress - 0.5) * speed;
        el.style.transform = `translateY(${offset.toFixed(2)}px)`;
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(updateParallax); };

    if (!prefersReduced && parallaxes.length) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      onScroll();
    }

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [opts.threshold, opts.rootMargin]);
}
