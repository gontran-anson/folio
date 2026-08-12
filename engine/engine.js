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

/**
 * Les composants ne construisent RIEN dans connectedCallback.
 *
 * Un sommaire placé en tête du document s'instancie pendant l'analyse du HTML :
 * à cet instant, les titres qui le suivent n'existent pas encore. Le moteur
 * appelle donc `folioPrepare()` sur chaque composant une fois le document
 * complet, et juste avant de paginer.
 */
const PREPARE = 'folioPrepare'

// ---------------------------------------------------------------------------
// <cover-page> — page de couverture.
// Justification : LIT les <meta> du document. Il calcule, donc il a sa place.
// Si l'auteur a mis du contenu dedans, on n'y touche pas : c'est son choix.
// ---------------------------------------------------------------------------
class CoverPage extends HTMLElement {
  [PREPARE]() {
    if (this.children.length > 0) return

    const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content?.trim()
    const parts = [
      ['eyebrow', meta('eyebrow')],
      ['title', document.title?.trim()],
      ['subtitle', meta('subtitle')],
    ]

    const frame = document.createElement('div')
    frame.className = 'folio-cover'

    for (const [role, value] of parts) {
      if (!value) continue
      const el = document.createElement(role === 'title' ? 'h1' : 'p')
      el.className = `folio-cover-${role}`
      el.textContent = value
      frame.append(el)
    }

    // Les mentions de bas de couverture : couples intitulé / valeur.
    const footer = document.createElement('dl')
    footer.className = 'folio-cover-meta'
    for (const [label, name] of [
      ['Préparé pour', 'audience'],
      ['Version', 'version'],
      ['Auteur', 'author'],
      ['Date', 'date'],
    ]) {
      const value = meta(name)
      if (!value) continue
      const dt = document.createElement('dt')
      dt.textContent = label
      const dd = document.createElement('dd')
      dd.textContent = value
      footer.append(dt, dd)
    }
    if (footer.children.length) frame.append(footer)

    this.append(frame)
  }
}

// ---------------------------------------------------------------------------
// <table-of-contents> — sommaire.
// Justification : FABRIQUE la liste de liens à partir des titres du document.
// Les numéros de page ne sont PAS son affaire : `target-counter` les résout au
// moment de la pagination, en une seule passe (spike 01). Donc aucun double rendu,
// et aucun problème de point fixe malgré les pages qu'il occupe lui-même.
// ---------------------------------------------------------------------------
class TableOfContents extends HTMLElement {
  [PREPARE]() {
    if (this.children.length > 0) return

    const depth = Math.min(Math.max(Number(this.getAttribute('depth') || 2), 1), 6)
    const selector = Array.from({ length: depth }, (_, i) => `h${i + 1}`).join(',')

    const list = document.createElement('ol')
    list.className = 'folio-toc'

    for (const heading of document.querySelectorAll(selector)) {
      // Un titre dans la couverture ou dans le sommaire lui-même n'est pas une entrée.
      if (heading.closest('cover-page, table-of-contents')) continue

      // `target-counter` a besoin d'une ancre : on en pose une si l'auteur n'en a pas.
      if (!heading.id) heading.id = slug(heading.textContent, heading)

      const item = document.createElement('li')
      item.className = `folio-toc-${heading.tagName.toLowerCase()}`
      const link = document.createElement('a')
      link.href = `#${heading.id}`
      link.textContent = heading.textContent.trim()
      item.append(link)
      list.append(item)
    }

    if (list.children.length === 0) {
      console.warn('folio: <table-of-contents> n’a trouvé aucun titre à lister.')
      return
    }
    this.append(list)
  }
}

/** Identifiant lisible et stable, unique dans le document. */
function slug(text, node) {
  const base =
    text
      .trim()
      .toLowerCase()
      .normalize('NFD')
      // Bornes en \uXXXX, jamais en caractères littéraux : des signes diacritiques
      // combinants écrits tels quels sont invisibles dans un éditeur.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  let candidate = base
  let n = 2
  while (document.getElementById(candidate) && document.getElementById(candidate) !== node) {
    candidate = `${base}-${n++}`
  }
  return candidate
}

// ---------------------------------------------------------------------------
// <landscape-plate> — planche paysage dans un document portrait.
// Justification : produit un patron de balisage NON DEVINABLE. La rotation tient
// en CSS, mais pas SANS ce calque : posée sur l'enfant de l'auteur, la moindre
// classe de celui-ci la surcharge — `.illustration` (0,1,0) bat
// `landscape-plate > *` (0,0,1) — et l'illustration sort tournée puis rognée,
// sans message. C'est la décision #9, vérifiée par l'échec.
// ---------------------------------------------------------------------------
class LandscapePlate extends HTMLElement {
  connectedCallback() {
    // Celui-ci n'attend pas : il ne lit rien du reste du document.
    if (this.firstElementChild?.classList.contains('folio-plate')) return
    const inner = document.createElement('div')
    inner.className = 'folio-plate'
    inner.append(...this.childNodes)
    this.append(inner)
  }
}

customElements.define('cover-page', CoverPage)
customElements.define('table-of-contents', TableOfContents)
customElements.define('landscape-plate', LandscapePlate)

// ---------------------------------------------------------------------------
// Pagination.
//
// L'ordre compte : les composants doivent avoir produit leur contenu AVANT que
// Paged.js ne lise le document. D'où `auto: false` et un `preview()` déclenché
// à la main, après la préparation.
//
// Corollaire (voir src/paged.mjs) : le hook `after` de PagedConfig devient
// inutilisable comme signal de fin — en mode manuel, Paged.js l'appelle avant
// toute pagination. C'est ce script qui pose le drapeau.
// ---------------------------------------------------------------------------

async function paginate() {
  window.PagedConfig = { ...window.PagedConfig, auto: false }

  if (document.readyState === 'loading') {
    await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }))
  }

  for (const element of document.querySelectorAll('cover-page, table-of-contents')) {
    element[PREPARE]?.()
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = new URL('vendor/paged.polyfill.js', import.meta.url).href
    script.onload = resolve
    script.onerror = () => reject(new Error('polyfill Paged.js introuvable sous /_folio/vendor/'))
    document.head.append(script)
  })

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
