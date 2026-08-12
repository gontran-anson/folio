// Post-traitement du PDF : redresse les planches paysage.
//
// Pourquoi ce détour : Paged.js n'applique pas le `size` d'une @page nommée, et Chrome
// n'écrit qu'UNE SEULE taille de page par PDF (spike 02). Deux obstacles empilés.
// La solution est celle de l'imprimerie : la feuille reste portrait, le CONTENU tourne
// de 90° (engine.css), et l'attribut /Rotate de la page PDF le remet à l'endroit chez
// le lecteur.
//
// Conséquences vérifiées au spike 03 : la numérotation reste continue, et toutes les
// feuilles font 210x297 — donc l'impression papier sort d'un seul bac.
import { PDFDocument, degrees } from 'pdf-lib'

/**
 * OUVERT : 90 ou 270 décide de quel bord de la feuille est en haut.
 * À trancher sur une illustration réelle, pas sur un rectangle de test.
 */
export const PLATE_ROTATION = 270

/**
 * @param {Uint8Array} pdfBytes
 * @param {number[]} plateIndexes  index 0-based des pages à redresser
 * @returns {Promise<Uint8Array>}
 */
export async function applyRotation(pdfBytes, plateIndexes) {
  if (plateIndexes.length === 0) return pdfBytes

  const doc = await PDFDocument.load(pdfBytes)
  const pages = doc.getPages()
  for (const index of plateIndexes) {
    if (index < 0 || index >= pages.length) {
      throw new Error(
        `planche annoncée en page ${index + 1}, mais le PDF n'en compte que ${pages.length} — ` +
          "l'ordre des pages du DOM et du PDF a divergé"
      )
    }
    pages[index].setRotation(degrees(PLATE_ROTATION))
  }
  return doc.save()
}
