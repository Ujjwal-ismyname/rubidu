// Scroll reveals, the waitlist, the feedback form and a cookie-free visit counter. No frameworks,
// no cookies, no third-party trackers (what the counter sends: privacy.html#visits).
document.documentElement.classList.add("js");

// Reveal sections as they arrive, in order (motion with a reason: it paces the story).
(() => {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  els.forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 5) * 70}ms`);
    io.observe(el);
  });
})();

// Feedback form.
(() => {
  const form = document.getElementById("fb-form");
  const grid = document.getElementById("categories");

  const $ = (id) => document.getElementById(id);
  const msg = $("message"), email = $("email"), status = $("form-status"), send = $("send");
  msg.addEventListener("input", () => { $("count").textContent = msg.value.length; });

  const show = (id, on, field) => { $(id).hidden = !on; if (field) field.setAttribute("aria-invalid", on ? "true" : "false"); };
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  function validate() {
    const category = form.querySelector("input[name=category]:checked");
    const e = email.value.trim();
    const bad = {
      category: !category,
      message: msg.value.trim().length < 10,
      email: e !== "" && !validEmail(e),
    };
    show("err-category", bad.category);
    show("err-message", bad.message, msg);
    show("err-email", bad.email, email);
    const first = bad.category ? grid.querySelector("input") : bad.message ? msg : bad.email ? email : null;
    if (first) first.focus();
    return !first;
  }

  const endpoint = (window.RUBIDU_FEEDBACK_ENDPOINT || "").trim();
  if (!endpoint) {
    status.textContent = "The feedback inbox isn't connected yet. Check back very soon.";
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    status.className = "form-status";
    if (!validate()) return;
    if (!endpoint) { status.textContent = "The feedback inbox isn't connected yet. Check back very soon."; return; }
    const data = new URLSearchParams({
      category: form.querySelector("input[name=category]:checked").value,
      message: msg.value.trim(),
      role: $("role").value,
      email: email.value.trim(),
      website: $("website").value,   // honeypot: bots fill it, people never see it
      page: location.href.split("#")[0],
    });
    send.disabled = true; send.textContent = "Sending…";
    try {
      // Apps Script does not send CORS headers, so the reply is opaque: a resolved
      // fetch means it was delivered; only a network failure lands in catch.
      await fetch(endpoint, { method: "POST", mode: "no-cors", body: data });
      form.reset(); $("count").textContent = "0";
      status.classList.add("ok");
      status.textContent = "Thank you. It's in, filed under its topic. Send another any time.";
    } catch {
      status.classList.add("bad");
      status.textContent = "That didn't send. Check your connection and try again; your text is still here.";
    } finally {
      send.disabled = false; send.textContent = "Send feedback";
    }
  });
})();

// The face: eyes follow the pointer, it blinks, a click makes it grin. Real exchanges in the bubble.
(() => {
  const face = document.querySelector(".face");
  if (!face) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pupils = [...face.querySelectorAll(".pupil")];
  let px = 0, py = 0, queued = false;
  const look = () => {
    queued = false;
    const box = face.getBoundingClientRect(), k = 465 / box.width;
    for (const p of pupils) {
      const cx = box.left + (+p.getAttribute("cx")) / k, cy = box.top + 111 / k;
      const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, r = 34 * Math.min(1, d / 260);
      p.style.transform = `translate(${dx / d * r}px, ${dy / d * r}px)`;
    }
  };
  if (!reduce) {
    addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; if (!queued) { queued = true; requestAnimationFrame(look); } });
    setInterval(() => { face.classList.add("blink"); setTimeout(() => face.classList.remove("blink"), 200); }, 4000);
  }
  // Each pair is a real turn: what was said, and Rubidu's answer (from the app, 2026-10-08).
  const talk = [
    ["you", "mujhe ek joke sunao"], ["rubidu", "Why don't skeletons fight each other? They don't have the guts."],
    ["you", "I got the job today!"], ["rubidu", "Oh, that's amazing! You must be so excited."],
    ["you", "who won the last cricket world cup"], ["rubidu", "Do you want me to search the web for that?"],
    ["you", "find my resume pdf"], ["rubidu", "Here's your resume, in Downloads."],
  ];
  const bubble = document.querySelector(".bubble");
  let i = 0;
  const next = () => {
    i = (i + 1) % talk.length;
    bubble.classList.add("swap");
    setTimeout(() => {
      const [who, line] = talk[i];
      bubble.querySelector(".who").textContent = who;
      bubble.querySelector(".line").textContent = line;
      bubble.classList.toggle("rubidu", who === "rubidu");
      face.classList.toggle("happy", who === "rubidu");
      bubble.classList.remove("swap");
    }, 250);
  };
  if (!reduce) setInterval(next, 3200);
  document.querySelector(".face-btn").addEventListener("click", next);
})();

// Pick a face: the real styles and colours from the app, in a menu bar.
(() => {
  const out = document.getElementById("menubar-face");
  const buttons = document.querySelectorAll(".face-picker button");
  buttons.forEach((b) => b.addEventListener("click", () => {
    buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    const mouth = "‿_ᴥω";
    out.replaceChildren(...[...b.dataset.face].map((ch) => {
      const s = document.createElement(mouth.includes(ch) ? "i" : "b");
      s.textContent = ch;
      s.style.color = mouth.includes(ch) ? b.dataset.smile : b.dataset.eyes;
      return s;
    }));
  }));
  buttons[0]?.click();
})();

// Copy buttons.
document.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied. Now paste it in Rubidu"; b.classList.add("done"); }
  catch { b.textContent = "Couldn't copy here"; }
}));

// ------------------------------------------------------------------------------------------
// The backend: the same private Google Sheet as the feedback (website-private/feedback-backend).
const RUBIDU = window.RUBIDU_SITE || {};
const ENDPOINT = (window.RUBIDU_FEEDBACK_ENDPOINT || "").trim();
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: fine */ } },
};
const today = () => new Date().toLocaleDateString("en-CA");          // yyyy-mm-dd, the visitor's own day
const params = new URLSearchParams(location.search);
// Where a visitor came from: ?ref= / ?utm_source= first (Instagram's in-app browser sends no
// referrer), else the referring site, else "direct". Only a short name ever leaves the page.
// Kept for this tab's session, so a reload or a second page still credits the reel that sent them.
const source = (() => {
  let found = "";
  const tag = params.get("ref") || params.get("utm_source");
  if (tag) found = tag.toLowerCase().replace(/[^a-z0-9.\-]/g, "").slice(0, 40);
  else {
    try {
      const r = document.referrer && new URL(document.referrer).hostname;
      if (r && r !== location.hostname) found = r.replace(/^www\./, "");
    } catch { /* no referrer */ }
  }
  try {
    if (found) sessionStorage.setItem("rubidu_src", found);
    else found = sessionStorage.getItem("rubidu_src") || "";
  } catch { /* storage off: fine */ }
  return found || "direct";
})();

// Visits: counted only on the real site, never for Do Not Track / Global Privacy Control, and
// never for the owner (open the site once with ?me to stop counting yourself; ?me=off undoes it).
(() => {
  if (params.has("me")) store.set("rubidu_notrack", params.get("me") === "off" ? "" : "1");
  const optOut = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  if (!RUBIDU.countVisits || !ENDPOINT || optOut || store.get("rubidu_notrack") === "1") return;
  if (location.hostname !== RUBIDU.countOn) return;
  const ua = navigator.userAgent;
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;      // iPadOS says "Macintosh"
  const device = /iPhone/.test(ua) ? "iphone" : (/iPad/.test(ua) || touchMac) ? "ipad" : /Android/.test(ua) ? "android"
    : /Macintosh/.test(ua) ? "mac" : /Windows/.test(ua) ? "windows" : /Linux|X11/.test(ua) ? "linux" : "other";
  const fresh = store.get("rubidu_day") !== today();
  store.set("rubidu_day", today());
  const body = new URLSearchParams({ kind: "hit", path: location.pathname, source, device, new: fresh ? "1" : "0" });
  if (!(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body))) {
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body, keepalive: true }).catch(() => {});
  }
})();

// Prices in the visitor's own money: India rupees, the UK pounds, the rest of Europe euros, everyone
// else dollars. The time zone decides (a browser set to British English in Delhi or New York is
// common); the language only when the time zone says nothing. Nothing is looked up online.
const CURRENCY = (() => {
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* old browser */ }
  if (/^Asia\/(Kolkata|Calcutta)$/.test(tz)) return "INR";
  if (/^Europe\/(London|Belfast|Jersey|Guernsey|Isle_of_Man)$/.test(tz)) return "GBP";
  if (tz.startsWith("Europe/")) return "EUR";
  if (tz && !/^(UTC|Etc\/|GMT)/.test(tz)) return "USD";
  const lang = (navigator.languages || [navigator.language || ""]).join(" ");
  if (/-IN\b/i.test(lang)) return "INR";
  if (/-GB\b/i.test(lang)) return "GBP";
  if (/\b(de|fr|es|it|nl|pt-PT|fi|el|sk|sl|et|lv|lt)\b/i.test(lang)) return "EUR";
  return "USD";
})();
(() => {
  const table = (RUBIDU.prices || {})[CURRENCY];
  if (!table) return;
  document.querySelectorAll("[data-tpl]").forEach((el) => {
    el.textContent = el.dataset.tpl.replace(/\{([\w-]+)\}/g, (m, k) => table[k] || m);
  });
})();

// The waitlist.
(() => {
  const form = document.getElementById("wl-form");
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const email = $("wl-email"), send = $("wl-send"), status = $("wl-status"), done = $("wl-done");
  const label = send.textContent;
  const validEmail = (v) => /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/.test(v);
  let token = "";

  // How many are waiting: shown once it is a number worth showing.
  const showCount = (n) => {
    if (!(n >= (RUBIDU.showCountFrom || 25))) return;
    $("wl-n").textContent = n.toLocaleString("en-IN");
    $("wl-count").hidden = false;
  };
  if (ENDPOINT) {
    fetch(`${ENDPOINT}?kind=count`).then((r) => r.json()).then((d) => showCount(d.waitlist)).catch(() => {});
  }

  const joined = (position, already) => {
    form.hidden = true;
    done.hidden = false;
    $("wl-pos").textContent = position ? (already ? `Still #${position}.` : `#${position} on the list.`) : "";
    document.querySelector(".face")?.classList.add("happy");
    store.set("rubidu_joined", "1");
    document.getElementById("wl-pill")?.classList.remove("show");
    done.focus({ preventScroll: true });
  };

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    status.className = "form-status"; status.textContent = "";
    const value = email.value.trim();
    const bad = !validEmail(value);
    $("wl-err").hidden = !bad; email.setAttribute("aria-invalid", bad ? "true" : "false");
    if (bad) { email.focus(); return; }
    if (!ENDPOINT) { status.textContent = "The waitlist opens in a moment. Try again soon."; return; }
    const body = new URLSearchParams({ kind: "waitlist", email: value,
      source, page: location.href.split("#")[0], website: $("wl-website").value });
    send.disabled = true; send.textContent = "Joining…";
    try {
      let r;
      try {
        r = await fetch(ENDPOINT, { method: "POST", body });
      } catch {
        // The reply could not be read (a browser quirk) or the network is down. Send it the way
        // the feedback form does: delivered if online, just without the place in line.
        await fetch(ENDPOINT, { method: "POST", mode: "no-cors", body });
        $("wl-more").hidden = true;
        joined(0, false);
        return;
      }
      let d = null;
      try { d = await r.json(); } catch { /* an old backend answers in plain text */ }
      if (d && d.ok) { token = d.token || ""; showCount(d.waitlist); joined(d.position, d.already); }
      else if (d && d.error === "email") { $("wl-err").hidden = false; email.focus(); }
      else if (d && d.error === "busy") { status.classList.add("bad"); status.textContent = "Lots of people at once. Try again in a minute."; }
      else { status.classList.add("bad"); status.textContent = "The waitlist isn't open yet. Try again later today."; }
    } catch {
      status.classList.add("bad");
      status.textContent = "That didn't go through. Check your connection and try again.";
    } finally {
      send.disabled = false; send.textContent = label;
    }
  });

  $("wl-more").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const more = ev.currentTarget, st = $("wl-more-status");
    const pick = (name) => [...more.querySelectorAll(`input[name=${name}]:checked`)].map((i) => i.value).join(",");
    const body = new URLSearchParams({ kind: "waitlist_more", token, mac: pick("mac"), uses: pick("uses"), pay: pick("pay"),
      currency: (RUBIDU.prices || {})[CURRENCY] ? CURRENCY : "INR" });
    if (!body.get("mac") && !body.get("uses") && !body.get("pay")) { st.textContent = "Tap an answer or two first."; return; }
    $("wl-more-send").disabled = true;
    try {
      await fetch(ENDPOINT, { method: "POST", mode: "no-cors", body });
      more.querySelectorAll("fieldset, #wl-more-send, .wl-more-h").forEach((el) => { el.hidden = true; });
      st.className = "form-status ok"; st.textContent = RUBIDU.thanks || "Thank you.";
    } catch {
      st.className = "form-status bad"; st.textContent = "That didn't send. Try again?";
      $("wl-more-send").disabled = false;
    }
  });

  $("wl-share").addEventListener("click", async (ev) => {
    const b = ev.currentTarget, url = RUBIDU.shareUrl || location.origin + location.pathname;
    try {
      if (navigator.share) await navigator.share({ title: "Rubidu", text: RUBIDU.shareText, url });
      else { await navigator.clipboard.writeText(url); b.textContent = "Link copied"; }
    } catch { /* they closed the share sheet */ }
  });

  // The button that follows you down: after the top of the page, gone near the waitlist,
  // the feedback form and the footer, and for good once you've joined.
  const pill = document.getElementById("wl-pill");
  if (!pill || !("IntersectionObserver" in window)) return;
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen.set(e.target, e.isIntersecting);
    const hero = seen.get(document.querySelector(".hero"));
    const near = [...seen].some(([el, on]) => on && el !== document.querySelector(".hero"));
    pill.classList.toggle("show", hero === false && !near && store.get("rubidu_joined") !== "1");
  }, { threshold: 0 });
  [".hero", "#waitlist", "#feedback", ".footer"].forEach((q) => { const el = document.querySelector(q); if (el) io.observe(el); });
})();
