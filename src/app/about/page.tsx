import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageOg } from "@/lib/og";

const description = "Gihyun Kim, a mechanical engineering student at the University of Hong Kong.";
export const metadata: Metadata = { title: "About", description, ...pageOg("About", description, "/about/") };

export default function AboutPage() {
  return <div className="page about">
    <PageHeader title="About"/>
    <section className="shell about-lead">
      <div className="about-lead-text"><div className="about-lead-cols">
        <p className="about-introduction">I study Mechanical Engineering at the <strong>University of Hong Kong</strong>, through the BEng X + MScEng in AI Engineering programme on a full scholarship.</p>
        <p>I grew up in South Korea and spent five and a half years in London and Istanbul before moving to Hong Kong.</p>
        <p>My research covers UAV-based measurements of urban atmospheric turbulence through the <a href="/portfolio/#laidlaw"><strong>Laidlaw Programme</strong></a> and 3D-printed triboelectric sensors in <a href="/portfolio/#shin-group"><strong>Prof. Dong-Myeong Shin&rsquo;s group</strong></a>. I also work on mechanical design and fabrication with <a href="/portfolio/#robocon"><strong>HKU Robocon</strong></a> and <strong>HKU Racing</strong>.</p>
      </div></div>
      <figure className="about-portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/profile.jpg" alt="Gihyun Kim at Victoria Harbour, Hong Kong" loading="lazy"/>
        <figcaption>Victoria Harbour, Hong Kong</figcaption>
      </figure>
    </section>
  </div>;
}
