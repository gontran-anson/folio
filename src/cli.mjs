#!/usr/bin/env node
// folio — trois commandes, pas quatre (décision #14).
import { build } from './build.mjs'
import { preview } from './preview.mjs'
import { init } from './init.mjs'

const USAGE = `folio — un HTML, une commande, un PDF paginé.

  folio build   <doc.html> [--open] [--out <fichier.pdf>] [--allow-overflow]
                Produit le PDF de livraison.

  folio preview <doc.html> [--port <n>] [--no-open]
                Sert le document, ouvre le navigateur, recharge à chaque sauvegarde.
                C'est la boucle de travail : le document se regarde dans le navigateur,
                pas dans le PDF.

  folio init    <dossier>
                Crée un nouveau document à partir du gabarit.

Chrome est requis. Il n'est jamais téléchargé : exportez CHROME_PATH si le vôtre
n'est pas à un emplacement usuel.`

function parse(argv) {
  const [command, ...rest] = argv
  const positional = []
  const flags = {}
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = rest[i + 1]
    if (next && !next.startsWith('--')) {
      flags[key] = next
      i++
    } else {
      flags[key] = true
    }
  }
  return { command, positional, flags }
}

const { command, positional, flags } = parse(process.argv.slice(2))

const COMMANDS = { build, preview, init }

if (!command || flags.help || command === 'help') {
  console.log(USAGE)
  process.exit(command ? 0 : 1)
}

if (!COMMANDS[command]) {
  console.error(`folio : commande inconnue « ${command} ».\n`)
  console.error(USAGE)
  process.exit(1)
}

try {
  await COMMANDS[command]({ input: positional[0], ...flags })
} catch (error) {
  // Un échec doit dire quoi faire, pas seulement qu'il a échoué.
  console.error(`folio : ${error.message}`)
  process.exit(1)
}
