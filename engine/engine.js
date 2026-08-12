// ============================================================================
// folio — bootstrap du document et composants.
//
// CRITÈRE D'ADMISSION (décisions #5 et #9) — un composant se justifie quand il
// CALCULE quelque chose, ou quand le balisage correct est un patron que l'auteur
// ne peut pas reconstituer de mémoire. Sinon, c'est un <div class="…"> en plus cher.
//
// NOMMAGE (décisions #6 et #7) — noms composés naturels, EN ANGLAIS, sans préfixe.
// Le tiret est imposé par la spec des custom elements : sans lui, le navigateur
// n'instancie jamais l'élément, silencieusement.
// ============================================================================

const DONE_FLAG = '__folioPagedDone'
const ERROR_FLAG = '__folioPagedError'

// ---------------------------------------------------------------------------
// Composants — étape 4 du plan. Inertes pour l'instant, et volontairement NON
// bloquants : lever une exception dans connectedCallback laisserait un document
// à moitié rendu, ce qui est exactement le genre d'échec muet qu'on combat.
// ---------------------------------------------------------------------------

const notYet = (tag) => {
  class NotImplemented extends HTMLElement {
    connectedCallback() {
      console.warn(`folio: <${tag}> pas encore implémenté (étape 4). Rendu tel quel.`)
    }
  }
  return NotImplemented
}

/**
 * <cover-page> — LIT les <meta> du document et se place hors numérotation.
 * <table-of-contents> — FABRIQUE la liste de liens à partir des titres, au chargement.
 *   Les numéros ne sont pas son affaire : `target-counter` les résout (spike 01).
 */
customElements.define('cover-page', notYet('cover-page'))
customElements.define('table-of-contents', notYet('table-of-contents'))

/**
 * <landscape-plate> — insère le calque que la mise en page attend.
 *
 * La rotation tient en CSS, mais elle ne peut pas tenir SANS ce calque : posée
 * directement sur l'enfant de l'auteur, la moindre classe de celui-ci la surcharge
 * — `.illustration` (0,1,0) bat `landscape-plate > *` (0,0,1) — et l'illustration
 * sort tournée puis rognée, sans message. C'est le « patron non reconstituable de
 * mémoire » de la décision #9, et la raison d'être du composant.
 */
class LandscapePlate extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild?.classList.contains('folio-plate')) return
    const inner = document.createElement('div')
    inner.className = 'folio-plate'
    inner.append(...this.childNodes)
    this.append(inner)
  }
}

customElements.define('landscape-plate', LandscapePlate)

// ---------------------------------------------------------------------------
// Pagination.
//
// L'ordre compte : les composants doivent avoir produit leur contenu AVANT que
// Paged.js ne lise le document, sinon un sommaire construit trop tard ne serait
// jamais paginé. D'où `auto: false` et un `preview()` déclenché à la main.
//
// Corollaire (voir src/paged.mjs) : le hook `after` de PagedConfig devient
// inutilisable comme signal de fin — en mode manuel, Paged.js l'appelle avant
// toute pagination. C'est ce script qui pose le drapeau.
// ---------------------------------------------------------------------------

async function paginate() {
  window.PagedConfig = { ...window.PagedConfig, auto: false }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = new URL('vendor/paged.polyfill.js', import.meta.url).href
    script.onload = resolve
    script.onerror = () => reject(new Error('polyfill Paged.js introuvable sous /_folio/vendor/'))
    document.head.append(script)
  })

  // Laisse les custom elements s'instancier avant de figer le contenu.
  await Promise.all(
    ['cover-page', 'table-of-contents', 'landscape-plate'].map((t) => customElements.whenDefined(t))
  )

  await window.PagedPolyfill.preview()
}

paginate().then(
  () => {
    window[DONE_FLAG] = true
  },
  (error) => {
    // On expose l'échec plutôt que de laisser le build attendre son timeout :
    // un message précis vaut mieux qu'un « délai dépassé » à 30 secondes.
    window[ERROR_FLAG] = error?.message ?? String(error)
    console.error('folio:', error)
  }
)
