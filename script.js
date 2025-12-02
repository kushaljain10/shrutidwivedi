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
        // Enforce browser validation for required fields
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
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
            // Redirect to thank-you page
            window.location.href = "thank-you.html";
          }, 800);
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

  let target = nextSundayAt(15, 30);

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
    const day = date.getDate();
    const suffix = (() => {
      if (day % 100 >= 11 && day % 100 <= 13) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    })();
    const month = date.toLocaleDateString([], { month: "long" });
    const weekday = date.toLocaleDateString([], { weekday: "long" });
    const start = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endDate = new Date(date.getTime());
    endDate.setHours(date.getHours() + 2);
    const end = endDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${day}${suffix} ${month}, ${weekday} <br /> @ ${start} to ${end}`;
  }

  update();
  setInterval(update, 1000);

  async function fetchScheduleFromSheet() {
    const scheduleEl = document.getElementById("scheduleText");
    try {
      if (!SCRIPT_URL || SCRIPT_URL.startsWith("REPLACE_")) {
        // Keep fallback and exit if not configured
        if (scheduleEl) scheduleEl.innerHTML = formatSchedule(target);
        return;
      }
      const url = new URL(SCRIPT_URL);
      url.searchParams.set("action", "schedule");
      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Expect one of:
      // { iso: "2025-12-07T15:30:00+05:30" }
      // or { date: "2025-12-07", time: "15:30", tz: "+05:30" }
      let eventDate;
      if (data && data.iso) {
        eventDate = new Date(data.iso);
      } else if (data && data.date && data.time) {
        const iso = `${data.date}T${data.time}${data.tz || ""}`;
        eventDate = new Date(iso);
      }

      if (eventDate && !isNaN(eventDate.getTime())) {
        target = eventDate;
        if (scheduleEl) scheduleEl.innerHTML = formatSchedule(eventDate);
      } else {
        // Fallback: use existing target
        if (scheduleEl) scheduleEl.innerHTML = formatSchedule(target);
      }
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
      const scheduleEl = document.getElementById("scheduleText");
      if (scheduleEl) scheduleEl.innerHTML = formatSchedule(target);
    }
  }

  // Initialize modal wiring after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      wireModal();
      fetchScheduleFromSheet();
    });
  } else {
    wireModal();
    fetchScheduleFromSheet();
  }
})();
