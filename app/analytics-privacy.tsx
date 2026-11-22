"use client";

import { useEffect, useState } from "react";
import { analyticsCommands, analyticsPreferenceKey, isAnalyticsPage, parseAnalyticsChoice, privacySignal, type AnalyticsChoice, type AnalyticsSettings } from "@/lib/analytics";

type AnalyticsWindow = Window & {
  houseCostAnalyticsLayer?: IArguments[];
  houseCostAnalyticsId?: string;
};

function readChoice() {
  try { return parseAnalyticsChoice(window.localStorage.getItem(analyticsPreferenceKey)); } catch { return null; }
}

function disableIfRunning({ measurementId }: AnalyticsSettings) {
  const browser = window as AnalyticsWindow;
  if (browser.houseCostAnalyticsId !== measurementId) return;
  Reflect.set(browser, `ga-disable-${measurementId}`, true);
  for (const item of document.cookie.split(";")) {
    const name = item.split("=")[0].trim();
    if (/^housecost_+ga(?:_[A-Za-z0-9]+)?$/.test(name)) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Domain=${window.location.hostname}; Path=/; Secure; SameSite=Lax`;
    }
  }
}

function enable(settings: AnalyticsSettings) {
  const browser = window as AnalyticsWindow;
  if (browser.houseCostAnalyticsId) {
    if (browser.houseCostAnalyticsId === settings.measurementId) Reflect.set(browser, `ga-disable-${settings.measurementId}`, false);
    return;
  }
  browser.houseCostAnalyticsId = settings.measurementId;
  browser.houseCostAnalyticsLayer = [];
  function queue(..._command: unknown[]) {
    browser.houseCostAnalyticsLayer!.push(arguments);
  }
  for (const command of analyticsCommands(settings, new Date())) queue(...command);
  const tag = document.createElement("script");
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${settings.measurementId}&l=houseCostAnalyticsLayer`;
  tag.async = true;
  tag.referrerPolicy = "no-referrer";
  document.head.append(tag);
}

export default function AnalyticsPrivacy({ settings }: { settings: AnalyticsSettings }) {
  const [allowedPage, setAllowedPage] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [choice, setChoice] = useState<AnalyticsChoice | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isAnalyticsPage(settings, window.location)) return;
    const navigatorPrivacy = window.navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
    const windowPrivacy = window as Window & { doNotTrack?: string };
    const signal = privacySignal(navigatorPrivacy.globalPrivacyControl, navigatorPrivacy.doNotTrack, navigatorPrivacy.msDoNotTrack, windowPrivacy.doNotTrack);
    setAllowedPage(true);
    setBlocked(signal);
    const initial = readChoice();
    setChoice(initial);
    setExpanded(!signal && initial === null);
    if (!signal && initial === "allow") enable(settings);
    function onStorage(event: StorageEvent) {
      if (event.key !== analyticsPreferenceKey && event.key !== null) return;
      const next = readChoice();
      if (next !== "allow") disableIfRunning(settings);
      setChoice(next);
      if (!signal && next === "allow") enable(settings);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [settings]);

  if (!allowedPage) return null;
  const showOptions = expanded;
  function choose(next: AnalyticsChoice) {
    if (next === "allow" && blocked) return;
    try { window.localStorage.setItem(analyticsPreferenceKey, next); } catch {
      // The page choice still applies if browser storage is unavailable.
      if (next === "deny") {
        try { window.localStorage.removeItem(analyticsPreferenceKey); } catch { /* storage unavailable */ }
      }
    }
    setChoice(next);
    setExpanded(false);
    if (next === "allow") enable(settings);
    else disableIfRunning(settings);
  }

  return <aside className="analytics-privacy" aria-label="Analytics privacy">
    <button type="button" className="text-button" aria-controls={showOptions ? "analytics-choices" : undefined} aria-expanded={showOptions} onClick={() => setExpanded(!showOptions)}>Privacy settings</button>
    {showOptions && <div id="analytics-choices" className="analytics-choices">
      <p>Optional Google Analytics helps us count visits. Google may use analytics cookies and basic device and session information. Calculator entries, including income, house price, and ZIP code, are not sent to Google Analytics. You can change your choice here anytime.</p>
      {blocked ? <p>Analytics is off because of your browser’s privacy preference.</p> : <div className="analytics-buttons">
        <button type="button" aria-pressed={choice === "allow"} onClick={() => choose("allow")}>Allow analytics</button>
        <button type="button" aria-pressed={choice === "deny"} onClick={() => choose("deny")}>No thanks</button>
      </div>}
    </div>}
  </aside>;
}
