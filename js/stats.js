// Your private numbers (stats.html). The key comes from the link the Sheet gives you
// (Rubidu > Show my stats link: stats.html#key=...), and is remembered on this device only.
(() => {
  const $ = (id) => document.getElementById(id);
  const ENDPOINT = (window.RUBIDU_FEEDBACK_ENDPOINT || "").trim();
  const keep = {
    get() { try { return localStorage.getItem("rubidu_stats_key") || ""; } catch { return ""; } },
    set(v) { try { localStorage.setItem("rubidu_stats_key", v); } catch { /* fine */ } },
  };
  // The key from the link (stats.html#key=...), then out of the address bar.
  const takeKey = () => {
    const k = new URLSearchParams(location.hash.slice(1)).get("key");
    if (k) { keep.set(k); history.replaceState(null, "", location.pathname); }
    return !!k;
  };
  takeKey();

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
  const NAMES = {
    "apple-silicon": "Apple silicon", intel: "Intel", "no-mac": "No Mac yet", unsure: "Not sure",
    talk: "Talking to the Mac", dictate: "Typing by voice", transcribe: "Transcribing", read: "Read aloud",
    hinglish: "Hinglish", privacy: "Nothing leaves the Mac",
    free: "Only if free", "once-299": "₹299 once", "once-999": "₹999 once", monthly: "Monthly",
  };

  function bars(id, pairs) {
    const ul = $(id);
    ul.replaceChildren();
    const list = pairs.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!list.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "Nothing yet"; ul.append(li); return; }
    const max = list[0][1];
    for (const [k, v] of list) {
      const li = document.createElement("li");
      const a = document.createElement("span"); a.textContent = NAMES[k] || k;
      const b = document.createElement("span"); b.textContent = fmt(v);
      const i = document.createElement("i"); i.style.width = `${Math.max(3, (v / max) * 100)}%`;
      li.append(a, b, i); ul.append(li);
    }
  }

  function chart(days) {
    const d = [...days].reverse();                               // oldest first
    const W = 600, H = 200, pad = 18, bw = (W - pad) / d.length;
    const max = Math.max(1, ...d.map((x) => x.views));
    const y = (v) => H - 22 - (v / max) * (H - 40);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const el = (tag, at, title) => {
      const e = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(at)) e.setAttribute(k, v);
      if (title) { const t = document.createElementNS(ns, "title"); t.textContent = title; e.append(t); }
      svg.append(e); return e;
    };
    d.forEach((x, i) => {
      const cx = pad + i * bw;
      const tip = `${x.day}: ${x.views} views, ${x.visitors} visitors, ${x.signups} joined`;
      el("rect", { x: cx + 1, y: y(x.views), width: bw - 3, height: H - 22 - y(x.views), rx: 3, fill: "var(--sunk)", stroke: "var(--line)" }, tip);
      el("rect", { x: cx + bw * 0.22, y: y(x.visitors), width: bw * 0.56 - 1, height: H - 22 - y(x.visitors), rx: 2, fill: "var(--accent)" }, tip);
      if (x.signups) el("circle", { cx: cx + bw / 2 - 1, cy: y(x.visitors) - 8, r: 4, fill: "#f59e0b" }, tip);
      if ((i % 7 === 0 && i < d.length - 4) || i === d.length - 1) {
        const t = el("text", { x: cx + bw / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" });
        t.textContent = x.day.slice(5);
      }
    });
    const top = el("text", { x: 2, y: 12, "font-size": 11, fill: "var(--muted)" });
    top.textContent = `${fmt(max)} views`;
    $("st-chart").replaceChildren(svg);
  }

  function show(s) {
    $("t-views").textContent = fmt(s.today.views);
    $("t-visitors").textContent = fmt(s.today.visitors);
    $("t-signups").textContent = fmt(s.today.signups);
    $("a-views").textContent = fmt(s.total.views);
    $("a-visitors").textContent = fmt(s.total.visitors);
    $("a-waitlist").textContent = fmt(s.total.waitlist);
    chart(s.days);
    bars("st-sources", s.sources);
    bars("st-devices", Object.entries(s.devices));
    bars("st-uses", Object.entries(s.waitlist.uses || {}));
    bars("st-pay", Object.entries(s.waitlist.pay || {}));
    bars("st-mac", Object.entries(s.waitlist.mac || {}));
    $("st-tz").textContent = s.timezone;
    $("st-updated").textContent = `updated ${new Date(s.generated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    $("st-body").hidden = false;
  }

  async function load() {
    const key = keep.get();
    $("st-key").hidden = !!key;
    if (!key) return;
    if (!ENDPOINT) { $("st-key").hidden = false; $("st-err").hidden = false; $("st-err").textContent = "The site has no backend address."; return; }
    $("st-loading").hidden = false;
    try {
      const r = await fetch(`${ENDPOINT}?kind=stats&key=${encodeURIComponent(key)}`);
      const s = await r.json();
      if (!s.ok) throw new Error(s.error === "key" ? "That key doesn't match. Copy the link from the Sheet again." : "No numbers came back.");
      show(s);
    } catch (e) {
      $("st-key").hidden = false;
      $("st-err").hidden = false;
      $("st-err").textContent = e.message && e.message.includes("key") ? e.message
        : "Couldn't reach the Sheet. Is the new Code.gs deployed? (feedback-backend/SETUP.md)";
    } finally {
      $("st-loading").hidden = true;
    }
  }

  $("st-key").addEventListener("submit", (ev) => {
    ev.preventDefault();
    keep.set($("st-key-in").value.trim());
    $("st-err").hidden = true;
    load();
  });
  $("st-refresh").addEventListener("click", load);
  addEventListener("hashchange", () => { if (takeKey()) { $("st-err").hidden = true; load(); } });
  load();
})();
