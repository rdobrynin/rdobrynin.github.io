# Roman Dobrynin — CV (Antora + Tailwind CSS)

Live: **https://rdobrynin.github.io**

## Local Development with Live Reload

```bash
npm install
npm run dev
# → http://localhost:3000
```

Watches `modules/**/*.adoc` and `ui-bundle/layouts/*.hbs` — rebuilds Antora on every save, reloads browser via WebSocket.

## Production Build

```bash
npm run build
# → build/site/
```

## Deploy

Push to `main` — GitHub Actions builds and deploys automatically.  
First time: `Settings → Pages → Source → GitHub Actions`

## Structure

```
ui-bundle/layouts/default.hbs   ← Tailwind CSS layout (edit here)
ui-bundle/helpers/relativize.js ← required Antora helper
modules/ROOT/pages/             ← AsciiDoc content
dev.js                          ← live reload dev server
antora-playbook-local.yml       ← dev playbook (reads ui-bundle/ folder)
antora-playbook.yml             ← production playbook (reads ui-bundle.zip)
```
