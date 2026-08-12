// Spike 2 : Chrome accepte-t-il des tailles de page mixtes dans UN seul PDF ?
import { createServer } from 'node:http'
import { readFile, existsSync } from 'node:fs'
import { readFile as read } from 'node:fs/promises'
import { extname, join } from 'node:path'
import puppeteer from 'puppeteer-core'

const here = new URL('.', import.meta.url).pathname
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '')
  try {
    // Le dossier du spike d'abord, puis la racine du dépôt (pour /node_modules).
    const body = await read(join(here, rel)).catch(() => read(join(here, '../../..', rel)))
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('nope')
  }
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
await page.goto(`http://localhost:${port}/mixed.html`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__pagedDone === true, { timeout: 20000 })

// Ce que Paged.js a produit à l'écran : dimensions de chaque page box.
const domPages = await page.evaluate(() =>
  [...document.querySelectorAll('.pagedjs_page')].map((p) => ({
    classes: [...p.classList].filter((c) => c.includes('named') || c.includes('mockup')).join(' '),
    w: Math.round(p.getBoundingClientRect().width),
    h: Math.round(p.getBoundingClientRect().height),
  }))
)
console.log('--- pages dans le DOM (rendu écran) ---')
console.table(domPages)

await page.pdf({ path: join(here, 'mixed.pdf'), printBackground: true, preferCSSPageSize: true })
await browser.close()
server.close()

// Ce que Chrome a réellement écrit dans le PDF : la MediaBox de chaque page.
const pdf = await read(join(here, 'mixed.pdf'), 'latin1')
const boxes = [...pdf.matchAll(/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map(
  (m) => {
    const w = (+m[3] - +m[1]) / 72 * 25.4
    const h = (+m[4] - +m[2]) / 72 * 25.4
    return { mm: `${w.toFixed(0)} x ${h.toFixed(0)}`, orientation: w > h ? 'PAYSAGE' : 'portrait' }
  }
)
console.log('--- MediaBox réelles dans le PDF ---')
console.table(boxes)
