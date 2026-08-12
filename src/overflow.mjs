// Contrôle de débordement — la garde qui empêche de livrer un document mutilé.
//
// Non implémenté. À écrire avec l'étape 1.
//
// Le contenu qui coule ne se perd plus, mais une `.fixed-page` et une `<landscape-plate>`
// sont des boîtes de taille fixe : ce qui dépasse est écrêté SANS UN MOT. C'est le défaut
// le plus dangereux du document d'origine, et le passage au flux le concentre au lieu de
// le supprimer — l'auteur ne contrôle plus les hauteurs, donc il vérifie moins.
//
// Décision #12 : ÉCHEC par défaut, pas un avertissement. `npm run build` est lancé pour
// produire un fichier, pas pour être lu ; un warning sur stderr au milieu du bruit de npm,
// personne ne le voit — et le PDF est là, donc tout semble normal.
//
// Mesure : comparer scrollHeight et clientHeight de chaque boîte fixe après pagination.
// TOLERANCE_MM absorbe les faux positifs décoratifs (bordure, ombre) ; à calibrer sur le
// portage de parcours-parent, pas à deviner ici.

export const TOLERANCE_MM = 2

/**
 * @returns {Promise<Array<{ page: number, overflowMm: number, selector: string }>>}
 */
export async function checkOverflow(_page) {
  throw new Error('contrôle de débordement pas encore implémenté')
}
