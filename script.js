// Countdown to next Sunday at 3:30 PM local time
(function () {
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
})();
