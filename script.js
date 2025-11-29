// Countdown to next Sunday at 3:30 PM local time
(function () {
  // Configure this with your Google Apps Script Web App URL
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycby602QO2Qf0L2RwYFymbkEQ31t2Pz4i2aTv2Tz8F3eg7v0WZMkwnheUMXFLG4wfDDWV6Q/exec";
  // Modal helpers
  function openModal() {
    const overlay = document.getElementById("modalOverlay");
    if (overlay) {
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
      const firstInput = overlay.querySelector(
        "input, select, textarea, button"
      );
      if (firstInput) firstInput.focus();
    }
  }
  function closeModal() {
    const overlay = document.getElementById("modalOverlay");
    if (overlay) {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
    }
  }
  function wireModal() {
    // Open on CTA anchor buttons (exclude modal submit button)
    const ctas = document.querySelectorAll("a.btn");
    ctas.forEach((el) => {
      el.addEventListener("click", (e) => {
        // prevent navigation for anchors
        e.preventDefault();
        openModal();
      });
    });

    // Close interactions
    const overlay = document.getElementById("modalOverlay");
    const closeBtn = document.getElementById("modalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    const form = document.getElementById("registerForm");
    const statusEl = document.getElementById("formStatus");
    const submitBtn = document.querySelector(".btn-submit");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        data.append("timestamp", new Date().toISOString());

        if (!SCRIPT_URL || SCRIPT_URL.startsWith("REPLACE_")) {
          if (statusEl)
            statusEl.textContent =
              "Setup needed: add your Google Apps Script URL in script.js";
          return;
        }

        try {
          if (submitBtn) submitBtn.disabled = true;
          if (statusEl) statusEl.textContent = "Submitting…";
          const res = await fetch(SCRIPT_URL, { method: "POST", body: data });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          if (statusEl)
            statusEl.textContent = "Thanks! We’ve received your details.";
          setTimeout(() => {
            closeModal();
            form.reset();
            if (statusEl) statusEl.textContent = "";
            if (submitBtn) submitBtn.disabled = false;
          }, 1200);
        } catch (err) {
          console.error(err);
          if (statusEl)
            statusEl.textContent = "Something went wrong. Please try again.";
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  function nextSundayAt(hours, minutes) {
    const now = new Date();
    const date = new Date(now);
    const day = now.getDay(); // 0=Sun
    const daysUntilSunday = (7 - day) % 7 || 7; // always future Sunday
    date.setDate(now.getDate() + daysUntilSunday);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  const target = nextSundayAt(15, 30);

  function update() {
    const now = new Date();
    let diff = target - now;
    if (diff < 0) diff = 0;

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val).padStart(2, "0");
    };
    set("d", d);
    set("h", h);
    set("m", m);
    set("s", s);
  }

  function formatSchedule(date) {
    const opts = { weekday: "long", day: "numeric", month: "long" };
    const start = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endDate = new Date(date.getTime());
    endDate.setHours(date.getHours() + 2);
    const end = endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date.toLocaleDateString([], opts)}, ${start} to ${end}`;
  }

  update();
  setInterval(update, 1000);

  // Initialize modal wiring after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireModal);
  } else {
    wireModal();
  }
})();
