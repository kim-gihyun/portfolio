import type { Metadata } from "next";
import { CVTimeline } from "@/components/cv/CVTimeline";
import { cvMeta } from "@/lib/data/cv";
import { pageOg } from "@/lib/og";

const description =
  "Gihyun Kim's education, research, experience and skills.";

export const metadata: Metadata = {
  title: "CV",
  description,
  ...pageOg("CV", description, "/cv/"),
};

export default function CVPage() {
  return (
    <div className="page">
      <header className="page-header shell">
        <div className="cv-page-title-row"><h1 className="page-title">CV</h1>
          <a className="btn cv-top-download" href={cvMeta.pdf} download="Gihyun-Kim-CV.pdf">Download CV <span aria-hidden>↓</span><span className="readout">PDF</span></a>
        </div>
        <p className="page-lede measure">Education, research and experience.</p>
        <div className="hairline page-header-rule"/>
      </header>
      <section className="shell">
        <CVTimeline />
      </section>
    </div>
  );
}
