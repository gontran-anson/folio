// Localisation du Chrome système. On ne télécharge jamais de navigateur (décision #3) :
// `puppeteer-core` pilote celui qui est déjà installé sur le poste.
import { existsSync } from 'node:fs'

/** Emplacements usuels selon la plateforme. Premier trouvé gagne, CHROME_PATH l'emporte. */
const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

/**
 * @returns {string} chemin de l'exécutable Chrome
 * @throws  si aucun n'est trouvé — avec le remède dans le message, pas un code d'erreur nu.
 */
export function findChrome() {
  const found = CANDIDATES.find((p) => existsSync(p))
  if (found) return found
  throw new Error(
    'Chrome introuvable. Installez Google Chrome, ou exportez CHROME_PATH=/chemin/vers/chrome.'
  )
}
