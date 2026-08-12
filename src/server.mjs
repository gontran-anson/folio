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

/**
 * Sert un ou plusieurs répertoires, montés sur des préfixes d'URL.
 * @param {Record<string, string>} mounts  préfixe d'URL -> répertoire du disque, ex. { '/': docDir, '/_folio': engineDir }
 * @returns {Promise<{ origin: string, close: () => void }>}
 */
export async function serve(mounts) {
  const roots = Object.entries(mounts)
    .map(([prefix, dir]) => [prefix.replace(/\/$/, ''), resolve(dir)])
    .sort((a, b) => b[0].length - a[0].length) // le préfixe le plus spécifique gagne

  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    for (const [prefix, dir] of roots) {
      if (prefix && !urlPath.startsWith(prefix + '/') && urlPath !== prefix) continue
      const rel = normalize(urlPath.slice(prefix.length)).replace(/^[/\\]+/, '')
      const file = join(dir, rel || 'index.html')
      // Garde-fou : on ne sort jamais du répertoire monté.
      if (file !== dir && !file.startsWith(dir + sep)) break
      try {
        const body = await readFile(file)
        res.writeHead(200, {
          'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        })
        return res.end(body)
      } catch {
        /* essaie le montage suivant */
      }
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`folio: introuvable — ${urlPath}`)
  })

  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => server.close(),
  }
}
