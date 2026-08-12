// `folio preview` — la boucle de travail de l'auteur.
//
// ÉTAPE 2 DU PLAN. Non implémenté.
//
// Sert le dossier, OUVRE LE NAVIGATEUR, surveille les fichiers, recharge à chaque
// sauvegarde. Montre le HTML paginé (~200 ms par itération, inspecteur Chrome
// disponible sur le contenu), pas le PDF — décision #15.
//
// Ce n'est pas un confort : c'est ce qui REMPLACE le double-clic sur le HTML, devenu
// impossible (spike 04 — sous file://, Paged.js plante et rend une page blanche).
//
// Particularité à ne pas oublier : en preview, les planches paysage doivent être
// REDRESSÉES à l'écran. Leur rotation à l'endroit vient de l'attribut /Rotate, qui
// n'existe que dans le PDF ; sans correctif, l'auteur travaillerait sur une
// illustration couchée. C'est le seul écart assumé entre preview et PDF.

export async function preview(_options) {
  throw new Error("preview : pas encore implémenté — étape 2 du plan (docs/DECISIONS.md §6)")
}
