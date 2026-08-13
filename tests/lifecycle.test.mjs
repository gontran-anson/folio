// Le cycle de vie du navigateur.
//
// Régression de la v0.7.1 : un build interrompu laissait dix processus Chromium
// vivants, qui se disputaient ensuite le processeur. Le symptôme est indirect — ça
// se lit comme un moteur lent, pas comme une fuite — donc il faut un test qui
// regarde la vraie cause, les processus, et pas un chronomètre.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURE = join(RACINE, 'tests', 'fixtures', 'minimal.html')

/** Compte les Chromium de test vivants. Repose sur `ps` — Unix uniquement. */
async function navigateursVivants() {
  const { stdout } = await run('/bin/sh', ['-c', 'ps ax -o command | grep -c "[C]hrome for Testing" || true'])
  return Number(stdout.trim())
}

const patiente = (ms) => new Promise((r) => setTimeout(r, ms))

test("un build interrompu ne laisse aucun navigateur derrière lui", { timeout: 90000 }, async () => {
  const avant = await navigateursVivants()

  const build = spawn('node', [join(RACINE, 'src', 'cli.mjs'), 'build', FIXTURE], { stdio: 'ignore' })

  // On attend que le navigateur soit réellement lancé, sinon on ne teste rien.
  let lance = false
  for (let i = 0; i < 30 && !lance; i++) {
    await patiente(500)
    lance = (await navigateursVivants()) > avant
  }
  assert.ok(lance, 'le navigateur aurait dû démarrer avant qu’on interrompe')

  build.kill('SIGTERM')

  // La fermeture n'est pas instantanée : Chrome met quelques secondes à s'arrêter.
  let restants = -1
  for (let i = 0; i < 30; i++) {
    await patiente(500)
    restants = await navigateursVivants()
    if (restants <= avant) break
  }
  assert.ok(
    restants <= avant,
    `${restants - avant} processus Chromium ont survécu à l’interruption`
  )
})
