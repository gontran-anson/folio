// `folio init <dossier>` — crée un nouveau document à partir de template/.
//
// Volontairement écrit EN DERNIER : on ne peut pas générer un bon squelette tant
// qu'on ne sait pas ce qu'est un bon squelette. Il porte deux choses que l'auteur
// ne devinerait pas, et dont l'oubli donne une page blanche sans message :
// la déclaration `@page { size }`, que folio n'impose pas exprès, et le fait qu'on
// n'ouvre jamais le document en `file://`.
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE = join(packageRoot, 'template')

/** Titre lisible tiré du nom de dossier : `contrat-operateur` -> `Contrat operateur`. */
function titleFrom(name) {
  const words = name.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** La version installée de folio, pour épingler un tag plutôt qu'une branche. */
async function currentTag() {
  const { version } = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
  return `v${version}`
}

export async function init({ input, title } = {}) {
  if (!input) throw new Error('init : indiquez le dossier — folio init <dossier>')

  const target = resolve(input)
  const name = basename(target)

  // On ne crée jamais par-dessus du travail existant.
  try {
    await access(target)
    const existing = await readdir(target)
    if (existing.length > 0) {
      throw new Error(`init : ${target} existe et n'est pas vide — refus d'écraser`)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  await mkdir(target, { recursive: true })

  const replacements = {
    __TITRE__: title ?? titleFrom(name),
    __NOM__: name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    __TAG__: await currentTag(),
  }

  for (const file of ['index.html', 'package.json']) {
    let content = await readFile(join(TEMPLATE, file), 'utf8')
    for (const [token, value] of Object.entries(replacements)) {
      content = content.replaceAll(token, value)
    }
    await writeFile(join(target, file), content)
  }

  console.log(`folio : document créé dans ${target}`)
  console.log('')
  console.log(`  cd ${input}`)
  console.log('  npm install        # installe folio depuis son tag')
  console.log('  npm run preview    # sert le document et ouvre le navigateur')
  console.log('')
  console.log("  N'ouvrez pas index.html en double-cliquant : la page resterait blanche.")

  return { target }
}
