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

The regression suite uses Node's assertions and TypeScript already installed in this project. It verifies actual image metadata bytes, Unicode round trips, location cleaning, immutable history, concurrent edits, batch results, presets, filenames, and sitemap validation. Browser decoding is verified separately from the test suite's Image stub.

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

## Data and privacy

- Parsing, metadata writing, cleaning, history, JSON, and ZIP generation run locally in JavaScript. Images and their history remain in memory and are lost when the page reloads. Original source files are never overwritten.
- Manual title, caption, alt text, and keyword editing works with AI disabled. Saving writes the draft into the downloadable image.
- Explicit Gemini analysis sends a re-encoded image preview directly to Google. Embedded source metadata is removed from that preview. Disabling AI cancels an active request; network failures, timeouts, malformed responses, and quota errors are surfaced without overwriting the draft.
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

GPS cleaning also removes secondary packets, MakerNotes, and thumbnails that could duplicate coordinates; PNG and WebP GPS cleaning removes their descriptive metadata. Social cleaning retains artist/copyright attribution where present. Full cleaning retains rendering and color information for PNG/WebP. Rotated JPEGs may require re-encoding to preserve their displayed orientation. Unsupported formats may be converted to PNG with a matching filename extension. The privacy score flags detected metadata; it does not analyze identifying content visible in the pixels.

ZIP exports disambiguate duplicate filenames. The sitemap builder validates the website URL and generates URLs under `/gallery/` and `/images/`; deploy your images at those paths before submission. Sitemap generation does not publish or upload images.

Fonts are bundled locally for reliable builds and served from this app. Geist's SIL Open Font License is included in `src/app/fonts/OFL.txt`.
