"use client";

import Link from "next/link";
import { ModelViewer } from "@/components/three/ModelViewer";

export function HomeHero() {
  return <section className="home"><div className="home-grid shell">
    <div className="home-text">
      <h1 className="home-name">Gihyun <span className="home-accent">Kim</span></h1>
      <p className="home-tagline">Mechanical engineering student at HKU.</p>
      <div className="home-cta">
        <Link href="/portfolio" className="btn">Projects <span aria-hidden>→</span></Link>
        <Link href="/cv" className="btn btn--ghost">CV</Link>
      </div>
    </div>
    <div className="home-model"><div className="home-model-stage">
      <ModelViewer src="/assets/robot.glb" orient={{ rx: 0, ry: 210, zoom: 1.5 }} className="home-canvas" label="Robocon competition robot" hint={false}/>
    </div><span className="home-model-cap">Robocon robot · Drag to rotate</span></div>
  </div></section>;
}
