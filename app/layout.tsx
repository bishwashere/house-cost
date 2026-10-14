import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "House Affordability Calculator",
  description: "Calculate monthly housing costs and compare them with household income.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
