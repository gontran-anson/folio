# folio

Un HTML, une commande, un PDF paginé — avec les numéros de page, l'en-tête répété et
le sommaire que Chrome ne sait pas faire tout seul.

En typographie, le *folio* est le numéro de page imprimé : c'est précisément ce que le
projet apporte, et ce qui manquait.

## Démarrer

```bash
npx github:gontran-anson/folio#v0.5.0 init mon-document
cd mon-document
npm install
npm run preview     # sert le document et ouvre le navigateur
npm run build       # produit mon-document/index.pdf
```

`init` crée un document qui se construit **du premier coup** : couverture, sommaire,
page composée et illustration en paysage, tous exercés.

## Ce que c'est

Un **système de document paginé**, pas un wrapper autour de Chrome — le wrapper fait
soixante lignes et ne justifie pas un projet. Ce qui manque, et qui fait la différence
entre « un HTML imprimé » et « un document » :

- **numérotation automatique**, en-tête et pied **définis une seule fois** ;
- **sommaire aux vrais numéros de page**, résolus au rendu, en une seule passe ;
- **couverture** construite depuis les `<meta>` du document ;
- **planches paysage** dans un document portrait ;
- **polices embarquées**, donc un rendu qui ne dépend pas du poste ;
- **échec du build** quand du contenu serait écrêté, plutôt qu'un PDF mutilé livré en silence.

## Les trois commandes

```bash
folio init    <dossier>             # crée un document, refuse d'écraser un dossier non vide
folio preview <doc.html>            # sert, ouvre le navigateur, recharge à la sauvegarde
folio build   <doc.html> [--open]   # produit le PDF de livraison
```

`build` accepte `--out <fichier.pdf>`, `--allow-overflow` et `--timeout <ms>` ;
`preview` accepte `--port <n>` et `--no-open`.

## Écrire un document

Le format et la charte vivent **en CSS**, dans le document. Il n'y a pas de fichier de
configuration du design : si le navigateur peut le comprendre, ça y va.

```css
@page {
  size: A4 portrait;              /* obligatoire — voir plus bas */
  margin: 20mm 18mm 18mm;
  @top-left     { content: "SCHOOLFEES"; }
  @bottom-right { content: "Page " counter(page); }
}
:root { --folio-font: "…", sans-serif; }   /* pour changer de police */
```

Quatre marques structurent le contenu :

| Marque | Rôle |
|---|---|
| `<cover-page>` | couverture, construite depuis les `<meta>` du document |
| `<table-of-contents depth="2">` | sommaire ; les numéros viennent du moteur de pagination |
| `<landscape-plate>` | illustration paysage dans un document portrait |
| `class="fixed-page"` | page composée à la main plutôt que coulée |
| `class="bleed"` | décor qui sort de la page **volontairement** |

## Prérequis

**Chrome ou Chromium installé.** folio ne télécharge jamais de navigateur : il pilote celui
de la machine via `puppeteer-core`. Si le vôtre n'est pas à un emplacement usuel :

```bash
export CHROME_PATH=/chemin/vers/chrome
```

Conséquence assumée : le rendu dépend de la version de Chrome du poste. Tant qu'une seule
personne produit le PDF, c'est indolore ; le jour où la CI le régénère, il faudra embarquer
un Chromium. Les polices, elles, sont déjà embarquées — c'était l'autre moitié du problème.

## Quatre choses à savoir avant de toucher au code

**1. N'ouvrez jamais un document en double-cliquant dessus.** Sous `file://`, Chrome bloque
la lecture des feuilles de style par Paged.js ; le polyfill plante et rend une page
**blanche**, sans le moindre message. Le document se regarde avec `folio preview`.

**2. Le document déclare son format, pas le moteur.** Paged.js retient la **première**
déclaration `size` rencontrée : un défaut posé par folio empêcherait définitivement tout
document d'en changer. C'est pourquoi `@page { size }` n'est pas facultatif.

**3. Une page paysage ne change pas le format de la feuille.** Paged.js n'applique pas le
`size` d'une `@page` nommée, et Chrome n'écrit qu'une seule taille de page par PDF. La
feuille reste portrait, le **contenu** tourne d'un quart de tour, et l'attribut `/Rotate`
le remet à l'endroit chez le lecteur — comme le fait l'imprimerie depuis toujours.

**4. Ces affirmations sont vérifiées, pas supposées.** Elles viennent de quatre spikes
conservés et rejouables dans [`docs/spikes/`](docs/spikes/) :

```bash
npm install && npm run spike:01
```

## Installation

```bash
npm i github:gontran-anson/folio#v0.5.0
```

Épinglez un **tag**, jamais une branche : npm met les dépendances git en cache par commit,
et une branche qui bouge donne des installations divergentes selon qui a le cache chaud.
Changer de tag demande de supprimer `node_modules` et le verrou — sans quoi npm sert sa
résolution en cache.

## Structure

```
src/         la CLI et la chaîne de rendu
engine/      engine.css, engine.js, preview.js et les polices — ce que le document charge
template/    ce que `folio init` copie
examples/    jouet (pages fixes), flux (couverture + sommaire), spécimen (polices)
docs/
  DECISIONS.md   les 16 arbitrages avec leur coût assumé — fait autorité
  spikes/        les preuves, rejouables
```

## Documents de recette

folio n'est pas jugé sur ses exemples mais sur de vrais documents. Les deux sont dans la
plateforme de paiement SchoolLead :

| Document | Ce qu'il prouve |
|---|---|
| `parcours-parent` — 8 pages A4 paysage | pages fixes, charte, en-tête/pied, numérotation |
| `portail-operateur-api` — 34 pages depuis du Markdown | flux, coupures automatiques, sommaire, tableaux, code |

## Licence des polices

Source Sans 3 et Source Code Pro, sous licence SIL OFL 1.1 — voir
[`engine/fonts/LICENSE-Source.txt`](engine/fonts/LICENSE-Source.txt).
