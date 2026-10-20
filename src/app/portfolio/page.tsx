import type { Metadata } from "next";
import { PortfolioExplorer } from "@/components/portfolio/PortfolioExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageOg } from "@/lib/og";

const description =
  "Engineering projects by Gihyun Kim, with CAD models, photos and design details.";

export const metadata: Metadata = {
  title: "Projects",
  description,
  ...pageOg("Projects", description, "/portfolio/"),
};

export default function PortfolioPage() {
  return (
    <div className="page">
      <PageHeader
        title="Projects"
        lede="Mechanical design, robotics and materials research. Select a project to explore."
      />
      <section className="shell">
        <PortfolioExplorer />
      </section>
    </div>
  );
}
