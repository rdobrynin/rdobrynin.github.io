#!/usr/bin/env node
'use strict'

/**
 * dev.js — Live reload dev server for Antora CV
 *
 * Watches: modules/**\/*.adoc, ui-bundle/layouts/**.hbs, ui-bundle/helpers/**.js
 * On change: rebuilds Antora (+ rezips ui-bundle if UI files changed)
 * Serves: build/site on http://localhost:3000 with WebSocket live reload
 */

const { execSync, spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')
const WebSocket = require('ws')
const chokidar = require('chokidar')

const PORT = 3000
const WS_PORT = 35729
const SITE_DIR = path.join(__dirname, 'build/site')
const PLAYBOOK = 'antora-playbook-local.yml'

// ── MIME types ────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
}

// ── Static file server ────────────────────────────────────────
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]
  if (urlPath === '/') urlPath = '/index.html'

  // Try exact path, then with .html, then index.html in dir
  const candidates = [
    path.join(SITE_DIR, urlPath),
    path.join(SITE_DIR, urlPath + '.html'),
    path.join(SITE_DIR, urlPath, 'index.html'),
  ]

  let filePath = null
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) { filePath = c; break }
  }

  if (!filePath) {
    res.writeHead(404)
    return res.end('Not found')
  }

  const ext = path.extname(filePath)
  let content = fs.readFileSync(filePath)

  // Inject live reload snippet into HTML
  if (ext === '.html') {
    const snippet = `<script>
      (function(){
        var ws = new WebSocket('ws://localhost:${WS_PORT}');
        ws.onmessage = function(e){ if(e.data === 'reload') location.reload(); };
        ws.onclose   = function(){ setTimeout(function(){ location.reload(); }, 1000); };
      })();
    </script>`
    content = content.toString().replace('</body>', snippet + '</body>')
  }

  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  res.end(content)
})

// ── WebSocket server for live reload ─────────────────────────
const wss = new WebSocket.Server({ port: WS_PORT })

function broadcast(msg) {
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg) })
}

// ── Build logic ───────────────────────────────────────────────
let building = false
let pendingBuild = false

function build(needsUiRebuild) {
  if (building) { pendingBuild = true; return }
  building = true

  const label = needsUiRebuild ? 'UI + Antora' : 'Antora'
  const t = Date.now()
  process.stdout.write(`\n[dev] Building ${label}... `)

  try {
    if (needsUiRebuild) {
      execSync('cd ui-bundle && zip -r ../ui-bundle.zip .', { stdio: 'pipe' })
    }
    execSync(`npx antora ${PLAYBOOK} --log-level warn`, { stdio: 'pipe' })
    console.log(`done (${Date.now() - t}ms)`)
    broadcast('reload')
  } catch (err) {
    console.log('FAILED')
    console.error(err.stderr?.toString() || err.message)
  }

  building = false
  if (pendingBuild) {
    pendingBuild = false
    build(false)
  }
}

// ── Initial build ─────────────────────────────────────────────
console.log('[dev] Initial build...')
try {
  execSync(`npx antora ${PLAYBOOK} --log-level warn`, { stdio: 'inherit' })
} catch(e) {
  console.error('Initial build failed — fix errors and restart')
  process.exit(1)
}

// ── Watcher ───────────────────────────────────────────────────
const watcher = chokidar.watch([
  'modules/**/*.adoc',
  'modules/**/nav.adoc',
  'antora.yml',
  'ui-bundle/layouts/**/*.hbs',
  'ui-bundle/helpers/**/*.js',
], {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
})

watcher.on('all', (event, filePath) => {
  const isUI = filePath.startsWith('ui-bundle')
  console.log(`[dev] ${event}: ${filePath}`)
  // Use zip-based rebuild only if UI file changed; otherwise use local folder directly
  build(false) // antora-playbook-local.yml reads ui-bundle/ folder directly — no zip needed
})

// ── Start server ──────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n✓ Dev server running at http://localhost:${PORT}`)
  console.log('  Watching: modules/**/*.adoc, ui-bundle/**')
  console.log('  Press Ctrl+C to stop\n')
})

process.on('SIGINT', () => { watcher.close(); server.close(); process.exit(0) })
