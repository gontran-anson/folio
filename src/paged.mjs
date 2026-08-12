// Les faits appris sur Paged.js pendant les spikes, rassemblés en un seul endroit
// pour qu'on ne les redécouvre jamais à la main.

/**
 * Drapeau posé par engine/engine.js quand la pagination est terminée, et seul
 * signal d'attente fiable côté Node.
 *
 * ATTENTION : la classe `pagedjs_rendered` N'EXISTE PAS — c'est l'hypothèse fausse
 * qui a fait échouer le premier spike.
 *
 * Le hook `after` de `window.PagedConfig` marche, mais UNIQUEMENT en mode
 * automatique : le bootstrap de Paged.js l'appelle juste après `before`, donc avec
 * `auto: false` il se déclenche AVANT toute pagination. Comme le moteur doit laisser
 * les composants se construire d'abord, il pilote `preview()` lui-même et pose le
 * drapeau après. Voir engine/engine.js.
 */
export const DONE_FLAG = '__folioPagedDone'

/** Message d'échec de pagination, posé par le moteur. Évite d'attendre le timeout pour rien. */
export const ERROR_FLAG = '__folioPagedError'

/** Classe posée par Paged.js sur chaque page rendue. */
export const PAGE_SELECTOR = '.pagedjs_page'

/**
 * Classe d'une page issue d'une `@page` nommée : `pagedjs_<nom>_page`.
 * Paged.js pose bien la classe, mais N'APPLIQUE PAS le `size` déclaré sur la page
 * nommée (spike 02) — d'où la planche paysage par rotation plutôt que par changement
 * de format.
 */
export const namedPageSelector = (name) => `.pagedjs_${name}_page`

/**
 * L'ordre des `.pagedjs_page` dans le DOM correspond exactement à l'ordre des pages
 * du PDF produit par Chrome. C'est ce qui permet de retrouver, après coup, quelles
 * pages doivent recevoir un `/Rotate` (spike 03).
 */
export const PLATE_PAGE_SELECTOR = namedPageSelector('landscape-plate')
