"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const branches = [
  { label: "Shin Group", detail: "TENG & materials", href: "/blog", x: 0, y: -40, color: "#d08b54" },
  { label: "Projects", detail: "CAD & working builds", href: "/portfolio", x: 36, y: -12, color: "#c49a37" },
  { label: "Off-duty", detail: "Places, keyboards & music", href: "/personal", x: 28, y: 34, color: "#9daab9" },
  { label: "HKU Robocon", detail: "Robotics & fabrication", href: "/portfolio#robocon-robot", x: -28, y: 34, color: "#ac89ce" },
  { label: "Laidlaw", detail: "Research scholar", href: "/cv", x: -36, y: -12, color: "#70aadb" },
];

export function HomeHero() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 750;
    const timer = window.setTimeout(() => setReady(open), open ? delay : 0);
    return () => window.clearTimeout(timer);
  }, [open]);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -9999, y: -9999 });
  const expanded = useRef(false);
  useEffect(() => { expanded.current = open; window.dispatchEvent(new Event("name-expansion")); }, [open]);
  useEffect(() => {
    const el = stage.current, surface = canvas.current;
    if (!el || !surface) return;
    const ctx = surface.getContext("2d");
    if (!ctx) return;
    let width = 0, height = 0, raf = 0, frame = 0, reveal = 0;
    let cx = 0, cy = 0;
    let seed = 1106;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const particles = Array.from({ length: 210 }, () => ({ angle: random() * Math.PI * 2, radius: random(), phase: random() * 6.28, size: .7 + random() * 1.3 }));
    const runners = branches.map(() => Array.from({length:38}, () => ({offset:random(),speed:.07+random()*.06,side:(random()-.5)*18,size:.8+random()*1.4})));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let color = getComputedStyle(el).getPropertyValue("--accent-ink");
    const draw = () => {
      const proximity = Math.max(0, 1 - Math.hypot((pointer.current.x - cx) / 1.5, pointer.current.y - cy) / 320);
      const t = reduced ? 0 : frame++ / 90;
      ctx.clearRect(0, 0, width, height);
      reveal += ((expanded.current ? 1 : 0) - reveal) * (reduced ? 1 : .06);
      // Soft light radiates from behind the lettering, with an elliptical falloff.
      ctx.save(); ctx.translate(cx,cy); ctx.scale(1,.48);
      const halo = ctx.createRadialGradient(0,0,5,0,0,Math.min(width*.48,360));
      halo.addColorStop(0,"rgba(76,177,230,.20)"); halo.addColorStop(.4,"rgba(76,177,230,.12)"); halo.addColorStop(1,"rgba(76,177,230,0)");
      ctx.globalAlpha = .75 + proximity*.25; ctx.fillStyle = halo;
      ctx.fillRect(-400,-400,800,800);
      if (!reduced) for (let wave = 0; wave < 2; wave++) {
        const progress = (t*.2 + wave*.5)%1;
        const radius = 45 + progress*Math.min(width*.4,300);
        const light = ctx.createRadialGradient(0,0,Math.max(0,radius-75),0,0,radius+50);
        light.addColorStop(0,"rgba(93,190,239,0)");
        light.addColorStop(.5,"rgba(93,190,239,.10)");
        light.addColorStop(1,"rgba(93,190,239,0)");
        ctx.globalAlpha = Math.sin(progress*Math.PI)*(.6+proximity*.4);
        ctx.fillStyle=light;ctx.fillRect(-400,-400,800,800);
      }
      ctx.restore();
      ctx.fillStyle = color;
      particles.forEach((p, i) => {
        if (i > 120 + proximity * 90) return;
        const progress = reduced ? p.radius : (p.radius + t*.08)%1;
        const angle = p.angle + Math.sin(t*.12+p.phase)*.05;
        const radius = Math.sqrt(progress);
        ctx.globalAlpha = (.35+proximity*.45)*Math.sin(progress*Math.PI)*(1-reveal*.65);
        ctx.beginPath(); ctx.arc(cx + Math.cos(angle)*Math.min(width*.44,330)*radius,cy + Math.sin(angle)*150*radius,p.size,0,Math.PI*2); ctx.fill();
      });
      branches.forEach((branch,index) => {
        const mobile = width <= 700;
        const targetX = width*(.5+branch.x/100*(mobile?.65:1));
        const mobileY = [12,27,78,78,27][index];
        const targetY = height*(mobile?mobileY/100:.5+branch.y/100);
        const dx = targetX-cx, dy = targetY-cy;
        const length = Math.hypot(dx,dy)||1;
        const clearance = Math.min(width*.19,180)*(1-reveal)+35*reveal;
        const start = Math.min(.65,clearance/length);
        ctx.fillStyle = branch.color;
        runners[index].forEach(p => {
          const progress = reduced?p.offset:(p.offset+t*p.speed)%1;
          const u = start+(1-start)*progress;
          const curve = Math.sin(u*Math.PI)*p.side;
          const x = cx+dx*u-dy/length*curve;
          const y = cy+dy*u+dx/length*curve;
          ctx.globalAlpha = reveal*Math.sin(progress*Math.PI)*.95;
          ctx.beginPath();ctx.arc(x,y,p.size,0,Math.PI*2);ctx.fill();
        });
      });
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    const size = () => {
      const rect = el.getBoundingClientRect(); width = rect.width; height = rect.height;
      const name = el.querySelector(".name-trigger")!.getBoundingClientRect();
      cx = name.left-rect.left+name.width/2; cy = name.top-rect.top+name.height/2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = width * dpr; surface.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw();
    };
    size();
    const observer = new ResizeObserver(size); observer.observe(el);
    if (!reduced) draw();
    const repaint = () => { color = getComputedStyle(el).getPropertyValue("--accent-ink"); if (reduced) draw(); };
    window.addEventListener("themechange", repaint);
    window.addEventListener("name-expansion", repaint);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener("themechange", repaint); window.removeEventListener("name-expansion", repaint); };
  }, []);

  return <section className={`home-reveal ${open ? "is-open" : ""} ${ready && open ? "are-ready" : ""}`}
    onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
    onMouseLeave={() => { setOpen(false); pointer.current = { x: -9999, y: -9999 }; }}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <div ref={stage} className="name-scene shell" onPointerMove={e => {
      const rect = e.currentTarget.getBoundingClientRect();
      pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }}>
      <canvas ref={canvas} className="name-particles" aria-hidden />
      <div className="name-core">
        <h1><button className="name-trigger" aria-label="Gihyun Kim" aria-expanded={open} aria-controls="home-branches" onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}>
          <span className="name-full" aria-hidden>Gihyun <em>Kim</em></span><span className="name-monogram" aria-hidden>GK</span>
        </button></h1>
        <p className="name-description" aria-hidden={open}>Mechanical engineering student at HKU.</p>
        <div className="name-actions" inert={open}><Link className="btn" href="/portfolio">Projects <span aria-hidden>↗</span></Link><Link className="btn btn--ghost" href="/cv">CV <span aria-hidden>↗</span></Link></div>
      </div>
      <nav id="home-branches" className="name-destinations" aria-label="My work and interests" inert={!open || !ready}>
        {branches.map(b => <Link key={b.label} href={b.href} className="name-destination" style={{"--nx":`${b.x}%`,"--ny":`${b.y}%`,"--branch":b.color} as CSSProperties}>
          <span className="name-branch-dot"/><span><b>{b.label}</b><small>{b.detail}</small></span><span className="name-branch-arrow" aria-hidden>↗</span>
        </Link>)}
      </nav>
    </div>
  </section>;
}
