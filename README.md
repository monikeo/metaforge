# MetaForge

Image metadata inspection, editing, privacy cleaning, and SEO tools built with Next.js 16, React 19, and TypeScript. The existing dark workstation adapts to desktop, tablet, and mobile screens.

## Run

Use Node.js 22.12 or newer. CI uses Node.js 24.

```sh
npm ci
npm run dev
```

No environment variables or backend image service are required. Configure an optional Gemini key in AI Settings. Do not put private credentials in `NEXT_PUBLIC_` variables: those values are shipped to browsers.

## Verification

```sh
npm run typecheck
npm run lint
npm run test:lint
npm test
npm run build
npm audit
```

The regression suite uses Node's assertions and TypeScript already installed in this project. It verifies actual image metadata bytes, Unicode round trips, location cleaning, AI label detection and removal (C2PA, IPTC source types, prompts) with unchanged pixel data and no false positives on look-alike words, Ultra HDR gain maps and MPF indexes across edits, immutable history, concurrent edits, batch results and cancellation, presets, filenames, sitemap validation, EXIF date and UTF-8 encoding, snapshot integrity against edits made by other tools, AI batch generation with a mocked Gemini client, and CSV/JSON export escaping. Browser decoding is verified separately from the test suite's Image stub.

For browser QA, install Firefox through the included Playwright dependency, start the production app on port 3100, and run:

```sh
npx playwright install firefox webkit
npm run build
npm start -- --port 3100
# In another terminal:
npm run test:browser
```

`BASE_URL` overrides the preview URL. Firefox is the default. To repeat both suites in Edge, set `BROWSER_ENGINE=chromium` and `BROWSER_CHANNEL=msedge`; without a channel, Chromium uses Playwright's installed browser. Set `BROWSER_ENGINE=webkit` for Safari-engine coverage. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation. Browser QA checks navigation, browser history, modal focus and resizing, header controls, downloads, core workflows, and widths from 320px to 1920px. Screenshots and test logs are local artifacts and are ignored by Git.

`npm run test:apple` checks WebKit with iPad and iPhone touch/viewport emulation, portrait/landscape navigation, settings and actual metadata downloads. This is separate from `npm run test:safari`, which uses Apple's SafariDriver on macOS or an iPadOS Simulator. The GitHub Actions workflow runs the three browser engines, native macOS Safari, and native iPadOS Simulator Safari. Physical device and software-keyboard testing remains a separate hardware check.

For an online development smoke check, point `BASE_URL` at the dev server and set `TEST_DEVELOPMENT=1`. The production run also tests workspace navigation with the network disabled. Style scanning is limited to `src/` so QA artifacts do not trigger development rebuilds.

The full dependency audit, including development tools, is clear. Oxlint replaces the vulnerable ESLint dependency chain. The migrated configuration preserves 78 supported rules, including React Hooks, React Compiler, Next.js and accessibility checks. `test:lint` verifies that invalid hooks, blocking scripts and invalid ARIA attributes are still rejected. Lint warnings fail the check. The migration omitted deprecated/obsolete ESLint bookkeeping rules and the unavailable Next.js relative-location-assignment rule; this app uses validated workspace navigation helpers instead.

Development and production builds use Webpack because Turbopack repeatedly failed to launch its CSS worker on the audited Windows host. Fonts are local, so builds do not need Google Fonts access.

## Working with images

- **Import:** choose files, drop images or whole folders onto the page, or paste a copied image or screenshot (Ctrl/⌘+V). Dropping a file anywhere in the studio imports it rather than navigating away from your session.
- **Batch jobs:** GPS removal, sanitizing, presets, bulk edits, renames, and AI SEO run one image at a time. A running job can be cancelled from the header or the Batch Processing view; images already processed keep their changes.
- **AI SEO in bulk:** with a Gemini key configured, *Batch Edit → AI SEO* (or the command menu) generates a title, caption, alt text, and keywords for selected images. It can skip images that are already complete and either save results into the files or keep them as drafts. Key, permission, and quota errors stop the job instead of failing every remaining image.
- **Exports:** single images, a ZIP of all or selected images, a JSON catalog, and a CSV spreadsheet (titles, captions, keywords, attribution, camera data, GPS, privacy findings, and AI label findings). CSV cells that start with formula characters are prefixed so spreadsheets do not execute them.

