// `folio preview` — la boucle de travail de l'auteur.
//
// Sert le dossier, ouvre le navigateur, surveille les fichiers, recharge à chaque
// sauvegarde. Montre le HTML paginé, pas le PDF (décision #15) : ~200 ms par itération,
// et l'inspecteur Chrome reste disponible sur le contenu — donc une mauvaise coupure
// de page s'inspecte, ce qui est impossible sur un PDF.
//
// Ce n'est pas un confort : c'est ce qui REMPLACE le double-clic sur le HTML, devenu
// impossible (spike 04 — sous file://, Paged.js plante et rend une page blanche).
import { watch } from 'node:fs'
import { execFile } from 'node:child_process'
import { basename, dirname, resolve } from 'node:path'

import { serve } from './server.mjs'
import { mounts } from './render.mjs'

const INJECT = '<script type="module" src="/_folio/preview.js"></script>'

/** Ouvre l'URL dans le navigateur par défaut du système. */
function openBrowser(url) {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  execFile(command, [url], (error) => {
    if (error) console.warn(`folio : ouvrez ${url} à la main (${command} a échoué)`)
  })
}

export async function preview({ input, port, 'no-open': noOpen } = {}) {
  if (!input) throw new Error('preview : indiquez le document — folio preview <doc.html>')

  const documentPath = resolve(input)
  const documentDir = dirname(documentPath)
  const served = mounts(documentDir)

  const server = await serve(served, {
    port: port ? Number(port) : 0,
    inject: INJECT,
    live: true,
  })

  const url = `${server.origin}/${basename(documentPath)}`

  // On surveille le document ET le moteur : quand on travaille sur folio lui-même,
  // une retouche de engine.css doit se voir sans relancer la commande.
  const watched = [documentDir, served['/_folio']]
  let pending = null
  const watchers = watched.map((dir) =>
    watch(dir, { recursive: true }, (_event, file) => {
      if (file && /\.(pdf|map)$/.test(file)) return // artefacts, pas des sources
      clearTimeout(pending)
      // Un enregistrement déclenche souvent plusieurs événements ; on regroupe.
      pending = setTimeout(() => {
        console.log(`folio : ${file ?? 'modification'} → rechargement`)
        server.reload()
      }, 60)
    })
  )

  console.log(`folio : ${url}`)
  console.log(`folio : surveille ${watched.join(', ')} — Ctrl+C pour arrêter`)
  if (!noOpen) openBrowser(url)

  const stop = () => {
    clearTimeout(pending)
    watchers.forEach((w) => w.close())
    server.close()
  }
  process.on('SIGINT', () => {
    stop()
    process.exit(0)
  })

  // La commande ne rend jamais la main : c'est un serveur.
  return new Promise(() => {})
}
