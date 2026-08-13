import puppeteer from 'puppeteer'
const here = new URL('.', import.meta.url).pathname
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 160)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)) })
page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url().split('/').pop() + ' — ' + r.failure()?.errorText))

async function probe(url, label) {
  errs.length = 0
  await page.goto(url, { waitUntil: 'networkidle0' })
  let done = true
  try { await page.waitForFunction(() => window.__pagedDone === true, { timeout: 8000 }) } catch { done = false }
  const r = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    return {
      pages: document.querySelectorAll('.pagedjs_page').length,
      pieDePage: document.querySelector('.pagedjs_margin-bottom-right .pagedjs_margin-content')?.textContent ?? null,
      couleurH1: h1 ? getComputedStyle(h1).color : 'PAS DE H1',
    }
  })
  console.log(`\n=== ${label} ===`)
  console.log('pagination terminée :', done)
  console.log(JSON.stringify(r, null, 2))
  console.log('erreurs :', errs.length ? errs : 'aucune')
}

await probe('file://' + here + 'file-test.html', 'file://  (double-clic)')
await browser.close()
