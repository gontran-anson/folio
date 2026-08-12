// Post-traitement du PDF : redresse les planches paysage.
//
// Non implémenté ici, mais ENTIÈREMENT PROUVÉ dans docs/spikes/03-landscape-plate/.
// Le code de ce spike est directement transposable.
//
// Pourquoi ce détour : Paged.js n'applique pas le `size` d'une @page nommée, et Chrome
// n'écrit qu'UNE SEULE taille de page par PDF (spike 02). Deux obstacles empilés.
// La solution est celle de l'imprimerie : la feuille reste portrait, le CONTENU tourne
// de 90°, et l'attribut /Rotate de la page PDF le remet à l'endroit chez le lecteur.
//
// Conséquences vérifiées : la numérotation reste continue, et toutes les feuilles font
// 210x297 — donc l'impression papier sort d'un seul bac.
//
// Reste ouvert : /Rotate 90 ou 270, qui décide de quel bord est en haut.
// À trancher sur une illustration réelle, pas sur un rectangle de test.

export const PLATE_ROTATION = 270

/**
 * @param {Uint8Array} pdfBytes
 * @param {number[]} plateIndexes  index 0-based des pages à redresser
 * @returns {Promise<Uint8Array>}
 */
export async function applyRotation(_pdfBytes, _plateIndexes) {
  throw new Error('rotation des planches pas encore implémentée — voir docs/spikes/03')
}
