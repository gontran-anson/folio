// Spike 3 : une page paysage dans un document portrait, par rotation du contenu
// + attribut /Rotate du PDF pour que le lecteur l'affiche à l'endroit.
import { createServer } from 'node:http'
import { readFile as read, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import puppeteer from 'puppeteer-core'
import { PDFDocument, degrees } from 'pdf-lib'

const here = new URL('.', import.meta.url).pathname
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '')
    // Le dossier du spike d'abord, puis la racine du dépôt (pour /node_modules).
    const body = await read(join(here, rel)).catch(() => read(join(here, '../../..', rel)))
    res.writeHead(200, { 'content-type': TYPES[extname(req.url)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('nope')
  }
})
await new Promise((r) => server.listen(0, r))

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
await page.goto(`http://localhost:${server.address().port}/rotate.html`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__pagedDone === true, { timeout: 20000 })

// Quelles pages du PDF sont des planches paysage ? Paged.js pose la classe,
// et l'ordre des .pagedjs_page correspond exactement à l'ordre des pages du PDF.
const plateIndexes = await page.evaluate(() =>
  [...document.querySelectorAll('.pagedjs_page')]
    .map((p, i) => (p.classList.contains('pagedjs_landscape-plate_page') ? i : -1))
    .filter((i) => i >= 0)
)
console.log('planches paysage détectées aux index :', plateIndexes)

// Preuve visuelle du rendu écran de la planche.
const pages = await page.$$('.pagedjs_page')
if (plateIndexes.length) await pages[plateIndexes[0]].screenshot({ path: join(here, 'plate.png') })

await page.pdf({ path: join(here, 'rotate-raw.pdf'), printBackground: true, preferCSSPageSize: true })
await browser.close()
server.close()

// Post-traitement : /Rotate 270 sur les planches, pour un affichage à l'endroit.
const doc = await PDFDocument.load(await read(join(here, 'rotate-raw.pdf')))
for (const i of plateIndexes) doc.getPage(i).setRotation(degrees(270))
await writeFile(join(here, 'rotate.pdf'), await doc.save())

const out = await PDFDocument.load(await read(join(here, 'rotate.pdf')))
console.log('--- pages finales ---')
console.table(
  out.getPages().map((p, i) => {
    const { width, height } = p.getSize()
    const rot = p.getRotation().angle
    // Ce que le lecteur voit réellement, une fois la rotation appliquée.
    const [vw, vh] = rot % 180 === 0 ? [width, height] : [height, width]
    return {
      page: i + 1,
      'feuille (mm)': `${(width / 72 * 25.4).toFixed(0)} x ${(height / 72 * 25.4).toFixed(0)}`,
      '/Rotate': rot,
      'vu par le lecteur': vw > vh ? 'PAYSAGE' : 'portrait',
    }
  })
)
