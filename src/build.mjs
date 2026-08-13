// `folio build` — produit le PDF de livraison.
import { writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { basename, extname, resolve } from 'node:path'

import { openPaginated, findPlatePages } from './render.mjs'
import { checkOverflow, formatOverflow, TOLERANCE_MM } from './overflow.mjs'
import { applyRotation } from './rotate.mjs'

/** L'impression d'un long document dépasse largement la limite par défaut de 30 s. */
const PDF_TIMEOUT = 180_000

export async function build({ input, out, open, 'allow-overflow': allowOverflow, timeout } = {}) {
  if (!input) throw new Error('build : indiquez le document — folio build <doc.html>')

  const documentPath = resolve(input)
  const pdfPath = resolve(out ?? documentPath.replace(new RegExp(`${extname(documentPath)}$`), '.pdf'))
  if (pdfPath === documentPath) throw new Error(`build : la sortie écraserait la source (${pdfPath})`)

  const { page, close } = await openPaginated(documentPath, {
    timeout: timeout ? Number(timeout) : undefined,
  })

  try {
    const plates = await findPlatePages(page)

    // Le contrôle passe AVANT le rendu : on ne produit pas un fichier qu'on
    // s'apprête à déclarer invalide (décision #12).
    const overflows = await checkOverflow(page)
    if (overflows.length && !allowOverflow) throw new Error(formatOverflow(overflows))
    if (overflows.length) {
      console.warn(`folio : ${overflows.length} débordement(s) ignoré(s) — --allow-overflow`)
    }

    // `timeout` explicite : l'impression a sa PROPRE limite de protocole, distincte de
    // celle de la pagination, et sa valeur par défaut de 30 s ne suffit pas à un document
    // long. L'échec ne disait rien d'utile — un « Timed out after waiting 30000ms » nu,
    // sans mention du PDF. Vu sur 34 pages.
    const raw = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      timeout: PDF_TIMEOUT,
    })
    await writeFile(pdfPath, await applyRotation(raw, plates))

    const pages = await page.evaluate(() => document.querySelectorAll('.pagedjs_page').length)
    const plateNote = plates.length ? `, dont ${plates.length} planche(s) paysage` : ''
    console.log(`folio : ${pages} page(s)${plateNote} → ${pdfPath}`)
    console.log(`folio : rendu par ${page.folioBrowserVersion ?? 'un navigateur inconnu'}`)

    if (open) execFile('open', [pdfPath], () => {})
    return { pdfPath, pages, plates }
  } finally {
    await close()
  }
}

export { TOLERANCE_MM }
