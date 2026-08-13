// Contrôle de débordement — la garde qui empêche de livrer un document mutilé.
//
// Le contenu qui coule ne se perd plus, mais une `.fixed-page`, une `<landscape-plate>`
// ou une simple image trop grande dépassent de leur page, et Paged.js les écrête SANS
// UN MOT (le rognage a lieu sur `.pagedjs_sheet`, en `overflow: hidden`). C'est le défaut
// le plus dangereux du document d'origine, et le passage au flux le concentre au lieu de
// le supprimer — l'auteur ne contrôle plus les hauteurs, donc il vérifie moins.
//
// Décision #12 : ÉCHEC par défaut, pas un avertissement. `folio build` est lancé pour
// produire un fichier, pas pour être lu ; un warning au milieu du bruit de npm, personne
// ne le voit — et le PDF est là, donc tout semble normal.
//
// On mesure LA ZONE DE CONTENU DE CHAQUE PAGE, pas des types de boîtes énumérés à
// l'avance : c'est le seul endroit où tout débordement se voit, quelle qu'en soit la
// cause. Une première version mesurait `.fixed-page` et n'a rien vu passer — la boîte
// grandit avec son contenu, donc elle ne déborde jamais d'elle-même.
import { PAGE_SELECTOR } from './paged.mjs'

/** Absorbe les faux positifs décoratifs (bordure, ombre). À recalibrer sur un vrai document. */
export const TOLERANCE_MM = 2

const PX_PER_MM = 96 / 25.4

/**
 * @param {import('puppeteer').Page} page  page déjà paginée
 * @param {number} toleranceMm
 * @returns {Promise<Array<{ page: number, axis: string, overflowMm: number, culprit: string }>>}
 */
export async function checkOverflow(page, toleranceMm = TOLERANCE_MM) {
  const found = await page.evaluate(
    (pageSelector, tolerancePx) => {
      const label = (el) => {
        if (!el) return 'contenu de la page'
        const id = el.id ? `#${el.id}` : ''
        const cls = el.classList?.length ? `.${[...el.classList].join('.')}` : ''
        return `${el.tagName.toLowerCase()}${id}${cls}`
      }

      // On mesure les éléments DE L'AUTEUR contre la zone de contenu, et surtout pas
      // `scrollWidth` de la zone : les conteneurs internes de Paged.js annoncent des
      // dimensions sans rapport avec leur taille réelle (2451 px pour 658 px mesurés),
      // ce qui produisait un débordement fantôme de 474 mm sur toutes les pages.
      // Les éléments du document, eux, se mesurent juste.
      const isEngine = (el) =>
        [...el.classList].some((c) => c.startsWith('pagedjs_')) ||
        // le conteneur de flux, inséré par Paged.js et dépourvu de classe
        (el.tagName === 'DIV' && !el.className && el.parentElement?.classList.contains('pagedjs_page_content'))

      // `.bleed` : le débordement est VOULU — décor à fond perdu, cercle qui sort de
      // la page. Sans cette échappatoire au niveau de l'élément, une couverture
      // décorée obligerait à passer --allow-overflow sur tout le document, ce qui
      // masquerait du même coup les vraies pertes de contenu.
      const isBleed = (el) => el.closest('.bleed') !== null

      const found = []
      document.querySelectorAll(pageSelector).forEach((pageEl, index) => {
        const area = pageEl.querySelector('.pagedjs_page_content')
        if (!area) return
        const box = area.getBoundingClientRect()

        let worst = { hauteur: { excess: 0, el: null }, largeur: { excess: 0, el: null } }
        let orphelin = null
        for (const el of area.querySelectorAll('*')) {
          if (isEngine(el) || isBleed(el)) continue

          // FRAGMENT PAR FRAGMENT, jamais `getBoundingClientRect()` : celui-ci rend
          // l'UNION des boîtes d'un élément, et un bloc coupé entre deux pages a donc
          // une union qui déborde forcément de la page où on le mesure. C'est ce qui
          // produisait un débordement fantôme de 474 mm sur un document parfaitement
          // sain — un simple paragraphe à cheval suffisait à bloquer le build.
          for (const r of el.getClientRects()) {
            if (r.width === 0 && r.height === 0) continue
            // On ne retient que les fragments qui CHEVAUCHENT réellement la zone.
            // Paged.js laisse dans le DOM du contenu destiné aux pages suivantes,
            // posé loin à droite (x ≈ 1870 pour une zone qui s'arrête à 734) : le
            // compter donnait un débordement fantôme de 474 mm sur un document sain.
            // Un vrai débordement commence DANS la page et en sort ; celui-là n'y
            // entre jamais.
            const chevauche =
              r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top
            if (!chevauche) {
              // Ni sur cette page, ni sur une autre : Paged.js n'a pas su le placer.
              // Ça arrive avec un bloc de hauteur fixe qu'il ne peut pas couper. Le
              // contenu disparaît du PDF — c'est exactement ce que la garde existe
              // pour empêcher, mais ça ne se mesure pas comme un débordement.
              if (r.height > tolerancePx) orphelin ??= el
              continue
            }
            for (const [axis, excess] of [
              ['hauteur', r.bottom - box.bottom],
              ['largeur', r.right - box.right],
            ]) {
              if (excess > worst[axis].excess) worst[axis] = { excess, el }
            }
          }
        }

        if (orphelin) {
          found.push({ page: index + 1, axis: 'non placé', overflowPx: 0, culprit: label(orphelin) })
        }

        for (const axis of ['hauteur', 'largeur']) {
          if (worst[axis].excess > tolerancePx) {
            found.push({
              page: index + 1,
              axis,
              overflowPx: worst[axis].excess,
              culprit: label(worst[axis].el),
            })
          }
        }
      })
      return found
    },
    PAGE_SELECTOR,
    toleranceMm * PX_PER_MM
  )

  return found.map(({ overflowPx, ...rest }) => ({
    ...rest,
    overflowMm: Math.round((overflowPx / PX_PER_MM) * 10) / 10,
  }))
}

/** Message d'échec : il doit dire quoi corriger, pas seulement qu'on a échoué. */
export function formatOverflow(found) {
  const lines = found.map((f) =>
    f.axis === 'non placé'
      ? `  page ${f.page} — ${f.culprit} n'a pas pu être placé : Paged.js ne sait pas couper` +
        ' un bloc de hauteur fixe, et le contenu disparaît du PDF'
      : `  page ${f.page} — ${f.overflowMm} mm de trop en ${f.axis}, à partir de ${f.culprit}`
  )
  return [
    `${found.length} débordement(s) — ce contenu serait écrêté sans trace dans le PDF :`,
    ...lines,
    'Réduisez le contenu, ou passez --allow-overflow si l’écrêtage est voulu.',
  ].join('\n')
}
