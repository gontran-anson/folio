# folio

Un HTML, une commande, un PDF paginé — avec les numéros de page, l'en-tête répété et
le sommaire que Chrome ne sait pas faire tout seul.

> **État : squelette.** Les décisions sont prises et les fondations techniques vérifiées,
> mais aucune des trois commandes n'est implémentée. Voir [le plan](docs/DECISIONS.md#6-plan-de-construction).

En typographie, le *folio* est le numéro de page imprimé — c'est-à-dire précisément
ce que le projet apporte.

## Ce que c'est

Un **système de document paginé**, pas un wrapper autour de Chrome. Le wrapper existe
déjà — il fait soixante lignes et ne justifie pas un projet. Ce qui manque, et qui fait
la différence entre « un HTML imprimé » et « un document » :

- numérotation automatique, en-tête et pied **définis une seule fois** ;
- pagination du contenu, avec échappatoire pour les pages composées ;
- sommaire aux **vrais** numéros de page ;
- planches paysage dans un document portrait ;
- **échec du build** quand du contenu est écrêté, plutôt qu'un PDF mutilé livré en silence.

## Les commandes

```bash
folio preview mon-doc/index.html    # sert, ouvre le navigateur, recharge à la sauvegarde
folio build   mon-doc/index.html    # produit le PDF de livraison
folio init    mon-doc               # crée un nouveau document
```

Trois commandes, pas quatre.

## Prérequis

**Chrome ou Chromium installé.** `folio` ne télécharge jamais de navigateur : il pilote
celui de la machine via `puppeteer-core`. Si le vôtre n'est pas à un emplacement usuel :

```bash
export CHROME_PATH=/chemin/vers/chrome
```

Conséquence assumée : le rendu dépend de la version de Chrome du poste. Tant qu'une seule
personne produit le PDF, c'est indolore ; le jour où la CI le régénère, il faudra embarquer
un Chromium.

## Installation

```bash
npm i github:gontran/folio#v0.1.0
```

Épinglez un **tag**, jamais une branche : npm met les dépendances git en cache par commit,
et une branche qui bouge donne des installations divergentes selon qui a le cache chaud.

## Trois choses à savoir avant de toucher au code

**1. N'ouvrez jamais un document en double-cliquant dessus.** Sous `file://`, Chrome bloque
la lecture des feuilles de style par Paged.js ; le polyfill plante et rend une page **blanche**,
sans le moindre message. Le document se regarde avec `folio preview`.

**2. Une page paysage ne change pas le format de la feuille.** Paged.js n'applique pas le
`size` d'une `@page` nommée, et Chrome n'écrit qu'une seule taille de page par PDF. La feuille
reste portrait, le **contenu** tourne de 90°, et l'attribut `/Rotate` le remet à l'endroit
chez le lecteur — comme le fait l'imprimerie depuis toujours.

**3. Ces affirmations sont vérifiées, pas supposées.** Elles viennent de quatre spikes
conservés et rejouables dans [`docs/spikes/`](docs/spikes/) :

```bash
npm install && npm run spike:01
```

## Structure

```
src/         la CLI et la chaîne de rendu
engine/      engine.css + engine.js — ce que le document charge
template/    ce que `folio init` copiera
docs/
  DECISIONS.md   les 16 arbitrages, avec leur coût assumé — fait autorité
  spikes/        les preuves, rejouables
```

## Documents de recette

L'outil n'est pas fini tant que ces deux-là ne sont pas rendus correctement — l'un teste
les pages composées, l'autre le flux :

| Document | Ce qu'il prouve |
|---|---|
| `parcours-parent` (plateforme SchoolLead) | pages fixes, planches paysage, charte, en-tête/pied |
| un document API converti | flux, coupures automatiques, sommaire, tableaux |
