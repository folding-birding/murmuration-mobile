# Murmuration archive viewer

A static GitHub Pages site for viewing completed paper birds from Cloudflare R2. It uses the existing webapp's animated FBX and generated texture, without contacting the GPU worker.

## Quick start

Requires Node.js 22.12+, npm, and [mkcert](https://github.com/FiloSottile/mkcert) for local HTTPS. On Windows, install mkcert with `winget install FiloSottile.mkcert`.

1. Set `r2BaseUrl` in `public/site-config.json` to the bucket's **public HTTPS root**, such as `https://pub-EXAMPLE.r2.dev` or `https://archive.example.com`. Do not append `/entries`, a bucket name, or a file name.
2. Enable public read access and configure R2 CORS to allow `GET` and `HEAD` from `https://folding-birding.github.io`. For local testing, also allow `https://127.0.0.1:4000` and `https://localhost:4000`. Allow the `Range` request header for partial audio requests. Adjust the deployed origin if the site's address changes.
3. Run:

```sh
npm ci
mkcert -install
npm run setup:https
npm run dev
```

Open `https://127.0.0.1:4000/entries/`. Enter a published bird ID, or open `/entries/?id=YYYYMMDDHHmmss` directly.

The public URL is not a secret. Never put the worker's S3 endpoint, access key, secret key, or signed URLs in this repository. An empty configuration allows viewing the form, but bird lookup requires a configured public URL.

Local development and preview servers both use HTTPS on port 4000. Certificates cover `localhost`, `127.0.0.1`, and `::1`, and are stored in the ignored `.certs/` folder. Run `npm run setup:https` to renew them. Missing certificates stop the local server with a setup message; production builds and GitHub Pages deployment do not require local certificates. Browser tests trust the local CA via `NODE_EXTRA_CA_CERTS` without disabling certificate validation.

## Behavior

The mobile interface follows the Mobile page in Figma: a gradient lookup screen with a centered white logo, followed by QR, 3D View, and AR camera slides. The 320 x 568 reference uses a 160 px lookup logo, a 256 x 32 px input row, 60 px result headers and footers, and a 205 px QR image. Icons and three pagination dots provide navigation. Accessible names and screen-reader descriptions remain centralized in `src/ui/ui-text.ts`; no separate language route is needed.

- `/` redirects to `/entries/`.
- `/entries/` shows the ID input form.
- A valid `?id=` loads the published ID/GUID pair, metadata, texture, birdsong, and optional colors.
- Invalid IDs, repeated `id` query parameters, or unpublished IDs return to `/entries/` with the query removed. Missing metadata does the same. Duplicate IDs in the archive manifest are treated as an archive error and retain the query for retry.
- Permission errors, network failures, malformed data, and server outages retain the ID and offer a retry.
- Swipe left/right in portrait or up/down in landscape through QR / 3D View / AR, or select the pagination dots. The transition follows the same axis: left/up opens the next view, right/down returns to the previous view. Rotation and double-tap playback use a square centered in the body, excluding the header and footer. Its side equals the smaller of the body's width and height, and updates when the device rotates. Inside this square, horizontal dragging always rotates the bird; swipe in the remaining body whitespace to change slides. Header and footer controls remain accessible. The gesture is determined where the touch starts and stays assigned until release. The rendered bird size is independent of this touch area. Pagination uses left/right arrow keys in portrait and up/down arrow keys in landscape, plus Home and End.
- In landscape, the header and footer become 60 px side rails, leaving the full height available to the body. The logo stays upright at the top of the header, with download below it and vertical pagination on the opposite side. Secondary landscape orientation swaps the rails; browsers without orientation direction information use the left header. The original top/bottom layout returns in portrait.
- AR shows live camera video with a MediaPipe hand skeleton overlay. Opening the tab requests the rear camera when available, without microphone access; front-facing video is mirrored when reported by the device. Leaving AR or hiding the browser stops all tracks. Interrupted or failed camera access can be retried using the restart control. Camera frames are not recorded or uploaded. Rotation keeps the current stream, and the camera area supports the same orientation-dependent page swipes.
- The bird repeats its hover animation. Drag or use arrow keys to turn it. Double-tap or press Enter while focused to hear its birdsong. Leaving the slide stops audio and releases the WebGL scene.
- The entry screen displays the worker's archived `outputs/qr.svg`, preserving the same QR code as the original ticket without generating a new one in the browser.
- A failed 3D view can be retried; QR and HTML export remain available.
- Output URLs include `updatedAt` to refresh regenerated files while retaining the same ID.
- The header's download button saves `murmuration-{id}.html`. This standalone file embeds the texture, WAV, QR, colors, metadata, animated FBX, viewer code, styles, and fonts. It works offline when opened in a browser that supports JavaScript and WebGL. The QR still encodes the original public page address. Generic file-preview apps may not execute the viewer.

## R2 layout

```text
entries/
  manifest.json
  YYYYMMDDHHmmss/
    metadata.json
    outputs/
      texture.png
      audio.wav
      colors.json
      qr.svg
```

The manifest is an array of `{ "id": "...", "guid": "..." }` objects. Metadata contains `id`, `guid`, `createdAt`, and `updatedAt`. Colors use `{ "colors": [{ "region": "wing", "hex": "#63B4FF", "rgb": [99, 180, 255] }] }`; supported regions are head, body, wing, and tail.

The manifest is checked before metadata because the worker publishes it after the entry files. All requests are read-only. No inputs or processed files are required. Public R2 objects are publicly accessible; CORS governs browser access and is not authentication.

Cloudflare's `r2.dev` URL is intended for development and is rate limited. Use a public custom domain for production when available. See [public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) and [CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/).

## GitHub Pages

1. Configure the public R2 URL and CORS.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main`, or run the **Deploy GitHub Pages** workflow manually.

The workflow tests and builds the site, then deploys `dist`. The output contains a real `entries/index.html`, so direct QR links work without a SPA fallback. Asset paths are derived from the Pages configuration and support a project-site prefix.

**Domain:** This repository publishes at `https://folding-birding.github.io/murmuration-mobile/`. Worker QR links use `https://folding-birding.github.io/murmuration-mobile/?id=<archiveId>`; the root page redirects to `entries/` while preserving the ID.

## Development and verification

```sh
npm test
npm run build
npm run test:e2e
```

Browser tests use installed Google Chrome and mock R2 responses. Locally, they reuse an existing server on port 4000 or start a preview server; CI always starts a fresh preview server. They never stop a server started by the user. They load the actual FBX and check audio, rotation, mobile touch, invalid IDs, and retry behavior. Screenshots are written to `.qa/`. They do not invoke image generation, the worker, or a live R2 bucket.

Run `npm run preview` to preview the production output manually. Set `VITE_BASE_PATH` to a value such as `/murmuration-mobile/` before building under a project-site prefix.

After uploading a completed bird to R2, run `npm run build` and `npm run test:live` to verify the actual public archive in desktop and mobile Chrome layouts. This opt-in, read-only test uses the first manifest entry, or the ID specified by `LIVE_ARCHIVE_ID`. It checks the QR image, animation, rotation, audio playback and decoding, manual lookup, and missing-ID redirect. It saves screenshots to `.qa/live-*.png` and does not upload or generate any archive data. The local origin `https://127.0.0.1:4000` must be allowed by R2 CORS.

`npm run test:offline` verifies standalone exports against the public archive. It reuses a running local server on port 4000 or starts a preview server, downloads an HTML file, and opens it from disk in a fresh offline browser context. It compares embedded media hashes with R2 originals, checks animation and playback, and rejects any HTTP requests. Files and screenshots are saved under `.qa/offline/`.

Downloaded HTML is view-only: neither the download button and its icon nor the HTML export handler is included. It retains the QR and 3D views with responsive side rails, without download controls or camera access.

The offline runtime is generated during production builds and on demand during development. It is fetched only when exporting, so its embedded model and fonts do not increase the initial lookup download. Generated HTML files contain several megabytes of embedded assets and preserve the data as it was downloaded.

## Source map

```text
src/
  app/       Online lookup, loading, and error screens
  archive/   Entry types, ID validation, and R2 loading
  camera/    Camera lifecycle, MediaPipe worker, and hand overlay
  entry/     Shared QR/3D presentation, swipes, and birdsong playback
  viewer/    FBX animation, texture rendering, and rotation gestures
  offline/   Standalone HTML export and its independent entry point
  ui/        Shared icons, text, variables, and global styles
  assets/    Model, interface assets, and the static Pretendard font
  main.tsx   Online application entry point
```

Feature styles live beside their components. `src/ui/ui-text.ts` holds interface copy and accessibility labels; `src/ui/ui-variable.ts` holds visual variables and applies them to both online and offline pages.

The online app loads an entry through `archive/client.ts` and passes it to `entry/EntryViewer.tsx`. The saved HTML passes embedded entry data to the same viewer. The viewer does not import archive fetching or export controls. Only the online app adds the download button, keeping its code, icon, and styles out of saved HTML.

- `entries/index.html`: public entry page.
- `public/site-config.json`: public R2 root URL.
- `scripts/`: local certificate setup and offline runtime bundling.
- `tooling/offline-plugin.ts`: Vite integration for offline runtime generation.
- `test/`: unit and browser tests, fixtures, configurations, and the HTTPS-aware test runner.

The existing Murmuration model and brand assets are reused. Pretendard's license is included in `public/Pretendard-LICENSE.txt`.

## Hand tracking

The AR tab runs `@mediapipe/tasks-vision` 1.2.2 Hand Landmarker in a module Web Worker, using the CPU/WASM delegate. It detects up to two hands, each with 21 landmarks. Image coordinates align the overlay with the centered camera cover crop; hand-centered world coordinates control the depth cues on the joints. These estimated 3D coordinates are relative to each hand, not a world-anchored AR pose. This version visualizes tracking without attaching the bird or recognizing gestures.

There is no fixed inference FPS cap. The tracker processes the latest available camera frame when idle, with one frame in flight and a 640 px input longest edge. Actual throughput depends on the camera, display refresh, and device performance. The bottom debug overlay shows camera resolution, the transferred inference input resolution, and completed tracking frames per second measured over one-second intervals; it does not show the camera's advertised frame rate. Camera images stay in the browser. The model and WASM are served from the same site, load only on the AR tab, and are excluded from downloaded HTML. Model initialization or inference failures leave the camera active and show a retry icon. Leaving AR or pausing the camera terminates the worker and releases its memory.

- Model: [Google Hand Landmarker, float16 v1](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task), stored in `src/assets/models/hand_landmarker.task` (about 7.8 MB).
- Runtime: the pinned npm package supplies the WASM assets; Vite emits them with versioned filenames (about 14.6 MB uncompressed).
- Reference: [MediaPipe Hand Landmarker documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker).
- Test image: [Google MediaPipe thumb-up fixture](https://storage.googleapis.com/mediapipe-assets/thumb_up.jpg), stored in `test/fixtures/hand.jpg` and used for actual model inference in `test/hand-tracking.spec.ts`. It is not shipped to the application.

`npm run test:e2e -- hand-tracking.spec.ts` verifies real hand detection, mirrored and rotated alignment, model-load retry, and worker disposal. Browser tests do not access a physical camera; actual mobile performance and camera permissions should also be checked on the target phone.
