// Le cœur de la chaîne : monter le document, le paginer dans Chrome, en tirer un PDF.
// `build` s'en sert pour produire un fichier ; `preview` réutilisera les mêmes montages.
import { createRequire } from 'node:module'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

import { findChrome } from './chrome.mjs'
import { serve } from './server.mjs'
import { DONE_FLAG, ERROR_FLAG, PLATE_PAGE_SELECTOR } from './paged.mjs'

const require = createRequire(import.meta.url)
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Les montages du serveur. Le document est à la racine ; le moteur et le polyfill
 * sont servis sous /_folio, à un chemin STABLE — c'est ce que les documents écrivent
 * dans leur <link> et leur <script>, et ça ne doit pas dépendre de l'endroit où folio
 * est installé.
 */
/**
 * Le champ `exports` de pagedjs ne déclare aucun sous-chemin, donc
 * `require.resolve('pagedjs/dist/…')` échoue. On résout le paquet, puis on remonte
 * à sa racine — c'est le seul point du code qui connaisse la mise en page interne
 * de pagedjs, et il est isolé ici exprès.
 */
function pagedjsDist() {
  const entry = require.resolve('pagedjs')
  const marker = `${sep}pagedjs${sep}`
  const at = entry.lastIndexOf(marker)
  if (at < 0) throw new Error(`pagedjs introuvable à partir de ${entry}`)
  return join(entry.slice(0, at + marker.length), 'dist')
}

export function mounts(documentDir) {
  return {
    '/': documentDir,
    '/_folio': resolve(packageRoot, 'engine'),
    '/_folio/vendor': pagedjsDist(),
  }
}

/**
 * Ouvre le document dans Chrome et attend la fin de la pagination.
 * @returns {Promise<{ page, browser, close: () => Promise<void> }>}
 */
export async function openPaginated(documentPath, { timeout = 30000 } = {}) {
  const documentDir = dirname(resolve(documentPath))
  const fileName = resolve(documentPath).slice(documentDir.length + 1)

  const server = await serve(mounts(documentDir))
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
  })

  const close = async () => {
    await browser.close().catch(() => {})
    server.close()
  }

  try {
    const page = await browser.newPage()
    const consoleErrors = []
    page.on('pageerror', (e) => consoleErrors.push(String(e.message ?? e)))
    page.on('requestfailed', (r) => consoleErrors.push(`${r.url()} — ${r.failure()?.errorText}`))

    await page.goto(`${server.origin}/${fileName}`, { waitUntil: 'networkidle0' })

    // On surveille les deux drapeaux : un échec de pagination doit remonter son
    // message, pas se traduire par un délai dépassé trente secondes plus tard.
    await page
      .waitForFunction(
        (done, failed) => window[done] === true || typeof window[failed] === 'string',
        { timeout },
        DONE_FLAG,
        ERROR_FLAG
      )
      .catch(() => {
        const detail = consoleErrors.length ? `\n  ${consoleErrors.join('\n  ')}` : ''
        throw new Error(
          `pagination non terminée après ${timeout} ms.${detail}\n` +
            "  Le document charge-t-il bien /_folio/engine.js ? (n'ouvrez jamais un document en file://)"
        )
      })

    const failure = await page.evaluate((flag) => window[flag], ERROR_FLAG)
    if (failure) throw new Error(`pagination échouée — ${failure}`)

    return { page, browser, close }
  } catch (error) {
    await close()
    throw error
  }
}

/**
 * Relève les pages qui sont des planches paysage.
 * L'ordre des .pagedjs_page dans le DOM est celui des pages du PDF (spike 03) :
 * c'est tout ce qui permet, après coup, de savoir lesquelles redresser.
 */
export async function findPlatePages(page) {
  return page.evaluate(
    (all, plate) =>
      [...document.querySelectorAll(all)]
        .map((el, i) => (el.matches(plate) ? i : -1))
        .filter((i) => i >= 0),
    '.pagedjs_page',
    PLATE_PAGE_SELECTOR
  )
}
