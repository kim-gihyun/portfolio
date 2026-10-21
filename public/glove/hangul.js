// hangul.js -- mirrors what the phone's Korean (두벌식) keyboard does with the glove's keys,
// so the page can show the same text: r k -> 가, 은 + w -> 읁, 읁 + h -> 은조.
// Also the 천지인 stroke table, to show a vowel that is still being built (ㅣ ㆍ -> ㅏ).
(() => {
  const KEY = { r: "ㄱ", R: "ㄲ", s: "ㄴ", e: "ㄷ", E: "ㄸ", f: "ㄹ", a: "ㅁ", q: "ㅂ", Q: "ㅃ",
    t: "ㅅ", T: "ㅆ", d: "ㅇ", w: "ㅈ", W: "ㅉ", c: "ㅊ", z: "ㅋ", x: "ㅌ", v: "ㅍ", g: "ㅎ",
    k: "ㅏ", o: "ㅐ", i: "ㅑ", O: "ㅒ", j: "ㅓ", p: "ㅔ", u: "ㅕ", P: "ㅖ", h: "ㅗ", y: "ㅛ",
    n: "ㅜ", b: "ㅠ", m: "ㅡ", l: "ㅣ" };
  const LEAD = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const VOWEL = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  const TAIL = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
  const VJOIN = { "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ", "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ", "ㅡㅣ": "ㅢ" };
  const TJOIN = { "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ",
    "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ" };
  // 천지인 strokes as the firmware sends them: '|' ㅣ, '.' ㆍ, '-' ㅡ
  const STROKES = { "|": "ㅣ", "-": "ㅡ", "|.": "ㅏ", "|..": "ㅑ", ".|": "ㅓ", "..|": "ㅕ",
    ".-": "ㅗ", "..-": "ㅛ", "-.": "ㅜ", "-..": "ㅠ", "|.|": "ㅐ", "|..|": "ㅒ", ".||": "ㅔ",
    "..||": "ㅖ", "-|": "ㅢ", ".-|": "ㅚ", ".-|.": "ㅘ", ".-|.|": "ㅙ", "-.|": "ㅟ",
    "-..|": "ㅝ", "-..||": "ㅞ" };

  class Composer {
    constructor() { this.done = ""; this.lead = ""; this.v = []; this.tail = []; }
    vowel() { return this.v.length === 2 ? VJOIN[this.v.join("")] : this.v[0] || ""; }
    tailJamo() { return this.tail.length === 2 ? TJOIN[this.tail.join("")] : this.tail[0] || ""; }
    pending() {
      const v = this.vowel(), tl = this.tailJamo();
      if (this.lead && v) return String.fromCharCode(0xAC00 +
        (LEAD.indexOf(this.lead) * 21 + VOWEL.indexOf(v)) * 28 + Math.max(0, TAIL.indexOf(tl || " ")));
      return this.lead + v + tl;
    }
    text() { return this.done + this.pending(); }
    flush() { this.done += this.pending(); this.lead = ""; this.v = []; this.tail = []; }

    key(ch) {                       // one key from the glove, Korean layout
      const j = KEY[ch];
      if (!j) { this.flush(); this.done += ch; return; }
      if (VOWEL.includes(j)) this.vowelIn(j); else this.consonantIn(j);
    }
    consonantIn(c) {
      if (!this.v.length || !this.lead) { this.flush(); this.lead = c; return; }
      if (!this.tail.length) { if (TAIL.includes(c)) this.tail = [c]; else { this.flush(); this.lead = c; } return; }
      if (this.tail.length === 1 && TJOIN[this.tail[0] + c]) { this.tail.push(c); return; }
      this.flush(); this.lead = c;
    }
    vowelIn(v) {
      if (this.tail.length) {       // the tail was really the next syllable's lead
        const moved = this.tail.pop(); this.flush(); this.lead = moved; this.v = [v]; return;
      }
      if (this.v.length === 1 && VJOIN[this.v[0] + v]) { this.v.push(v); return; }
      if (this.v.length || !this.lead) { this.flush(); }
      this.v = [v];
    }
    backspace() {
      if (this.tail.length) this.tail.pop();
      else if (this.v.length) this.v.pop();
      else if (this.lead) this.lead = "";
      else this.done = [...this.done].slice(0, -1).join("");
    }
    raw(s) { this.flush(); this.done += s; }
  }

  const api = { Composer, KEY, STROKES };
  if (typeof module !== "undefined") module.exports = api; else window.Hangul = api;
})();
