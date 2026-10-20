"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { markSiteReady } from "@/lib/site-ready";

export function Preloader({ name }: { name: string }) {
  const [show, setShow] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let visited = false;
    try { visited = sessionStorage.getItem("gk-loaded") === "1"; } catch {}
    const finish = () => {
      timer = setTimeout(() => {
        try { sessionStorage.setItem("gk-loaded", "1"); } catch {}
        setShow(false);
      }, visited || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener("load", finish); };
  }, []);

  return <AnimatePresence onExitComplete={markSiteReady}>
    {show && <motion.div className="preloader" role="status" aria-label="Loading website"
      initial={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35 }}>
      <div className="preloader-inner shell"><div className="preloader-name">{name}</div></div>
    </motion.div>}
  </AnimatePresence>;
}
