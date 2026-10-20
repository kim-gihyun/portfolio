import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { projects } from "@/lib/data/projects";

export default function Home() {
  return <><HomeHero/><section className="section shell home-projects" aria-labelledby="home-projects-title">
    <div className="section-head"><h2 className="section-title" id="home-projects-title">Projects</h2><Link href="/portfolio" className="ulink">View all →</Link></div>
    <ul className="home-project-list">{projects.map(project => <li key={project.id}>
      <Link href={"/portfolio#" + project.id}><span><b>{project.title}</b><small>{project.tag}</small></span><span className="project-year">{project.year} <i aria-hidden>↗</i></span></Link>
    </li>)}</ul>
  </section></>;
}