## AI Label Remover

The **AI Label Remover** workspace (sidebar, mobile *More* sheet, command menu, or *Remove AI labels* in the Studio's privacy panel) finds and removes the metadata that platforms such as Instagram, Facebook, Threads, TikTok, and LinkedIn read to show "AI info" labels, plus the AI traces other tools leave behind.

Every import is scanned for:

| Signal | Where it is stored | Read by platforms for labels |
| --- | --- | --- |
| C2PA Content Credentials that declare AI (an AI digital source type anywhere in the manifest store, or an AI tool as claim generator) | JPEG APP11 JUMBF (including manifests split across packets), PNG `caBX`, WebP `C2PA`, or a byte search in other containers | Yes |
| IPTC digital source type (`trainedAlgorithmicMedia`, `compositeWithTrainedAlgorithmicMedia`, `algorithmicMedia`, …) | XMP | Yes |
| IPTC AI fields (`AISystemUsed`, `AIPromptInformation`, …) and the Chinese AIGC implicit label | XMP | Yes |
| Prompts, parameters, and workflow graphs (Stable Diffusion, ComfyUI, InvokeAI, NovelAI, Fooocus, Midjourney job text) | PNG text chunks, EXIF `UserComment` and descriptions, XMP | No |
| AI tool names (Firefly, DALL·E, Midjourney, Imagen, …), AI steps in edit history, AI keywords, and "AI-generated" text | EXIF software fields, XMP `CreatorTool` and `History`, keywords, JPEG comments | No |

Ambiguous words (for example *Firefly*, *Gemini*, *Flux*, or *Runway*) only count in software fields, so a photographer called "Firefly Studio" or a caption about a fashion runway is not flagged. Non-AI source types such as `digitalCapture` and `computationalCapture` are kept, and so are Content Credentials that cameras and phones add to ordinary photos.

Three cleaning levels are available; the choice is remembered in this browser:

- **AI labels only:** removes the signals above (and the XMP `dcterms:provenance` pointer to a removed manifest) and keeps camera data, location, copyright, SEO fields, and camera-signed Content Credentials. JPEG scan data, PNG `IDAT`, and WebP frames are copied unchanged.
- **AI labels + location & device:** also removes all Content Credentials, GPS and place names, serial numbers, owner, host computer, software, XMP document IDs, MakerNotes, and thumbnails.
- **Everything:** removes all metadata but keeps the ICC colour profile and orientation (no re-encoding), and optionally the creator and copyright, unless those name an AI tool.

After cleaning, the new file is parsed and scanned again. If any marker (or, for the location level, GPS or a device identifier) remains, the image is left unchanged and the job reports why. Each change is recorded in the image history and can be restored. HEIC, AVIF, and TIFF are converted to PNG; GIF is rejected to keep animation.

This removes metadata only. Invisible watermarks embedded in the pixels (such as Google SynthID) are not metadata and are not changed, and platforms can still label images from their own detection or posting disclosures.

## Data and privacy

- Parsing, metadata writing, cleaning, history, JSON, and ZIP generation run locally in JavaScript. Images and their history remain in memory and are lost when the page reloads. Original source files are never overwritten.
- Manual title, caption, alt text, and keyword editing works with AI disabled. Saving writes the draft into the downloadable image.
- Explicit Gemini analysis sends a re-encoded image preview directly to Google. Embedded source metadata is removed from that preview. Disabling AI cancels an active request; network failures, timeouts, malformed responses, and quota errors are surfaced without overwriting the draft.
- Canvas exports validate the actual encoded format and reject empty output. If a browser returns PNG for a JPEG request, sample imports retain native EXIF/GPS in PNG and Gemini receives the matching MIME type. Encoding has a timeout and reports failures.
- The optional API key, model selection, and presets are saved in browser local storage. This storage is not encrypted. Clear the key on shared devices.
- New API configurations default to `gemini-3.5-flash-lite`; current Flash models and legacy 2.5 models are selectable. Existing legacy model selections are retained when a key is already configured. Google restricts 2.5 model access for new projects; see the [model catalog](https://ai.google.dev/gemini-api/docs/models).
- Object URLs are released on replacement, removal, and queue clearing. Mutations are serialized and batch jobs report actual per-file successes and failures.
- History retains up to 50 restorable snapshots per image for this session. JSON exports contain current metadata and omit historical blobs and previous sensitive metadata.

## Format support

| Format | Read | Write / clean |
| --- | --- | --- |
| JPEG | EXIF, GPS, IPTC, XMP, camera metadata | Native EXIF and Unicode XMP edits; metadata packet removal |
| PNG | EXIF and uncompressed/compressed text chunks | XMP and native EXIF edits; metadata chunk removal preserving image data and animation |
| WebP | EXIF and XMP packets | XMP and native EXIF edits; metadata chunk removal preserving image data and animation |
| TIFF / HEIC | Metadata where supported by the parser | JSON export; cleaning converts to PNG if the browser can decode the image |
| AVIF | Metadata where supported by the parser | JSON export; cleaning converts to PNG when decoded by the browser |
| GIF | Preview and header inspection | JSON export; sanitization is rejected to avoid silently losing animation |

Imports validate file signatures and allow up to 100 MB per image, with a queue limit of 500 images and 256 MB of source files. Browser canvas conversion is limited to 64 megapixels. Corrupt or unsupported writes produce an error and retain the last valid image.

Custom tags are stored in a MetaForge XMP namespace. Standard title, description, creator, rights, and keywords are also written as Dublin Core XMP; accessible alt text uses the IPTC XMP accessibility property. Other applications may not display custom fields. Existing IPTC editorial fields migrate to XMP when edited.

Equivalent fields are kept in step: artist, copyright, and caption are written to native EXIF (JPEG, and PNG/WebP files that already carry EXIF) as well as IPTC and XMP, so other apps show the same values. EXIF text is stored as UTF-8, which ExifTool and current operating systems read, so `©` and non-Latin names survive. Date tags are written in the EXIF `YYYY:MM:DD HH:MM:SS` format; ISO dates are converted. The MetaForge XMP snapshot never contains GPS coordinates, and it records checksums of the native EXIF and the visible XMP fields: if another tool edits the file later, its values take precedence over the older snapshot on re-import. XMP written by other tools (for example Lightroom's `dc:title`, `dc:description`, `dc:subject`, and alt text) fills the SEO fields when IPTC is absent, and Stable Diffusion parameters stored in a Unicode EXIF `UserComment` are decoded.

GPS removal clears the native GPS directory and the MakerNotes and thumbnail that could repeat it, and removes coordinates and place names (city, country, location) from XMP and IPTC. Titles, captions, keywords, alt text, and copyright stay. If a location is still detected afterwards (for example inside free-form text), the image falls back to full cleaning. Social cleaning retains artist/copyright attribution where present. Full cleaning keeps rendering and colour information: the ICC profile and Adobe colour transform for JPEG, and colour chunks for PNG/WebP. Rotated JPEGs keep a minimal EXIF block with only the orientation, so they are not re-encoded; JFIF extension thumbnails, which can show an uncropped original, are removed.

Images appended after a JPEG and listed in its Multi-Picture Format (MPF) index, such as Ultra HDR gain maps and camera preview images, are kept when tags, SEO fields, or AI labels (*AI labels only*) are edited: the MPF offsets and primary size are updated, and the Ultra HDR markers in the main XMP (`hdrgm:Version` and the GContainer directory) are carried into the rewritten packet. GPS removal, serial removal, social and full cleaning, and the stricter AI levels drop these images and their index, because they can carry their own metadata. Data appended without an MPF index, such as motion-photo video, is removed by every write. Unsupported formats may be converted to PNG with a matching filename extension. The privacy score flags detected metadata; it does not analyze identifying content visible in the pixels.

ZIP exports disambiguate duplicate filenames. The sitemap builder validates the website URL and generates URLs under `/gallery/` and `/images/`; deploy your images at those paths before submission. Sitemap generation does not publish or upload images.

Fonts are bundled locally for reliable builds and served from this app. Geist's SIL Open Font License is included in `src/app/fonts/OFL.txt`.
