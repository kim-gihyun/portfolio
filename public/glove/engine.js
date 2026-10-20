// engine.js -- the TENG glove's brain, shared by the phone app (and testable in Node).
//
//   TapDetector  port of tap_detect.py, set up for the XIAO board (pads rest at 1.65 V)
//   Cheonjiin    port of hangul.py (Korean 천지인 composition)
//   Predictor    port of predict.py (word suggestions; learned words kept in storage)
//   Typist       the multi-tap keyboard rules of tap_dashboard.py, incl. long-press pick

"use strict";

// ---------------------------------------------------------------- TapDetector
const D = {
  SLOPE_REL: 5.0, HUM_W: 0.040, CMR: true,
  WEAK_FLOOR: 0.08, PAIR_GAP_MIN: 0.05, CONFIRM_V: 0.25, PAIR_GAP_MAX: 0.25,
  PAIR_SUM: 0.20, P_MAX_S: 0.30,
  FLOOR_FRAC: 0.25, FLOOR_MIN: 0.15, FLOOR_MAX: 1.00, REF_TAU: 6.0, REF_DECAY_S: 4.0,
  REFRACTORY_S: 0.22, RING_FRAC: 0.35, RING_S: 0.25,
  HOLD_MAX_S: 20.0, LONG_PRESS_S: 0.60,
  INIT_N: 64, BASE_TAU: 1.0, QUIET_V: 0.25,
  VBIAS: 1.65, VBIAS_TOL: 0.50, VMIN: -0.1, VMAX: 3.4,
};

class TapDetector {
  constructor(n = 9) {
    this.n = n;
    this.base = null; this.seed = [];
    this.dev = new Array(n).fill(0); this.slope = new Array(n).fill(0);
    this.prevD = null; this.faulty = new Array(n).fill(false); this.tPrev = null;
    const z = () => new Array(n).fill(0);
    this.pOn = new Array(n).fill(false); this.pPk = z(); this.pT0 = z(); this.pSl = z();
    this.pLast = new Array(n).fill(-1e9); this.pLastPk = z();
    this.refPk = new Array(n).fill(D.FLOOR_MIN / D.FLOOR_FRAC);
    this.pressT = new Array(n).fill(-9.9);
    this.hq = []; this.hs = z(); this.tent = new Array(n).fill(null);
    this.held = new Array(n).fill(false); this.heldT = z();
    this.pending = [];
  }

  floor(k) { return Math.min(D.FLOOR_MAX, Math.max(D.FLOOR_MIN, D.FLOOR_FRAC * this.refPk[k])); }

  dehum(t, v) {
    const q = this.hq, s = this.hs;
    q.push([t, v]);
    for (let k = 0; k < this.n; k++) s[k] += v[k];
    while (t - q[0][0] >= D.HUM_W) {
      const old = q.shift()[1];
      for (let k = 0; k < this.n; k++) s[k] -= old[k];
    }
    return s.map(x => x / q.length);
  }

