import Link from "next/link";
import { profile } from "@/lib/data/profile";

export function Footer() {
  return <footer className="footer"><div className="shell">
    <a className="footer-mail" href={"mailto:" + profile.email}>{profile.email}</a>
    <nav className="footer-links" aria-label="Footer">
      {profile.socials.filter(s => s.label !== "Email").map(s => <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
      <a href={profile.cvPdf} target="_blank" rel="noopener noreferrer">CV (PDF)</a>
      <Link href="/shc/">Ask SHC</Link>
    </nav>
    <div className="footer-base"><span>© {new Date().getFullYear()} Gihyun Kim</span><span>{profile.location}</span></div>
  </div></footer>;
}
