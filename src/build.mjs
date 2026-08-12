// `folio build` — produit le PDF de livraison.
//
// ÉTAPE 1 DU PLAN. Non implémenté : c'est ici qu'on commence.
//
// La chaîne, dans cet ordre (docs/DECISIONS.md §5) :
//
//   1. serve()            monter le dossier du document + /_folio (moteur, polices)
//   2. findChrome()       + puppeteer.launch({ executablePath, headless: 'new' })
//   3. page.goto(origin)  waitUntil: 'networkidle0'
//   4. attente            page.waitForFunction(() => window[DONE_FLAG] === true)
//   5. relevé             index des pages `.pagedjs_landscape-plate_page` (pour l'étape 7)
//   6. débordement        checkOverflow() -> ÉCHEC si dépassement (décision #12)
//   7. page.pdf()         { printBackground: true, preferCSSPageSize: true }
//   8. applyRotation()    /Rotate sur les planches relevées en 5
//
// Chaque maillon est déjà prouvé dans docs/spikes/ — il s'agit de les assembler,
// pas de les inventer. Les spikes 01 et 03 contiennent le code exact des étapes 2 à 8.

export async function build(_options) {
  throw new Error("build : pas encore implémenté — étape 1 du plan (docs/DECISIONS.md §6)")
}
