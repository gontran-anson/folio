// Quel navigateur rend le document — et pourquoi ce n'est plus celui du poste.
//
// RÉVISION DE LA DÉCISION #3 (2026-08-13). folio pilotait le Chrome installé sur la
// machine, pour éviter un téléchargement de 180 Mo. Le prix, accepté à l'époque : deux
// personnes rendant le même document pouvaient obtenir deux paginations différentes,
// donc deux PDF différents — et un sommaire dont les numéros ne correspondent plus.
//
// Une fois les polices embarquées (décision #13), la version de Chrome restait la
// DERNIÈRE cause de divergence, et le dernier obstacle à une régénération en CI.
// folio embarque donc désormais son propre Chromium, épinglé par la version de
// puppeteer. Le coût est un téléchargement unique, mis en cache pour toute la machine ;
// le gain est qu'un PDF ne dépend plus de qui l'a produit.
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer'

/**
 * Échappatoire explicite. Elle reste utile — poste hors ligne, Chromium non disponible
 * pour l'architecture — mais elle ANNULE la garantie ci-dessus, donc elle le dit.
 */
export async function findChrome() {
  const override = process.env.CHROME_PATH
  if (override) {
    if (!existsSync(override)) {
      throw new Error(`CHROME_PATH pointe sur un fichier absent : ${override}`)
    }
    console.warn(
      'folio : CHROME_PATH force un navigateur du poste — le rendu n’est plus garanti\n' +
        '        identique à celui des autres machines. Retirez la variable pour revenir\n' +
        '        au Chromium embarqué.'
    )
    return override
  }

  // `executablePath()` est ASYNCHRONE depuis puppeteer 25 : le traiter comme une
  // valeur donne un chemin « Promise { <pending> } » et une erreur trompeuse.
  const bundled = await puppeteer.executablePath()
  if (!existsSync(bundled)) {
    throw new Error(
      'Chromium embarqué introuvable. Lancez `npx puppeteer browsers install chrome`,\n' +
        '  ou exportez CHROME_PATH pour utiliser le navigateur du poste (le rendu ne sera\n' +
        '  alors plus garanti identique d’une machine à l’autre).'
    )
  }
  return bundled
}

/** La version réellement utilisée, pour qu'un PDF puisse dire d'où il vient. */
export async function chromeVersion(browser) {
  try {
    return await browser.version()
  } catch {
    return 'inconnue'
  }
}
