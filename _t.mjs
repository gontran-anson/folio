import { serve } from './src/server.mjs'
import { mounts } from './src/render.mjs'
import { findChrome } from './src/chrome.mjs'
import puppeteer from 'puppeteer'
import { dirname } from 'node:path'

const DOC = '/Users/pro/Documents/lab/office/schoollead/payement platform/docs/portail-operateur-api/index.html'
const server = await serve(mounts(dirname(DOC)))
const browser = await puppeteer.launch({ executablePath: await findChrome(), headless: 'new' })

for (const waitUntil of ['load', 'networkidle0']) {
  const page = await browser.newPage()
  const failed = []
  page.on('requestfailed', (r) => failed.push(r.url()))
  page.on('response', (r) => { if (r.status() === 404) failed.push('404 ' + r.url()) })
  const t0 = Date.now()
  await page.goto(`${server.origin}/index.html`, { waitUntil })
  const tGoto = Date.now() - t0
  let tPage = -1
  try {
    await page.waitForFunction(() => window.__folioPagedDone === true, { timeout: 40000, polling: 200 })
    tPage = Date.now() - t0
  } catch { /* timeout */ }
  console.log(`${waitUntil.padEnd(12)} goto=${(tGoto/1000).toFixed(1)}s  pagination=${tPage < 0 ? 'ÉCHEC' : (tPage/1000).toFixed(1)+'s'}  404=${failed.length}`)
  if (failed.length) console.log('   ', failed.slice(0, 3).join(', '))
  await page.close()
}
await browser.close(); server.close()
