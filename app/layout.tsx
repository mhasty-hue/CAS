import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAS | Appraisal Operating System",
  description: "A modern operating system for appraisal firms, AMCs, lenders, reviewers, and appraisers."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
