# METAFORGE (formerly MetaZenith)

> **Inspect. Clean. Enrich. Publish.**
> Intelligent Image Metadata Studio, Privacy Sanitizer, and Dynamic AI SEO Engine.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/metaforge)

---

## ⚡ The Architecture: Client-First, Zero Server Uploads

MetaForge solves the classic **"ExifTool + Vercel" bottleneck**. Native ExifTool binaries (written in Perl) fail on Vercel Serverless Functions due to cold starts, the 50MB AWS Lambda payload limit, and read-only container filesystems.

MetaForge utilizes a **Dual-Engine / Client-First Architecture**:
1. **Engine A (In-Browser Client Core via WebAssembly & Web Workers):**
   - 100% of EXIF, IPTC, XMP, GPS, and MakerNotes parsing and stripping occurs directly inside the user's browser memory via `exifr` and `piexifjs`.
   - **Zero Upload Privacy Guarantee:** Images never leave the device.
   - **Zero Hosting Costs:** Vercel serves pure static and edge-ready assets with zero backend serverless compute or bandwidth usage.
2. **Engine B (Dynamic AI Layer with Google Gemini BYOK):**
   - Toggleable directly in the top navigation bar (`AI Assistant: [ENABLED / DISABLED]`).
   - Runs **100% offline** when disabled with zero API prompts.
   - When enabled, directly calls Google Gemini (`gemini-2.5-flash`, `gemini-1.5-flash`, or `gemini-1.5-pro`) using Bring-Your-Own-Key (BYOK) stored exclusively in `localStorage`.

---

## 🚀 Key Features

- **Deep Metadata Explorer:**
  - Collapsible tree covering File Info, EXIF & Camera Hardware, GPS Coordinates, IPTC & Dublin Core, and XMP packets.
  - Every single field supports **[Inline Edit]**, **[Delete Tag]**, and **[Copy Value]**.
- **Privacy Shield & Sanitizer:**
  - Real-time Threat Index (0–100) auditing geographic GPS leaks, camera body serial numbers, and machine hostnames.
  - **One-Click "Sanitize for Social Media"**: Strips GPS coordinates and serial number fingerprints while preserving author and copyright attribution.
  - **One-Click "Strip 100% EXIF"**: Canvas-grade complete binary strip.
- **AI Workflow & Prompt Extractor:**
  - Automatic detection of **ComfyUI**, **Stable Diffusion (Automatic1111/Forge)**, and **Midjourney** images.
  - Extracts prompt, negative prompt, sampler, seed, CFG scale, steps, and base model from PNG text chunks and EXIF user comments.
- **Visual SEO Suite (Gemini Vision):**
  - Analyzes image visuals to generate search-optimized Titles, accessible Alt Text for screen readers, Editorial Captions, and keyword tags.
  - One-click writeback to EXIF/IPTC tags in client memory.
  - **Live Google Image Search & Social OpenGraph simulator** (Twitter/X & Facebook cards).
  - **Google Image Sitemap (XML)** builder and exporter.
- **Interactive High-Res Canvas:**
  - Zoom (50% to 400%) and pan controls with checkerboard transparency background.
- **Batch Processing & ZIP Export:**
  - Multi-file drag & drop queue.
  - Batch "Strip All GPS", Batch Social Sanitize, and one-click ZIP packaging with `JSZip`.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + Lucide React
- **State Management:** Zustand (with localStorage persistence)
- **Client Metadata Parsers:** `exifr`, `piexifjs`
- **AI Vision SDK:** `@google/genai` (Google Gemini 2.5 Flash)
- **Batch & Archiving:** `jszip`, `file-saver`

---

## 📦 Getting Started Locally

### 1. Clone & Install
```bash
git clone https://github.com/your-username/metaforge.git
cd metaforge
npm install
```

### 2. Environment Variables (Optional)
MetaForge provides an in-app BYOK modal to enter your Google Gemini API key. Optionally, you can set a default key in `.env.local`:
```bash
NEXT_PUBLIC_GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```
Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🚢 Deploying to Vercel

MetaForge is 100% edge-ready and compatible with standard zero-config Vercel deployments:

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete MetaForge intelligent metadata studio"
   git branch -M main
   git remote add origin https://github.com/your-username/metaforge.git
   git push -u origin main
   ```
2. Navigate to [vercel.com/new](https://vercel.com/new).
3. Import your `metaforge` repository.
4. Framework Preset will auto-detect as **Next.js**.
5. Click **Deploy**.

---

## 🔒 Privacy & Security

- **No telemetry, no tracking, no backend database.**
- All file manipulations happen inside WebAssembly and browser memory.
- When AI is disabled, zero network requests leave your computer.
- API keys are never stored on any server and remain encrypted in your browser's private local storage.

---

## 📄 License
MIT License. Created for photographers, journalists, developers, and privacy advocates.