  process(t, vals) {                       // returns events (often empty)
    this.tNow = t;                         // the typist measures holds on this clock
    for (const x of vals) if (x < D.VMIN || x > D.VMAX) return [];
    const v = this.dehum(t, vals);
    if (this.base === null) {
      this.seed.push(v); this.tPrev = t;
      if (this.seed.length < D.INIT_N) return [];
      this.base = [];
      for (let k = 0; k < this.n; k++) {
        const c = this.seed.map(r => r[k]).sort((a, b) => a - b);
        this.base.push(c[Math.floor(c.length / 2)]);
      }
      this.seed = [];
      return [];
    }
    let dt = t - this.tPrev;
    if (dt <= 0 || dt > 0.5) dt = 0.002;
    this.tPrev = t;
    let raw = v.map((x, k) => x - this.base[k]);
    if (D.CMR && this.n >= 5) {
      const ok = raw.filter((_, k) => !this.faulty[k]).sort((a, b) => a - b);
      if (ok.length >= 5) { const cm = ok[Math.floor(ok.length / 2)]; raw = raw.map(r => r - cm); }
    }
    const d = raw;
    this.dev = d;
    if (this.prevD === null) this.prevD = d.slice();
    this.slope = d.map((x, k) => (x - this.prevD[k]) / dt);
    this.prevD = d.slice();
    this.faulty = this.base.map(b => Math.abs(b - D.VBIAS) > D.VBIAS_TOL);
    const r0 = D.FLOOR_MIN / D.FLOOR_FRAC;
    for (let k = 0; k < this.n; k++) {
      if (this.faulty[k]) continue;
      if (!this.pOn[k] && Math.abs(d[k]) < D.QUIET_V) {
        this.base[k] += raw[k] * Math.min(1, dt / D.BASE_TAU);
        this.refPk[k] += (r0 - this.refPk[k]) * Math.min(1, dt / D.REF_DECAY_S);
      }
      this.pulse(k, t, d[k]);
      if (this.held[k] && t - this.heldT[k] > D.HOLD_MAX_S) this.held[k] = false;
    }
    const out = this.pending; this.pending = [];
    return out;
  }

  pulse(k, t, dv) {
    const a = Math.abs(dv), sl = Math.abs(this.slope[k]);
    if (!this.pOn[k]) {
      if (a >= D.WEAK_FLOOR) { this.pOn[k] = true; this.pPk[k] = dv; this.pT0[k] = t; this.pSl[k] = sl; }
      return;
    }
    if (sl > this.pSl[k]) this.pSl[k] = sl;
    if ((dv >= 0) !== (this.pPk[k] >= 0) && a >= D.WEAK_FLOOR) {
      this.close(k, t);
      this.pOn[k] = true; this.pPk[k] = dv; this.pT0[k] = t; this.pSl[k] = sl;
      return;
    }
    if (a > Math.abs(this.pPk[k])) this.pPk[k] = dv;
    if (a < 0.5 * D.WEAK_FLOOR || t - this.pT0[k] > D.P_MAX_S) { this.close(k, t); this.pOn[k] = false; }
  }

  close(k, t) {
    const pk = this.pPk[k], a = Math.abs(pk);
    if (a < D.WEAK_FLOOR) return;
    if (this.pSl[k] < D.SLOPE_REL * a) return;
    if (t - this.pLast[k] < D.RING_S && a < D.RING_FRAC * Math.abs(this.pLastPk[k])) return;
    const isPress = pk > 0;                     // PRESS_POL = +1 on every pad
    const strong = a >= Math.max(this.floor(k), D.CONFIRM_V);
    if (isPress) {
      this.tent[k] = null;
      if (strong) this.press(k, t, pk, true); else this.tent[k] = [t, pk];
      return;
    }
    const tp = this.tent[k]; this.tent[k] = null;
    if (tp && t - tp[0] >= D.PAIR_GAP_MIN && t - tp[0] <= D.PAIR_GAP_MAX && a + Math.abs(tp[1]) >= D.PAIR_SUM)
      this.press(k, tp[0], tp[1], false);
    if (this.held[k]) this.release(k, t, pk);
  }

  press(k, t, pk, strong) {
    this.pLast[k] = t; this.pLastPk[k] = pk;
    if (strong) this.refPk[k] += (Math.abs(pk) - this.refPk[k]) / D.REF_TAU;
    if (this.held[k] && t - this.heldT[k] <= D.HOLD_MAX_S && t - this.pressT[k] < D.REFRACTORY_S) return;
    this.held[k] = true; this.heldT[k] = t; this.pressT[k] = t;
    let runner = 0;
    for (let j = 0; j < this.n; j++) if (j !== k && !this.faulty[j]) runner = Math.max(runner, Math.abs(this.dev[j]));
    const conf = Math.max(0, 1 - Math.min(1, runner / Math.max(Math.abs(pk), 1e-9)));
    this.pending.push({ kind: "press", pad: k, t: this.pT0[k], peak: pk, conf });
  }

