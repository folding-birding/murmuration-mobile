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
