# Murmuration archive viewer

## Project setup

Requires Node.js 22.12+, npm, and mkcert. On Windows, install mkcert with `winget install FiloSottile.mkcert`.

```sh
npm ci
mkcert -install
npm run setup:https
npm run dev
```

The development server uses HTTPS on port 4000. Local certificates are stored in the ignored `.certs/` folder. Production builds do not require local certificates.

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The project uses React, TypeScript, Vite, Three.js, Vitest, and Playwright. Test scripts are kept in `test/`. The GitHub Pages workflow builds and deploys `dist/`.

## Archive lookup and QR

Set `r2BaseUrl` in `public/site-config.json` to the public HTTPS bucket root. Configure R2 CORS to allow GET and HEAD from the deployed site and local HTTPS origin. Never put S3 credentials in this file.

Open `/entries/` to enter a 14-digit UTC bird ID, or `/entries/?id=YYYYMMDDHHmmss` to open its archived QR. Invalid or unpublished IDs return to the form. Connection failures retain the ID and offer a retry. The header logo returns to the form.

Worker QR links use `https://folding-birding.github.io/murmuration-mobile/?id=<archiveId>`. The root page redirects to `entries/` while preserving the ID.

`src/archive/` handles archive validation and loading, `src/app/` handles lookup and request state, and `src/entry/` displays the entry. Shared text, visual variables, icons, and styles live in `src/ui/`. The static Pretendard font and interface assets live in `src/assets/`; its license is included in `public/Pretendard-LICENSE.txt`.

## 3D viewer

Switch between QR and 3D using the pagination dots or a horizontal swipe. The generated texture is applied to the paper bird's animated FBX, which repeats its hover animation. Materials render front faces only.

Drag inside the centered square to rotate the bird; double-tap to play its birdsong. The square uses the shorter body dimension, excluding the 60 px header and footer, and resizes with device orientation. Swipes outside this area change views. Keyboard users can turn the focused model with arrow keys and play audio with Enter. Leaving the 3D view stops audio and releases the scene.

`src/viewer/` owns model loading, rendering, and rotation. `src/entry/` owns view navigation and birdsong playback. Model loading is deferred until the 3D view is opened.

Run `npm run build` and `npm run test:e2e` for mocked archive tests covering desktop and touch interactions. The optional `npm run test:live` checks a published R2 entry in desktop and mobile layouts; set `LIVE_ARCHIVE_ID` to select an entry. It reads existing archive files without creating or uploading data.
