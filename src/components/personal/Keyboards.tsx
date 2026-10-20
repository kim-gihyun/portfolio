"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { keebHero, mounts } from "@/lib/data/offduty";

export function Keyboards() {
  const [mount, setMount] = useState(0);
  const m = mounts[mount];

  return (
    <div className="keeb">
      <div className="keeb-hero">
        <div className="keeb-board" aria-hidden>
          <div className="keeb-board-inner">
            {Array.from({ length: 67 }).map((_, i) => (
              <span key={i} className="keeb-key" />
            ))}
          </div>
          <span className="keeb-board-glow" />
        </div>
        <div className="keeb-hero-text">
          <h3>
            {keebHero.name} <span className="keeb-rev">{keebHero.rev}</span>
          </h3>
          <dl className="keeb-specs">
            {keebHero.specs.map((s) => (
              <div key={s.k}>
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="keeb-mounts">
        <div className="keeb-mounts-head">
          <h4>Gasket vs. top vs. tray</h4>
        </div>
        <div className="keeb-tabs" role="tablist" aria-label="Mount type">
          {mounts.map((mt, i) => (
            <button
              key={mt.name}
              role="tab"
              id={`keeb-tab-${i}`}
              aria-selected={mount === i}
              aria-controls={`keeb-panel-${i}`}
              tabIndex={mount === i ? 0 : -1}
              className={`keeb-tab ${mount === i ? "is-active" : ""} ${mt.pick ? "is-pick" : ""}`}
              onClick={() => setMount(i)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const next =
                  e.key === "ArrowRight"
                    ? (i + 1) % mounts.length
                    : (i - 1 + mounts.length) % mounts.length;
                setMount(next);
                (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
              }}
              data-cursor="link"
            >
              {mt.name}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={m.name}
            className="keeb-panel"
            role="tabpanel"
            id={`keeb-panel-${mount}`}
            aria-labelledby={`keeb-tab-${mount}`}
            tabIndex={0}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="keeb-panel-row">
              <span className="readout">Feel</span>
              <p>{m.feel}</p>
            </div>
            <div className="keeb-panel-row">
              <span className="readout">Sound</span>
              <p>{m.sound}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
