"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PortfolioExplorer } from "./PortfolioExplorer";
import { projects, projectGroup } from "@/lib/data/projects";

const sections = [
  { id: "all", label: "All projects" },
  { id: "laidlaw", label: "Laidlaw" },
  { id: "shin-group", label: "Shin Group Research" },
  { id: "robocon", label: "Robocon" },
  { id: "other", label: "Other builds" },
];

function LaidlawResearch() {
  return <article className="laidlaw-project">
    <div className="laidlaw-summary">
      <p className="readout">Laidlaw Scholars Programme · HKU · Summer 2026</p>
      <h2>Measuring atmospheric turbulence with a small drone</h2>
      <p>A sonic anemometer mounted above a DJI Mavic 3E, with a custom data logger and 3D-printed sensor mount. Supervised by Prof. Chun-Ho Liu.</p>
      <dl className="laidlaw-specs"><div><dt>Sampling</dt><dd>40 Hz</dd></div><div><dt>Flight heights</dt><dd>20–120 m</dd></div><div><dt>Sensor</dt><dd>TriSonica Mini</dd></div></dl>
      <p>I compared ten rod lengths in indoor hover tests, then collected morning and afternoon wind profiles at six heights. The 17.5 cm rod was selected for the outdoor flights.</p>
      <p className="laidlaw-limit">The measurements include rotor effects and aircraft motion. Without a reference anemometer, they do not independently establish wind-measurement accuracy.</p>
      <div className="laidlaw-documents">
        <a href="/assets/laidlaw/research-poster.pdf" target="_blank" rel="noopener noreferrer">Research poster <span>PDF · Open ↗</span></a>
        <a href="/assets/laidlaw/ny-conference.pptx" download>New York conference presentation <span>PowerPoint · Download ↓</span></a>
        <a href="/assets/laidlaw-report.pdf" target="_blank" rel="noopener noreferrer">Research report <span>PDF · Open ↗</span></a>
      </div>
    </div>
    <a className="laidlaw-poster" href="/assets/laidlaw/research-poster.pdf" target="_blank" rel="noopener noreferrer" aria-label="Open Laidlaw research poster PDF"><Image src="/assets/laidlaw/poster-preview.webp" alt="Research poster: design, build and data acquisition of atmospheric turbulence using drones" width={1200} height={1700} style={{width:"100%",height:"auto"}}/></a>
  </article>;
}

export function PortfolioSections() {
  const [section, setSection] = useState("all");
  useEffect(() => {
    const sync = () => {
      let hash = "";
      try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch { setSection("all"); return; }
      if (sections.some(s => s.id === hash)) setSection(hash);
      else { const project = projects.find(p => p.id === hash); setSection(project ? projectGroup(project) : "all"); }
    };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const select = (id: string) => { setSection(id); window.history.pushState(null,"",`#${id}`); };
  return <div className="portfolio-sections">
    <nav className="portfolio-tabs" aria-label="Project sections">{sections.map(s => <a key={s.id} href={`#${s.id}`} aria-current={section === s.id ? "page" : undefined} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); select(s.id); }}>{s.label}</a>)}</nav>
    <div id={section} className="portfolio-section" key={section}>
      {(section === "all" || section === "laidlaw") && <LaidlawResearch/>}
      {section === "shin-group" && <div className="research-section-intro"><h2>Shin Group Research</h2><p>Wearable sensing, printed conductive materials and the rigs built to characterise them.</p><Link href="/blog">Read research updates ↗</Link></div>}
      {section !== "laidlaw" && <PortfolioExplorer group={section}/>}
    </div>
  </div>;
}
