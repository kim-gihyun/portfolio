// app.js -- TENG Glove companion screen: the glove's key map + live voltages over Web Bluetooth.
//
// With the keyboard firmware, the GLOVE decides and types; it reports what it is doing on the
// state characteristic, and this page shows it (pad, tap count, the letter about to be typed).
// With the signals-only firmware there is no state characteristic, so the page runs the same
// detector itself (engine.js) just to light up the pad you tapped.
"use strict";
(() => {
  const E = window.Engine;
  const SERVICE = "6e7a0001-5eb7-4c6b-9a3d-2f0f1c9e7a10";
  const DATA = "6e7a0002-5eb7-4c6b-9a3d-2f0f1c9e7a10";
  const FCOL = ["#12A07F", "#0090D0", "#E0A100"];
  const PCOL = [0, 0, 0, 1, 1, 1, 2, 2, 2].map(f => FCOL[f]);
  const KEYS = ["abc", "def", "ghi", "jkl", "mno", "pqr", "stu", "vwx"];
  const A8 = ["y", "z", " ", "\b", "\r"];                  // 1 y, 2 z, 3 space, 4 delete, 5 enter
  const WIN_S = 4.0;
  const $ = id => document.getElementById(id);
  const clock = () => performance.now() / 1000;

  let det = new E.TapDetector(9);
  const wave = [];
  const litAt = new Array(9).fill(-9);
  let state = { pad: -1, count: 0 };   // what the glove says it is doing
  let hasState = false, typed = "", rateN = 0, rateHz = 0, rateT = clock();
  let device = null, wantConnected = false, lastPkt = null, wakeLock = null;

  // ---------------------------------------------------------------- incoming data
  function onData(event) {
    const dv = event.target.value, k = dv.getUint8(1), now = clock();
    if (k === 0) { onState(dv); return; }               // a key-state packet, not voltages
    const tPrev = lastPkt && now - lastPkt < 0.5 ? lastPkt : now - k / 250;
    lastPkt = now;
    for (let i = 0; i < k; i++) {
      const volts = [];
      for (let c = 0; c < 9; c++) volts.push(dv.getUint16(2 + i * 18 + c * 2, true) / 1000);
      const t = tPrev + (now - tPrev) * (i + 1) / k;
      for (const ev of det.process(t, volts))          // only used without the state channel
        if (!hasState && ev.kind === "press" && ev.conf >= E.CONF_MIN) litAt[ev.pad] = clock();
      wave.push([t, det.dev.slice()]);
      rateN++;
    }
    while (wave.length && wave[0][0] < now - WIN_S - 0.5) wave.shift();
  }

  // key state from the keyboard firmware: [seq][0][pad (255 none)][count][preview][committed]
  function onState(dv) {
    const pad = dv.getUint8(2), count = dv.getUint8(3), done = dv.getUint8(5);
    if (!hasState) { hasState = true; setStatus("connected · glove keyboard"); }
    if (done) {                                          // a letter or action was committed
      if (done === 8) typed = typed.slice(0, -1);
      else if (done === 13) typed += "\n";
      else typed += String.fromCharCode(done);
      typed = typed.slice(-120);
    }
    state = { pad: pad === 255 ? -1 : pad, count };
    if (pad !== 255) litAt[pad] = clock();
  }

  // ---------------------------------------------------------------- Bluetooth
  const setStatus = s => { $("status").textContent = s; };

  async function connect() {
    if (!navigator.bluetooth) { $("nobt").style.display = "block"; return; }
    if (device && device.gatt.connected) { disconnect(); return; }
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "TENG-Glove" }, { services: [SERVICE] }], optionalServices: [SERVICE] });
    } catch (e) { setStatus("no glove chosen"); return; }
    device.addEventListener("gattserverdisconnected", () => {
      if (wantConnected) { setStatus("link lost, reconnecting…"); openLink(2); } else resetButton();
    });
    wantConnected = true;
    openLink();
  }

  async function openLink(attempt = 1) {
    try {
      setStatus(attempt > 1 ? `reconnecting… (try ${attempt})` : "connecting…");
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(SERVICE);
      const data = await svc.getCharacteristic(DATA);
      data.addEventListener("characteristicvaluechanged", onData);
      await data.startNotifications();
      det = new E.TapDetector(9); lastPkt = null; hasState = false;
      setStatus("connected");
      $("connect").textContent = "Disconnect"; $("connect").classList.add("on");
      try { wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { /* optional */ }
    } catch (e) {
      if (wantConnected && attempt < 6) { setStatus(`connection failed, retrying (${attempt})…`); setTimeout(() => openLink(attempt + 1), 800 * attempt); }
      else { setStatus("could not connect: glove on? antenna on? laptop app closed?"); resetButton(); }
    }
  }

  function disconnect() {
    wantConnected = false;
    try { device.gatt.disconnect(); } catch (e) { /* gone */ }
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    setStatus("disconnected"); resetButton();
  }
  function resetButton() { $("connect").textContent = "Connect"; $("connect").classList.remove("on"); }

  // ---------------------------------------------------------------- key map
  const keyEls = [];
  function buildKeys() {
    for (let k = 0; k < 9; k++) {
      const el = document.createElement("div");
      el.className = "key" + (k === 8 ? " a8" : "");
      $("keys").appendChild(el); keyEls.push(el);
    }
  }

  const glyph = ch => ch === " " ? '<span class="sp"></span>' : ch === "\b" ? "⌫" : ch === "\r" ? "⏎" : ch;
  function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const x = p(a), y = p(b);
    return "rgb(" + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",") + ")";
  }

  function renderKeys(now) {
    for (let k = 0; k < 9; k++) {
      const el = keyEls[k], col = PCOL[k];
      const active = state.pad === k;
      const g = active ? 1 : Math.max(0, 1 - (now - litAt[k]) / 0.6) ** 1.5;
      const chars = k === 8 ? A8 : KEYS[k].split("");
      const sel = active ? (k === 8 ? Math.min(state.count, 5) - 1 : (state.count - 1) % 3) : -1;
      el.style.background = g > 0.02 ? mix("#FFFFFF", col, 0.28 * g) : "";
      el.style.borderColor = g > 0.02 ? mix("#D8D3CA", col, g) : "";
      el.classList.toggle("lit", active);
      const faulty = det.base && det.faulty[k];
      const html = `<span class="pin" style="color:${faulty ? "var(--red)" : col}">A${k}${faulty ? " ·  not biased" : ""}</span>` +
        (active ? `<span class="cnt">×${state.count}</span>` : "") +
        `<span class="chars">${chars.map((c, i) => `<span class="${i === sel ? "on" : ""}">${glyph(c)}</span>`).join("")}</span>`;
      if (el.innerHTML !== html) el.innerHTML = html;
    }
    let pend = "tap a pad";
    if (state.pad >= 0) {
      const c = state.pad === 8 ? A8[Math.min(state.count, 5) - 1] : KEYS[state.pad][(state.count - 1) % 3];
      const name = c === " " ? "space" : c === "\b" ? "delete" : c === "\r" ? "enter" : `“${c}”`;
      pend = `A${state.pad} ×${state.count} → ${name} · pause to keep it`;
    } else if (!hasState && device && device.gatt && device.gatt.connected) pend = "signals-only firmware: highlights taps, no typing";
    $("pend").textContent = pend;

    let live = "";
    if (state.pad >= 0 && state.pad < 8) live = KEYS[state.pad][(state.count - 1) % 3];
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, " ⏎ ");
    const html = esc(typed) + (live ? `<span class="live">${live}</span>` : "") + '<span class="caret"></span>';
    if ($("typed").innerHTML !== html) $("typed").innerHTML = html;
  }

  // ---------------------------------------------------------------- 9 voltage lanes
  const cv = $("sig"), ctx = cv.getContext("2d");
  let span = 0.4;
  function renderSignal() {
    const dpr = window.devicePixelRatio || 1;
    const laneH = 30, gap = 4, groupGap = 8;
    const h = 9 * laneH + 6 * gap + 2 * groupGap, w = cv.clientWidth;
    cv.style.height = h + "px";
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const lx = 30, lw = w - lx;
    const tR = wave.length ? wave[wave.length - 1][0] : 0, tL = tR - WIN_S;
    const ncol = Math.max(2, Math.floor(lw / 2));
    const cols = Array.from({ length: ncol }, () => new Array(9).fill(null));
    let peak = 0;
    for (const [t, d] of wave) {
      const j = Math.floor((t - tL) / WIN_S * ncol);
      if (j < 0 || j >= ncol) continue;
      for (let k = 0; k < 9; k++) {
        if (cols[j][k] === null || Math.abs(d[k]) > Math.abs(cols[j][k])) cols[j][k] = d[k];
        if (!det.faulty[k]) peak = Math.max(peak, Math.abs(d[k]));
      }
    }
    const target = Math.max(0.25, peak * 1.15);
    span += (target - span) * (target > span ? 0.5 : 0.03);
    for (let k = 0; k < 9; k++) {
      const y0 = k * (laneH + gap) + Math.floor(k / 3) * groupGap, mid = y0 + laneH / 2;
      ctx.fillStyle = "#F7F8F5"; ctx.fillRect(lx, y0, lw, laneH);
      ctx.fillStyle = PCOL[k]; ctx.font = "700 11px system-ui, sans-serif"; ctx.textBaseline = "middle";
      ctx.fillText(`A${k}`, 2, mid);
      if (!wave.length) continue;
      ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 1.6; ctx.lineJoin = ctx.lineCap = "round";
      ctx.beginPath();
      let started = false, last = 0;
      for (let j = 0; j < ncol; j++) {
        let v = cols[j][k];
        if (v === null) { if (!started) continue; v = last; }
        last = v;
        const x = lx + j / (ncol - 1) * lw, y = mid - Math.max(-1, Math.min(1, v / span)) * (laneH / 2 - 2);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- frame + demo
  function frame() {
    const now = clock();
    renderKeys(now);
    renderSignal();
    if (now - rateT >= 1) { rateHz = rateN / (now - rateT); rateN = 0; rateT = now; }
    $("rate").textContent = rateHz > 1 ? `${Math.round(rateHz)} Hz` : "";
    requestAnimationFrame(frame);
  }

  function demo() {                    // ?demo: a fake glove "types" hey, so the page can be checked
    setStatus("demo · synthetic glove"); hasState = true;
    const taps = [[2, 2], [1, 2], [8, 1]];  // h e y
    let t = clock(), when = t + 1, plan = [];
    taps.forEach(([pad, n]) => { for (let i = 0; i < n; i++) { plan.push([pad, when, i + 1]); when += 0.4; } plan.push([pad, when + 0.9, 0]); when += 1.6; });
    const lobes = plan.filter(p => p[2]).flatMap(([pad, tc]) => [[pad, tc, 0.8], [pad, tc + 0.14, -0.6]]);
    setInterval(() => {
      const now = clock();
      while (t < now) {
        const v = new Array(9).fill(0).map(() => 1.65 + (Math.random() - 0.5) * 0.008);
        for (const [k, tc, a] of lobes) { const g = a * Math.exp(-(((t - tc) / 0.025) ** 2)); for (let j = 0; j < 9; j++) v[j] += j === k ? g : 0.05 * g; }
        for (const ev of det.process(t, v)) { /* baseline only */ }
        wave.push([t, det.dev.slice()]); rateN++;
        t += 1 / 250;
      }
      while (wave.length && wave[0][0] < now - WIN_S - 0.5) wave.shift();
      while (plan.length && plan[0][1] <= now) {
        const [pad, , cnt] = plan.shift();
        if (cnt) { state = { pad, count: cnt }; litAt[pad] = clock(); }
        else {
          const c = pad === 8 ? A8[Math.min(state.count, 5) - 1] : KEYS[pad][(state.count - 1) % 3];
          typed += c === "\b" ? "" : c; state = { pad: -1, count: 0 };
        }
      }
    }, 20);
  }

  buildKeys();
  $("connect").addEventListener("click", connect);
  if (!navigator.bluetooth) $("nobt").style.display = "block";
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (location.search.includes("demo")) demo();
  requestAnimationFrame(frame);
})();
