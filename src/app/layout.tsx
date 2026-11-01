import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import ClientRuntime from '@/components/ClientRuntime';
import Toasts from '@/components/Toasts';
import { Suspense } from 'react';
import WorkspaceNavigation from '@/components/WorkspaceNavigation';
import './globals.css';

const geistSans = localFont({
  src: './fonts/geist-latin.woff2',
  weight: '100 900',
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/geist-mono-latin.woff2',
  weight: '100 900',
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MetaForge — Intelligent Image Metadata & SEO Platform',
  description: 'Inspect, sanitize, and edit image metadata locally in your browser, with optional Google Gemini Vision for image SEO.',
  keywords: ['EXIF', 'IPTC', 'XMP', 'Image SEO', 'Metadata Cleaner', 'GPS Remover', 'ComfyUI Workflow', 'Gemini Vision']
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#09090b' };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
        <ClientRuntime />
        <Suspense fallback={null}><WorkspaceNavigation /></Suspense>
        <Toasts />
        {children}
      </body>
    </html>
  );
}
