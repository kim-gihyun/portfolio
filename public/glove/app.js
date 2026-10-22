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
  // What each pad gives, index = taps - 1 (as PADS in the firmware). \b delete, \x0e language.
  const LAY = [
    ["abc", "def", "ghi\b", "jkl", "mno", "pqr", "stu", "vwx", "yz \x0e"].map(s => [...s]),
    [["ㅣ"], ["ㆍ"], ["ㅡ", "\b"], ["ㄱ", "ㅋ", "ㄲ"], ["ㄴ", "ㄹ", "ㅇ", "ㅁ"], ["ㄷ", "ㅌ", "ㄸ"],
     ["ㅂ", "ㅍ", "ㅃ"], ["ㅅ", "ㅎ", "ㅆ"], ["ㅈ", "ㅊ", " ", "\x0e"]],
  ];
  // Cursor mode (hold A4 1 s): the pads as a D-pad, each tap acts at once.
  const CURSOR = ["back", "↑", "page ↑", "←", "select", "→", "⌨ typing", "↓", "page ↓"];
  const MOUSE = ["right-click", "↑", "scroll ↑", "←", "click", "→", "⌨ typing", "↓", "scroll ↓"];
  LAY.push(LAY[0]);                       // 中文: pinyin on the English pads
  const isAction = c => c === "\b" || c === "\x0e";
  function selIndex(lang, pad, count) {
    const row = LAY[lang][pad];
    if (lang === 1 && pad === 2) return count >= 4 ? 1 : 0;          // ㅡ: taps 1-3, ⌫ at 4
    return isAction(row[row.length - 1]) ? Math.min(count, row.length) - 1 : (count - 1) % row.length;
  }
  const WIN_S = 4.0;
  const $ = id => document.getElementById(id);
  const clock = () => performance.now() / 1000;

  let det = new E.TapDetector(9);
  const wave = [];
  const litAt = new Array(9).fill(-9);
  let state = { pad: -1, count: 0, lang: 0, cursor: false, strokes: "" };   // what the glove is doing
  let lastMove = "";                       // the last cursor-mode action, for the status line
  const text = new Hangul.Composer();      // mirrors the phone's text, Korean syllables included
  let hasState = false, rateN = 0, rateHz = 0, rateT = clock();
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

  // key state from the keyboard firmware:
  //   [seq][0][pad (255 none)][count][preview][committed key][language][5 bytes vowel strokes]
  function onState(dv) {
    const pad = dv.getUint8(2), count = dv.getUint8(3), done = dv.getUint8(5);
    const mode = dv.byteLength > 6 ? dv.getUint8(6) : 0, lang = mode & 3, cursor = !!(mode & 4), mouse = !!(mode & 8);   // lang 0 English, 1 Korean, 2 Chinese
    let strokes = "";
    for (let i = 7; i < Math.min(12, dv.byteLength); i++) { const b = dv.getUint8(i); if (b) strokes += String.fromCharCode(b); }
    if (!hasState) { hasState = true; setStatus("connected · glove keyboard"); }
    if (done === 8) text.backspace();                    // the key the glove just pressed
    else if (done === 13) text.raw("\n");
    else if (done >= 14 && done <= 18) { text.flush(); lastMove = ""; }   // language / cursor mode
    else if (done >= 0x80) { const k = done & 0x0f; litAt[k] = clock(); lastMove = (done >= 0x90 ? MOUSE : CURSOR)[k]; }
    else if (done) { const c = String.fromCharCode(done); if (lang === 1 && c !== " ") text.key(c); else text.raw(c); }
    if (strokes.length > state.strokes.length)           // ㅣ ㆍ never become a "pad" state
      litAt[{ "|": 0, ".": 1, "-": 2 }[strokes[strokes.length - 1]]] = clock();
    state = { pad: pad === 255 ? -1 : pad, count, lang, cursor, mouse, strokes };
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

  const glyph = ch => ch === " " ? '<span class="sp"></span>' : ch === "\b" ? "⌫" :
    ch === "\x0e" ? ["한", "中", "A"][state.lang] : ch;   // the next language
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
      const nav = state.cursor || state.mouse;
      const chars = state.mouse ? [MOUSE[k]] : state.cursor ? [CURSOR[k]] : LAY[state.lang][k];
      const sel = active && !nav ? selIndex(state.lang, k, state.count) : -1;
      el.style.background = g > 0.02 ? mix("#FFFFFF", col, 0.28 * g) : "";
      el.style.borderColor = g > 0.02 ? mix("#D8D3CA", col, g) : "";
      el.classList.toggle("lit", active);
      const faulty = det.base && det.faulty[k];
      const html = `<span class="pin" style="color:${faulty ? "var(--red)" : col}">A${k}${faulty ? " ·  not biased" : ""}</span>` +
        (active ? `<span class="cnt">×${state.count}</span>` : "") +
        `<span class="chars">${chars.map((c, i) => `<span class="${i === sel ? "on" : ""}">${glyph(c)}</span>`).join("")}</span>` +
        (nav ? "" : k === 8 ? '<span class="hold">hold 1 s = enter</span>' :
          state.lang === 2 ? `<span class="hold">hold = ${k + 1}</span>` :      // 中文: pick suggestion N
          k === 4 ? '<span class="hold">hold 1 s = cursor</span>' :
          k === 2 ? '<span class="hold">hold = phone lang +1</span>' : "");
      el.classList.toggle("nav", nav);
      if (el.innerHTML !== html) el.innerHTML = html;
    }
    let pend = "tap a pad", live = "";
    const vowel = Hangul.STROKES[state.strokes] || "";
    if (state.pad >= 0) {
      const c = LAY[state.lang][state.pad][selIndex(state.lang, state.pad, state.count)];
      const name = c === " " ? "space" : c === "\b" ? "delete" : c === "\x0e" ? "switch language" : `“${c}”`;
      pend = `A${state.pad} ×${state.count} → ${name} · pause to keep it`;
      if (!isAction(c) && c !== " ") live = c;
    } else if (state.strokes) {
      const name = { "|": "ㅣ", ".": "ㆍ", "-": "ㅡ" };
      pend = [...state.strokes].map(x => name[x]).join(" + ") + (vowel ? ` = ${vowel}` : " …");
    } else if (!hasState && device && device.gatt && device.gatt.connected) pend = "signals-only firmware: highlights taps, no typing";
    if (state.cursor || state.mouse) pend = lastMove ? `→ ${lastMove}` : "arrow keys · A6 or hold A4 = typing";
    $("pend").textContent = pend;
    $("lang").textContent = state.mouse ? "Mouse" : state.cursor ? "Cursor" : ["English", "한국어 천지인", "中文 拼音"][state.lang];

    if (state.strokes) live = (vowel || "ㆍ") + live;    // the vowel still being built
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, " ⏎ ");
    const html = esc([...text.text()].slice(-120).join("")) + (live ? `<span class="live">${live}</span>` : "") + '<span class="caret"></span>';
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

  // ?demo: a fake glove types "hi", switches to Korean and types 안녕, by sending the same
  // state packets the firmware sends, so the real parsing path is what gets exercised.
  function demo() {
    setStatus("demo · synthetic glove");
    // [pad (-1 none), count, committed key, language, vowel strokes]
    const S = [[2, 1, "", 0, ""], [2, 2, "", 0, ""], [-1, 0, "h", 0, ""], [2, 1, "", 0, ""], [2, 2, "", 0, ""], [2, 3, "", 0, ""],
      [-1, 0, "i", 0, ""], [8, 1, "", 0, ""], [8, 2, "", 0, ""], [8, 3, "", 0, ""], [8, 4, "", 0, ""], [-1, 0, 14, 1, ""],
      [4, 1, "", 1, ""], [4, 2, "", 1, ""], [4, 3, "", 1, ""], [-1, 0, "d", 1, ""], [-1, 0, "", 1, "|"], [-1, 0, "", 1, "|."],
      [4, 1, "", 1, "|."], [-1, 0, "k", 1, ""], [-1, 0, "s", 1, ""], [4, 1, "", 1, ""], [-1, 0, "s", 1, ""],
      [-1, 0, "", 1, "."], [-1, 0, "", 1, ".."], [-1, 0, "", 1, "..|"], [4, 1, "", 1, "..|"], [4, 2, "", 1, "..|"],
      [4, 3, "", 1, "..|"], [-1, 0, "u", 1, ""], [-1, 0, "d", 1, ""],
      [4, 1, "", 1, ""], [-1, 0, 15, 5, ""], [-1, 0, 0x87, 5, ""], [-1, 0, 0x87, 5, ""], [-1, 0, 0x84, 5, ""]];
    const packet = ([pad, count, key, lang, st]) => {
      const b = new Uint8Array(12);
      b[2] = pad < 0 ? 255 : pad; b[3] = count; b[5] = typeof key === "number" ? key : key ? key.charCodeAt(0) : 0;
      b[6] = lang; [...st].forEach((c, i) => { b[7 + i] = c.charCodeAt(0); });
      return new DataView(b.buffer);
    };
    const isTap = s => s[0] >= 0 || (s[4] && !s[2]) || s[2] >= 0x80;   // pad tap, stroke, or D-pad tap
    const padOf = s => s[0] >= 0 ? s[0] : s[2] >= 0x80 ? s[2] - 0x80 : { "|": 0, ".": 1, "-": 2 }[s[4][s[4].length - 1]];
    let t = clock(), when = t + 1;
    const plan = S.map(s => { const at = when; when += isTap(s) ? 0.45 : s[2] === 15 ? 0.8 : 0.15; return [at, s]; });
    const lobes = plan.filter(([, s]) => isTap(s)).flatMap(([tc, s]) =>
      [[padOf(s), tc, 0.8], [padOf(s), tc + 0.14, -0.6]]);
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
      while (plan.length && plan[0][0] <= now) onState(packet(plan.shift()[1]));
    }, 20);
  }

  buildKeys();
  $("connect").addEventListener("click", connect);
  if (!navigator.bluetooth) $("nobt").style.display = "block";
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (location.search.includes("demo")) demo();
  requestAnimationFrame(frame);
})();
