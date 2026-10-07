// Scroll reveals and the feedback form. No frameworks, no trackers.
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