  release(k, t, pk) {
    this.pLast[k] = t; this.pLastPk[k] = pk;
    const hold = t - this.heldT[k];
    this.held[k] = false;
    this.pending.push({ kind: "release", pad: k, t, hold, long: hold >= D.LONG_PRESS_S });
  }
}

// ---------------------------------------------------------------- Cheonjiin
const LEAD = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const VOWEL = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const TAIL = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
const STROKE = { "ㅣ": "I", "ㆍ": "D", "ㅡ": "E" };
const VOWEL_SEQ = {
  I: "ㅣ", E: "ㅡ", ID: "ㅏ", IDD: "ㅑ", DI: "ㅓ", DDI: "ㅕ", DE: "ㅗ", DDE: "ㅛ", ED: "ㅜ", EDD: "ㅠ",
  IDI: "ㅐ", IDDI: "ㅒ", DII: "ㅔ", DDII: "ㅖ", EI: "ㅢ", DEI: "ㅚ", DEID: "ㅘ", DEIDI: "ㅙ",
  EDI: "ㅟ", EDDI: "ㅝ", EDDII: "ㅞ",
};
const TAIL_MERGE = {
  "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ",
  "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ",
};

function compose(lead, vowel, tail) {
  if (lead && vowel && LEAD.includes(lead) && VOWEL.includes(vowel)) {
    const ti = tail && TAIL.includes(tail) ? TAIL.indexOf(tail) : 0;
    return String.fromCharCode(0xAC00 + (LEAD.indexOf(lead) * 21 + VOWEL.indexOf(vowel)) * 28 + ti);
  }
  return (lead || "") + (vowel || "") + (tail || "");
}

class Cheonjiin {
  constructor() { this.reset(); }
  reset() { this.committed = ""; this.lead = ""; this.strokes = ""; this.tail = ""; }
  vowel() { return VOWEL_SEQ[this.strokes] || ""; }
  pending() { return compose(this.lead, this.vowel(), this.tail); }
  text() { return this.committed + this.pending(); }
  flush() { const p = this.pending(); if (p) this.committed += p; this.lead = this.strokes = this.tail = ""; }
  feed(j) {
    if (STROKE[j]) this.stroke(STROKE[j]);
    else if (j === " ") { this.flush(); this.committed += " "; }
    else this.consonant(j);
  }
  backspace() {
    if (this.tail) this.tail = this.tail.length > 1 ? this.tail[0] : "";
    else if (this.strokes) this.strokes = this.strokes.slice(0, -1);
    else if (this.lead) this.lead = "";
    else if (this.committed) this.committed = this.committed.slice(0, -1);
  }
  stroke(s) {
    if (this.tail) {                       // the tail was really the next syllable's lead
      const moved = this.tail.slice(-1);
      this.tail = this.tail.slice(0, -1);
      this.flush();
      this.lead = moved;
    }
    const cand = this.strokes + s;
    if (VOWEL_SEQ[cand] || Object.keys(VOWEL_SEQ).some(k => k.startsWith(cand))) this.strokes = cand;
    else { this.flush(); this.strokes = s; }
  }
  consonant(c) {
    if (!this.strokes) { if (this.lead) this.flush(); this.lead = c; return; }
    if (!this.tail) { if (TAIL.includes(c)) this.tail = c; else { this.flush(); this.lead = c; } return; }
    const m = TAIL_MERGE[this.tail + c];
    if (m) this.tail = m; else { this.flush(); this.lead = c; }
  }
}

