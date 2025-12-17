// Countdown to next Sunday at 3:30 PM local time
(function () {
  // Configure this with your Google Apps Script Web App URL
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycby602QO2Qf0L2RwYFymbkEQ31t2Pz4i2aTv2Tz8F3eg7v0WZMkwnheUMXFLG4wfDDWV6Q/exec";

  // Form submission webhook (n8n)
  const FORM_WEBHOOK_URL =
    "https://n8n.srv913080.hstgr.cloud/webhook/77548ee1-7f4d-4916-b1ae-3d173c075e7e";

  // Toggle remote schedule fetching to avoid CORS issues in production
  const ENABLE_REMOTE_SCHEDULE = false;

  // Populate ISD codes into the registration form select
  async function populateISDCodes() {
    const select = document.getElementById("isdCode");
    if (!select) return;
    // Try to fetch a comprehensive country telephone dataset
    try {
      const res = await fetch(
        "https://cdn.jsdelivr.net/npm/country-telephone-data@0.6.7/countries.json"
      );
      if (!res.ok) throw new Error("Failed to fetch ISD list");
      const countries = await res.json();
      select.innerHTML = "";
      // Default option label
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Country Code";
      defaultOpt.disabled = true;
      select.appendChild(defaultOpt);
      countries
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.dialCode; // e.g., "+91"
          opt.textContent = `${c.name} (${c.dialCode})`;
          if (c.name === "India" || c.dialCode === "+91") opt.selected = true;
          select.appendChild(opt);
        });
    } catch (err) {
      console.warn("ISD list fetch failed, using fallback", err);
      // Fallback minimal list (includes India by default)
      const fallback = [
        { name: "India", dialCode: "+91" },
        { name: "United States", dialCode: "+1" },
        { name: "United Kingdom", dialCode: "+44" },
        { name: "Canada", dialCode: "+1" },
        { name: "Australia", dialCode: "+61" },
        { name: "United Arab Emirates", dialCode: "+971" },
        { name: "Singapore", dialCode: "+65" },
        { name: "Germany", dialCode: "+49" },
        { name: "France", dialCode: "+33" },
        { name: "Nepal", dialCode: "+977" },
        { name: "Bangladesh", dialCode: "+880" },
        { name: "Sri Lanka", dialCode: "+94" },
      ];
      select.innerHTML = "";
      fallback.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.dialCode;
        opt.textContent = `${c.name} (${c.dialCode})`;
        if (c.name === "India") opt.selected = true;
        select.appendChild(opt);
      });
    }
  }
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
    // Ensure ISD codes are populated when modal is present
    populateISDCodes();
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Enforce browser validation for required fields
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        const data = new FormData(form);
        // Generate an event_id for Meta Pixel / CAPI deduplication
        const eventId = `lead_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}`;
        data.append("fb_event_id", eventId);
        // Normalize combined phone: prepend ISD code if provided
        const isd = form.querySelector("#isdCode");
        const phone = form.querySelector("input[name='whatsapp']");
        if (isd && phone) {
          const code = isd.value || "";
          const val = phone.value || "";
          data.append("phone_full", `${code} ${val}`.trim());
        }
        data.append("timestamp", new Date().toISOString());

        if (!FORM_WEBHOOK_URL || FORM_WEBHOOK_URL.startsWith("REPLACE_")) {
          if (statusEl)
            statusEl.textContent =
              "Setup needed: add your form webhook URL in script.js";
          return;
        }

        try {
          if (submitBtn) submitBtn.disabled = true;
          if (statusEl) statusEl.textContent = "Submitting…";
          const res = await fetch(FORM_WEBHOOK_URL, {
            method: "POST",
            body: data,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          // Track Lead with the same event_id for dedup against CAPI
          try {
            const isdCode = isd && isd.value ? isd.value : "";
            if (window.fbq) {
              fbq(
                "track",
                "Lead",
                {
                  content_name: "Webinar Registration",
                  value: 0,
                  currency: "INR",
                  isd_code: isdCode,
                },
                { eventID: eventId }
              );
            }
          } catch (err) {
            console.warn("Pixel Lead tracking failed:", err);
          }
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
      if (!ENABLE_REMOTE_SCHEDULE || !SCRIPT_URL || SCRIPT_URL.startsWith("REPLACE_")) {
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
      console.warn("Schedule fetch skipped or failed, using fallback:", err);
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
