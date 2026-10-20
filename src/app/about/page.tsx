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
        <p>I study Mechanical Engineering at the <strong>University of Hong Kong</strong>, through the BEng X + MScEng in AI Engineering programme on a full scholarship. I grew up in South Korea and spent five and a half years in London and Istanbul before moving to Hong Kong.</p>
        <p>My research covers UAV-based measurements of urban atmospheric turbulence through the <strong>Laidlaw Programme</strong> and 3D-printed triboelectric sensors in <strong>Prof. Dong-Myeong Shin&rsquo;s group</strong>. I also work on mechanical design and fabrication with <strong>HKU Robocon</strong> and <strong>HKU Racing</strong>.</p>
      </div></div>
      <figure className="about-portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/profile.jpg" alt="Gihyun Kim at Victoria Harbour, Hong Kong" loading="lazy"/>
        <figcaption>Victoria Harbour, Hong Kong</figcaption>
      </figure>
    </section>
  </div>;
}
