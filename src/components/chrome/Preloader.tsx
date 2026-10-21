"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { markSiteReady } from "@/lib/site-ready";

export function Preloader() {
  const [show, setShow] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return <AnimatePresence onExitComplete={markSiteReady}>
    {show && <motion.div className="preloader" role="status" aria-label="Loading website"
      initial={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}>
      <div className="preloader-monogram" aria-hidden>GK</div>
    </motion.div>}
  </AnimatePresence>;
}