// ---------------------------------------------------------------- Predictor
const COMMON = (`the be to of and a in that have i it for not on with he as you do at this but his
by from they we say her she or an will my one all would there their what so up out
if about who get which go me when make can like time no just him know take people
into year your good some could them see other than then now look only come its over
think also back after use two how our work first well way even new want because any
these give day most us is are was were been has had did does said made came went
know knew take took see saw get got give gave find found tell told become became
show showed leave left feel felt put keep let begin seem help talk turn start might
move like live believe hold bring happen write provide sit stand lose pay meet
include continue set learn change lead understand watch follow stop create speak
read allow add spend grow open walk win offer remember love consider appear buy wait
serve die send expect build stay fall cut reach kill remain suggest raise pass sell
require report decide pull man woman child world school state family student group
country problem hand part place case week company system program question work
government number night point home water room mother area money story fact month lot
right study book eye job word business issue side kind head house service friend
father power hour game line end member law car city community name president team
minute idea kid body information back parent face others level office door health
person art war history party result change morning reason research girl guy moment
air teacher force education foot boy age policy process music market sense nation
plan college interest death experience effect use class control care field
development role effort rule area image son hope view course company center
project activity star table need room today never always often sometimes maybe
please thank sorry hello yes okay really very much many more less big small long
short high low old young new last next same different early late hard easy`).split(/\s+/);

