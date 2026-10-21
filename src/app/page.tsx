import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { Mindmap } from "@/components/home/Mindmap";

export default function Home() {
 return <><HomeHero/><section className="section shell home-map" id="map" aria-labelledby="home-map-title">
 <div className="section-head"><h2 className="section-title" id="home-map-title">How it all connects</h2><Link href="/portfolio" className="ulink">Explore projects →</Link></div>
 <Mindmap/>
 </section></>;
}
