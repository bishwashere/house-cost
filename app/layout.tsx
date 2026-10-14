import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nestwell — House Affordability Calculator",
  description: "See the whole cost of home. Explore mortgage payments, everyday expenses, and how a home fits your household income.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