class Predictor {
  constructor(store) {
    this.store = store;                     // { get(), set(obj) } or null
    this.freq = {};
    COMMON.forEach((w, i) => { this.freq[w] = COMMON.length - i; });
    let user = {};
    try { user = (store && store.get()) || {}; } catch (e) { user = {}; }
    this.user = user;
    for (const [w, c] of Object.entries(user)) this.freq[w] = (this.freq[w] || 0) + c * 500;
  }
  learn(word) {
    const w = (word || "").toLowerCase().trim();
    if (w.length < 2 || !/^[a-z']+$/.test(w)) return;
    this.freq[w] = (this.freq[w] || 0) + 500;
    this.user[w] = (this.user[w] || 0) + 1;
    try { this.store && this.store.set(this.user); } catch (e) { /* storage unavailable */ }
  }
  suggest(prefix, n = 3) {
    const p = (prefix || "").toLowerCase();
    if (!p) return [];
    return Object.entries(this.freq)
      .filter(([w]) => w.startsWith(p) && w !== p)
      .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || (a[0] < b[0] ? -1 : 1))
      .slice(0, n).map(([w]) => w);
  }
}

function currentWord(text) { const m = /[A-Za-z']+$/.exec(text); return m ? m[0] : ""; }

// ---------------------------------------------------------------- Typist
const LAYOUT_EN = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR", "STU", "VWX", "YZ "];
const MAXT_EN = [3, 3, 3, 3, 3, 3, 3, 3, 5];
const LAYOUT_KO = ["ㅣ", "ㆍ", "ㅡ", "ㄱㅋㄲ", "ㄴㄹㅇㅁ", "ㄷㅌㄸ", "ㅂㅍㅃ", "ㅅㅎㅆ", "ㅈㅊ "];
const MAXT_KO = [1, 1, 1, 3, 4, 3, 3, 3, 5];
const SELECT_PADS = [0, 1, 2], ACTION_PAD = 8, ACT_DELETE = 4, ACT_MODE = 5;
const GAP = 0.60, CONF_MIN = 0.45;

class Typist {
  constructor(predictor) {
    this.pred = predictor; this.ko = new Cheonjiin();
    this.mode = "EN"; this.out = ""; this.suggestions = [];
    this.groupPad = null; this.groupCount = 0; this.lastTap = 0;
    this.longFired = new Array(9).fill(false); this.pickedAt = 0; this.modeAt = 0;
  }
  layout() { return this.mode === "KO" ? LAYOUT_KO : LAYOUT_EN; }
  maxt() { return this.mode === "KO" ? MAXT_KO : MAXT_EN; }
  letterFor(pad, count) {
    if (pad === ACTION_PAD && count >= ACT_DELETE) return "";
    const row = this.layout()[pad];
    return row[Math.min(Math.max(count, 1), row.length) - 1];
  }
  text() { return this.mode === "KO" ? this.out + this.ko.text() : this.out; }
  pendingLabel() {
    if (this.groupPad === null) return "";
    const p = this.groupPad, c = this.groupCount;
    if (p === ACTION_PAD && c >= ACT_MODE) return `A${p} ×${c} → 한/영`;
    if (p === ACTION_PAD && c === ACT_DELETE) return `A${p} ×${c} → delete`;
    const ch = this.letterFor(p, c);
    return `A${p} ×${c} → ${ch === " " ? "space" : ch}`;
  }

  tap(pad, now) {                           // a confirmed press
    if (this.groupPad !== null && pad !== this.groupPad) this.commit();
    this.longFired[pad] = false;
    if (this.groupPad === pad) this.groupCount++; else { this.groupPad = pad; this.groupCount = 1; }
    this.lastTap = now;
    if (this.groupCount >= this.maxt()[pad]) this.commit();
  }

  commit() {
    const pad = this.groupPad, cnt = this.groupCount;
    this.groupPad = null; this.groupCount = 0;
    if (pad === null || cnt <= 0) return;
    if (pad === ACTION_PAD && cnt >= ACT_MODE) return this.toggleMode();
    if (pad === ACTION_PAD && cnt === ACT_DELETE) return this.backspace();
    const ch = this.letterFor(pad, cnt);
    if (!ch) return;
    if (this.mode === "KO") this.ko.feed(ch);
    else {
      if (ch === " " && this.pred) this.pred.learn(currentWord(this.out));
      this.out += ch;
    }
    this.refresh();
  }

  longCandidate(pad) {
    return SELECT_PADS.includes(pad) && this.mode === "EN" && this.suggestions.length > 0 &&
      this.groupPad === pad && this.groupCount === 1;
  }

  fireLong(pad) {
    if (!this.longCandidate(pad)) return;
    if (this.groupPad === pad && this.groupCount > 0) {
      this.groupCount--;
      if (this.groupCount === 0) this.groupPad = null;
    }
    this.accept(SELECT_PADS.indexOf(pad));
  }

  accept(i) {
    if (i >= this.suggestions.length) return;
    const word = this.suggestions[i], cur = currentWord(this.out);
    this.out = this.out.slice(0, this.out.length - cur.length) + word.toUpperCase() + " ";
    if (this.pred) this.pred.learn(word);
    this.suggestions = []; this.pickedAt = Date.now();
  }

  refresh() {
    this.suggestions = (this.pred && this.mode === "EN")
      ? this.pred.suggest(currentWord(this.out), 3).map(w => w.toUpperCase()) : [];
  }

  backspace() {
    if (this.mode === "KO" && this.ko.text()) this.ko.backspace();
    else if (this.out) this.out = this.out.slice(0, -1);
    this.refresh();
  }

  toggleMode() {
    if (this.mode === "KO") { this.out += this.ko.text(); this.ko.reset(); }
    this.mode = this.mode === "EN" ? "KO" : "EN";
    this.modeAt = Date.now();
    this.refresh();
  }

  clear() { this.out = ""; this.ko.reset(); this.groupPad = null; this.groupCount = 0; this.refresh(); }

  // called every frame: commits a tap group after the pause, fires long presses
  tick(now, det) {
    let pad = this.groupPad, stillDown = false;
    if (pad !== null && det && det.held[pad]) {
      const hold = det.tNow - det.heldT[pad];
      if (hold >= D.LONG_PRESS_S && !this.longFired[pad]) {
        this.longFired[pad] = true;
        this.fireLong(pad);
        pad = this.groupPad;
      }
      stillDown = pad !== null && hold < D.LONG_PRESS_S && this.longCandidate(pad);
    }
    if (this.groupPad !== null && !stillDown && now - this.lastTap > GAP) this.commit();
  }

  onRelease(ev) {
    if (this.longFired[ev.pad]) return;
    if (ev.long) { this.longFired[ev.pad] = true; this.fireLong(ev.pad); }
  }
}

const Engine = { TapDetector, Cheonjiin, Predictor, Typist, D, LAYOUT_EN, LAYOUT_KO, MAXT_EN, MAXT_KO,
  ACTION_PAD, ACT_DELETE, ACT_MODE, CONF_MIN, currentWord };
if (typeof module !== "undefined") module.exports = Engine;
if (typeof window !== "undefined") window.Engine = Engine;
