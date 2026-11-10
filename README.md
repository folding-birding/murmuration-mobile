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
