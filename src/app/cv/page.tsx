import type { Metadata } from "next";
import { CVTimeline } from "@/components/cv/CVTimeline";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        title="CV"
        lede="Education, research and experience."
      />
      <section className="shell">
        <CVTimeline />
      </section>
    </div>
  );
}
