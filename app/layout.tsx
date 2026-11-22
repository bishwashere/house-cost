import type { Metadata } from "next";
import AnalyticsPrivacy from "./analytics-privacy";
import { analyticsSettings } from "@/lib/analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "House Affordability Calculator",
  description: "Calculate monthly housing costs and compare them with household income.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analytics = analyticsSettings(process.env.HOUSE_COST_GA_MEASUREMENT_ID);
  return <html lang="en"><body>{children}{analytics && <AnalyticsPrivacy settings={analytics} />}</body></html>;
}
