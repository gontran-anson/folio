// Spike : Paged.js résout-il target-counter (numéros de page dans un sommaire) ?
// Sert le dossier en http, attend la fin de la pagination, imprime + capture.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import puppeteer from 'puppeteer-core'

const here = new URL('.', import.meta.url).pathname
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '')
  try {
    // Le dossier du spike d'abord, puis la racine du dépôt (pour /node_modules).
    const body = await readFile(join(here, rel)).catch(() => readFile(join(here, '../../..', rel)))
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('nope')
  }
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean)
const { existsSync } = await import('node:fs')
const executablePath = CANDIDATES.find((p) => existsSync(p))
console.log('Chrome:', executablePath)

const browser = await puppeteer.launch({ executablePath, headless: 'new' })
const page = await browser.newPage()
page.on('console', (m) => console.log('  [page]', m.text()))
await page.goto(`http://localhost:${port}/doc.html`, { waitUntil: 'networkidle0' })

// Le signal déterministe : le hook `after` de PagedConfig, posé dans le document.
await page.waitForFunction(() => window.__pagedDone === true, { timeout: 15000 })

const report = await page.evaluate(() => {
  const links = [...document.querySelectorAll('.toc a')]
  return {
    pages: document.querySelectorAll('.pagedjs_page').length,
    toc: links.map((a) => ({
      href: a.getAttribute('href'),
      after: getComputedStyle(a, '::after').content,
    })),
    // ce que le lecteur verra vraiment : le texte rendu de la ligne de sommaire
    rendered: links.map((a) => a.parentElement.innerText),
  }
})
console.log(JSON.stringify(report, null, 2))

await page.pdf({ path: join(here, 'out.pdf'), printBackground: true, preferCSSPageSize: true })
const first = await page.$('.pagedjs_page')
await first.screenshot({ path: join(here, 'toc.png') })

await browser.close()
server.close()
