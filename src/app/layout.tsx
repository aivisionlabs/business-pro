import type { Metadata } from "next";
import "./globals.css";
import Providers from "./Providers";
import TopNav from "./TopNav";

export const metadata: Metadata = {
  title: "BusinessCase Pro - Plastic Packaging Calculator",
  description:
    "Pricing and returns calculator for plastic packaging SKUs with AI-powered chat interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
