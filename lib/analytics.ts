export const analyticsPreferenceKey = "house-cost-analytics-v1";

export type AnalyticsChoice = "allow" | "deny";
const analyticsOrigin = "https://howmuchhousecaniafford.azent.io";
export type AnalyticsSettings = { measurementId: string; origin: typeof analyticsOrigin };

export function analyticsSettings(measurementId?: string): AnalyticsSettings | null {
  if (!measurementId || !/^G-[A-Z0-9]{5,20}$/.test(measurementId)) return null;
  return { measurementId, origin: analyticsOrigin };
}

export function isAnalyticsPage(settings: AnalyticsSettings, location: Pick<Location, "origin" | "pathname">) {
  return location.origin === settings.origin && location.pathname === "/";
}

export function privacySignal(gpc?: boolean, ...dnt: unknown[]) {
  return gpc === true || dnt.some(value => value === "1" || value === "yes");
}

export function parseAnalyticsChoice(value: string | null): AnalyticsChoice | null {
  return value === "allow" || value === "deny" ? value : null;
}

export function analyticsCommands({ measurementId, origin }: AnalyticsSettings, now: Date) {
  const consent = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
  const page = {
    page_location: origin + "/",
    page_referrer: "",
    page_title: "How Much House Can I Afford?",
    ignore_referrer: true,
  };
  return [
    ["consent", "default", { ...consent, analytics_storage: "denied" }],
    ["consent", "update", { ...consent, analytics_storage: "granted" }],
    ["set", { ...page, allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true, url_passthrough: false }],
    ["js", now],
    ["config", measurementId, { ...page, send_page_view: false, allow_google_signals: false,
      allow_ad_personalization_signals: false, cookie_domain: new URL(origin).hostname, cookie_prefix: "housecost" }],
    ["event", "page_view", { ...page, send_to: measurementId }],
  ] as const;
}
