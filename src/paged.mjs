// Les faits appris sur Paged.js pendant les spikes, rassemblés en un seul endroit
// pour qu'on ne les redécouvre jamais à la main.

/**
 * Signal de fin de pagination.
 *
 * ATTENTION : la classe `pagedjs_rendered` N'EXISTE PAS — c'est l'hypothèse fausse
 * qui a fait échouer le premier spike. Le seul signal fiable est le hook `after`
 * de `window.PagedConfig`, qui doit être déclaré AVANT le chargement du polyfill.
 * Ce bout de script est injecté en tête du document par le moteur.
 */
export const DONE_FLAG = '__folioPagedDone'

export const PAGED_CONFIG_SNIPPET = `window.PagedConfig = Object.assign({}, window.PagedConfig, {
  after: () => { window.${DONE_FLAG} = true },
});`

/** Classes posées par Paged.js sur chaque page rendue. */
export const PAGE_SELECTOR = '.pagedjs_page'

/**
 * Classe d'une page issue d'une `@page` nommée : `pagedjs_<nom>_page`.
 * Paged.js pose bien la classe, mais N'APPLIQUE PAS le `size` déclaré sur la page nommée
 * (spike 02) — d'où la planche paysage par rotation plutôt que par changement de format.
 */
export const namedPageSelector = (name) => `.pagedjs_${name}_page`

/**
 * L'ordre des `.pagedjs_page` dans le DOM correspond exactement à l'ordre des pages
 * du PDF produit par Chrome. C'est ce qui permet de retrouver, après coup, quelles
 * pages doivent recevoir un `/Rotate` (spike 03).
 */
export const PLATE_PAGE_SELECTOR = namedPageSelector('landscape-plate')
