// Serveur HTTP local, obligatoire — pas un confort.
//
// Sous `file://`, Paged.js lit les feuilles de style par XHR, Chrome bloque la requête,
// le polyfill plante et rend ZÉRO page (spike 04). Tout rendu passe donc par http://localhost,
// y compris `build`. C'est aussi ce qui sert le moteur et les polices.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
}

/** Canal d'événements du rechargement à chaud. Vide et inerte hors `preview`. */
export const LIVE_PATH = '/_folio/live'

/**
 * La plomberie du moteur, injectée au vol dans chaque page servie.
 *
 * Le document N'A PAS à l'écrire : ces deux lignes n'ont de sens que servies par folio,
 * puisque sous `file://` la pagination échoue de toute façon (spike 04). Les laisser à
 * la charge de l'auteur, c'était deux lignes à recopier, un chemin absolu à ne pas se
 * tromper, et un fichier qui ne ressemblait plus à du HTML ordinaire.
 *
 * Un document qui les déclare déjà n'est pas touché : on ne charge jamais deux fois.
 */
const ENGINE_TAGS =
  '<link rel="stylesheet" href="/_folio/engine.css">\n' +
  '<script type="module" src="/_folio/engine.js"></script>'

/**
 * Insère la plomberie AU DÉBUT du <head>, jamais à la fin.
 *
 * L'ordre n'est pas un détail : engine.css est une feuille de BASE, que le document
 * surcharge. Injectée avant `</head>`, elle passait après le `<style>` du document et
 * gagnait donc la cascade — la charte de l'auteur se faisait écraser par les valeurs
 * par défaut du moteur, et un document réel s'est mis à déborder.
 *
 * On se place juste après la déclaration de charset quand elle existe, pour qu'elle
 * reste dans les premiers octets du fichier comme la spécification l'exige.
 */
function injectHead(html, tags) {
  if (html.includes('/_folio/engine.js')) return html
  const charset = html.match(/<meta[^>]+charset[^>]*>/i)
  if (charset) return html.replace(charset[0], `${charset[0]}\n${tags}`)
  const head = html.match(/<head[^>]*>/i)
  if (head) return html.replace(head[0], `${head[0]}\n${tags}`)
  return `${tags}\n${html}`
}

/**
 * Sert un ou plusieurs répertoires, montés sur des préfixes d'URL.
 *
 * @param {Record<string, string>} mounts  préfixe d'URL -> répertoire, ex. { '/': docDir, '/_folio': engineDir }
 * @param {object} [options]
 * @param {number} [options.port]    0 = port libre choisi par le système
 * @param {string} [options.inject]  HTML ajouté à la fin de chaque page servie (preview uniquement)
 * @param {boolean} [options.live]   ouvre le canal d'événements sur LIVE_PATH
 * @returns {Promise<{ origin: string, reload: () => void, close: () => void }>}
 */
export async function serve(mounts, { port = 0, inject, live = false } = {}) {
  const roots = Object.entries(mounts)
    .map(([prefix, dir]) => [prefix.replace(/\/$/, ''), resolve(dir)])
    .sort((a, b) => b[0].length - a[0].length) // le préfixe le plus spécifique gagne

  const clients = new Set()

  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])

    if (live && urlPath === LIVE_PATH) {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
      })
      res.write('retry: 500\n\n')
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }

    for (const [prefix, dir] of roots) {
      if (prefix && !urlPath.startsWith(prefix + '/') && urlPath !== prefix) continue
      const rel = normalize(urlPath.slice(prefix.length)).replace(/^[/\\]+/, '')
      const file = join(dir, rel || 'index.html')
      // Garde-fou : on ne sort jamais du répertoire monté.
      if (file !== dir && !file.startsWith(dir + sep)) break
      try {
        let body = await readFile(file)
        const type = TYPES[extname(file)] ?? 'application/octet-stream'
        if (type.startsWith('text/html')) {
          body = injectHead(String(body), ENGINE_TAGS)
          if (inject) body = `${body}\n${inject}\n`
        }
        res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
        return res.end(body)
      } catch {
        /* essaie le montage suivant */
      }
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`folio: introuvable — ${urlPath}`)
  })

  await new Promise((r) => server.listen(port, '127.0.0.1', r))

  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    reload: () => {
      for (const client of clients) client.write('event: reload\ndata: 1\n\n')
    },
    close: () => {
      for (const client of clients) client.end()
      server.close()
    },
  }
}
