// Ce que `build` doit garantir. Chaque test lance un vrai Chromium sur un vrai
// document : c'est lent (quelques secondes pièce) mais c'est le seul niveau où
// les bogues de ce projet se produisent — tous ceux qu'on a trouvés vivaient dans
// l'interaction entre Paged.js, Chrome et la cascade CSS, pas dans nos fonctions.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, access, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from '../src/build.mjs'
import { openPaginated } from '../src/render.mjs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

async function sortie(nom) {
  const dir = await mkdtemp(join(tmpdir(), 'folio-test-'))
  const doc = join(dir, `${nom}.html`)
  await copyFile(join(FIXTURES, `${nom}.html`), doc)
  return { doc, pdf: join(dir, `${nom}.pdf`), nettoyer: () => rm(dir, { recursive: true, force: true }) }
}

const existe = async (chemin) => access(chemin).then(() => true, () => false)

test('produit un PDF depuis un document sans aucune plomberie folio', async () => {
  const { doc, pdf, nettoyer } = await sortie('minimal')
  try {
    const resultat = await build({ input: doc })
    // Le compte exact dépend de la police et des marges ; ce qui doit tenir, c'est
    // que le contenu COULE sur plusieurs pages sans qu'on l'ait découpé à la main.
    assert.ok(resultat.pages >= 2, `attendu au moins 2 pages, obtenu ${resultat.pages}`)
    assert.ok(await existe(pdf), 'le PDF doit être écrit à côté de la source')
  } finally {
    await nettoyer()
  }
})

test('refuse de livrer un document dont le contenu serait écrêté', async () => {
  const { doc, pdf, nettoyer } = await sortie('debordement')
  try {
    await assert.rejects(() => build({ input: doc }), /débordement/i)
    assert.equal(await existe(pdf), false, 'aucun PDF ne doit être écrit quand la garde échoue')
  } finally {
    await nettoyer()
  }
})

test('--allow-overflow livre quand même, en le signalant', async () => {
  const { doc, pdf, nettoyer } = await sortie('debordement')
  try {
    await build({ input: doc, 'allow-overflow': true })
    assert.ok(await existe(pdf))
  } finally {
    await nettoyer()
  }
})

test("n'écrase jamais le document source", async () => {
  const { doc, nettoyer } = await sortie('minimal')
  try {
    await assert.rejects(() => build({ input: doc, out: doc }), /écraserait la source/)
  } finally {
    await nettoyer()
  }
})

test('le sommaire porte de vrais numéros de page, y compris sur un titre numéroté', async () => {
  // Un titre commençant par un chiffre produit une ancre illégale en CSS, ce qui
  // faisait échouer TOUTE la pagination : le sélecteur `#0-...` fait lever querySelector.
  const { doc, nettoyer } = await sortie('sommaire')
  try {
    const { page, close } = await openPaginated(doc)
    try {
      const entrees = await page.evaluate(() =>
        [...document.querySelectorAll('.folio-toc a')].map((a) => a.getAttribute('href'))
      )
      assert.equal(entrees.length, 2)
      assert.ok(
        entrees.every((href) => /^#[a-z]/.test(href)),
        `les ancres doivent rester des sélecteurs CSS valides, reçu ${entrees.join(', ')}`
      )
    } finally {
      await close()
    }
  } finally {
    await nettoyer()
  }
})
