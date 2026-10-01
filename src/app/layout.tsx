import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MetaForge — Intelligent Image Metadata & SEO Platform',
  description: 'Inspect, sanitize, enrich, and build image SEO in-browser. 100% private, zero server uploads, powered by client WebAssembly and optional Google Gemini Vision.',
  keywords: ['EXIF', 'IPTC', 'XMP', 'Image SEO', 'Metadata Cleaner', 'GPS Remover', 'ComfyUI Workflow', 'Gemini Vision']
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
        {children}
      </body>
    </html>
  );
}
