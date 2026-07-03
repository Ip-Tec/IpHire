import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IpHire AI — Your Personal Career Operating System",
  description: "Find jobs, tailor resumes, prepare for interviews, identify skill gaps, and manage your career — all powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="antialiased"
    >
      <body className="min-h-screen bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}
