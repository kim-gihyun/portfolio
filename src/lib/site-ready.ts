"use client";

import { useSyncExternalStore } from "react";

const eventName = "portfolio:ready";
export function markSiteReady() {
  document.documentElement.dataset.siteReady = "true";
  window.dispatchEvent(new Event(eventName));
}
function subscribe(notify: () => void) {
  window.addEventListener(eventName, notify);
  return () => window.removeEventListener(eventName, notify);
}
function snapshot() { return document.documentElement.dataset.siteReady === "true"; }
function serverSnapshot() { return false; }
export function useSiteReady() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
