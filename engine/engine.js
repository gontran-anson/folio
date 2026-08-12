// ============================================================================
// folio — les composants du document.
//
// CRITÈRE D'ADMISSION (décisions #5 et #9) — un composant se justifie quand il
// CALCULE quelque chose, ou quand le balisage correct est un patron que l'auteur
// ne peut pas reconstituer de mémoire. Sinon, c'est un <div class="…"> en plus cher.
//
// Ce critère exclut délibérément les encadrés, grilles, bandeaux et maquettes :
// ils restent dans le document, pas dans l'outil.
//
// NOMMAGE (décisions #6 et #7) — noms composés naturels, EN ANGLAIS, sans préfixe.
// Le tiret est imposé par la spec des custom elements, pas par un namespace : sans
// lui, le navigateur n'instancie jamais l'élément — silencieusement.
// Corollaire : la liste doit rester COURTE. Trois composants passent pour du HTML ;
// dix sans préfixe deviennent illisibles.
// ============================================================================

/**
 * <cover-page> — page de couverture.
 * Justification : LIT les <meta> du document (titre, version, date, mention légale)
 * et se place hors numérotation. Il calcule, donc il a sa place.
 */
class CoverPage extends HTMLElement {
  connectedCallback() {
    throw new Error('folio: <cover-page> pas encore implémenté')
  }
}

/**
 * <table-of-contents> — sommaire.
 * Justification : FABRIQUE la liste de liens à partir des titres du document.
 * Il le fait AU CHARGEMENT, avant toute pagination — donc en terrain connu.
 * Les numéros de page, eux, ne sont pas son affaire : `target-counter` les résout
 * en une seule passe (spike 01), ce qui supprime le problème de point fixe.
 * Attribut : depth (profondeur de titres reprise, défaut 2).
 */
class TableOfContents extends HTMLElement {
  connectedCallback() {
    throw new Error('folio: <table-of-contents> pas encore implémenté')
  }
}

/**
 * <landscape-plate> — planche paysage dans un document portrait.
 * Justification : produit un patron de balisage NON DEVINABLE — une boîte de
 * 297x210 mm, centrée et tournée de 90° dans une feuille portrait. Une erreur
 * dessus donne une illustration coupée ou de travers, sans message.
 * Le redressement à l'endroit vient ensuite du /Rotate posé sur le PDF.
 * Balisage de référence : docs/spikes/03-landscape-plate/rotate.html
 */
class LandscapePlate extends HTMLElement {
  connectedCallback() {
    throw new Error('folio: <landscape-plate> pas encore implémenté')
  }
}

customElements.define('cover-page', CoverPage)
customElements.define('table-of-contents', TableOfContents)
customElements.define('landscape-plate', LandscapePlate)
