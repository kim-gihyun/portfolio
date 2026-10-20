import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { JourneyMap } from "@/components/personal/JourneyMap";
import { Keyboards } from "@/components/personal/Keyboards";
import { Gallery } from "@/components/ui/Gallery";
import { songs, photos } from "@/lib/data/offduty";
import { pageOg } from "@/lib/og";

const description =
  "Gihyun Kim's travel, keyboards, music and photos.";

export const metadata: Metadata = {
  title: "Personal",
  description,
  ...pageOg("Personal", description, "/personal/"),
};

export default function PersonalPage() {
  return (
    <div className="page personal">
      <PageHeader
        title="Personal"
        lede="Travel, keyboards, music and photos."
      />

      {/* journey map */}
      <section className="section shell">
        <div className="section-head">
          <h2 className="section-title">Travel</h2>
          <span className="section-note readout">hover a pin</span>
        </div>
        <JourneyMap />
      </section>

      {/* keyboards */}
      <section className="section shell" id="keebs">
        <div className="section-head">
          <h2 className="section-title">Mechanical keyboards</h2>
        </div>
        <Reveal>
          <Keyboards />
        </Reveal>
      </section>

      {/* songs */}
      <section className="section shell">
        <div className="section-head">
          <h2 className="section-title">Music</h2>
          <span className="section-note readout">{songs.length} tracks</span>
        </div>
        <Reveal className="song-list" stagger={0.06}>
          {songs.map((s) => (
            <a key={s.title} className="song" href={s.href} target="_blank" rel="noopener" data-cursor="link">
              <span className="song-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.cover} alt={`${s.title} cover`} loading="lazy" />
              </span>
              <span className="song-text">
                <b>{s.title}</b>
                <span className="song-artist">{s.artist}</span>
              </span>
              <span className="song-play" aria-hidden>
                ▶
              </span>
            </a>
          ))}
        </Reveal>
      </section>

      {/* photos */}
      <section className="section shell">
        <div className="section-head">
          <h2 className="section-title">Photos</h2>
          <span className="section-note readout">2019–2026</span>
        </div>
        <Reveal>
          <Gallery
            images={photos.map((p) => ({ src: p.src, alt: `${p.caption} · ${p.year}` }))}
            className="photo-gallery"
          />
        </Reveal>
      </section>
    </div>
  );
}
