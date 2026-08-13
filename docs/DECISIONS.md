# folio — dossier de décisions

> Issu de la session de grillage du 2026-08-12.
> Objet : transformer le bricolage de `docs/parcours-parent/` (plateforme de paiement SchoolLead)
> en un outil réutilisable — l'auteur fournit un HTML, lance une commande, obtient un PDF
> en bonne et due forme.
>
> **Ce fichier fait autorité.** Une décision qu'on change se change *ici d'abord*.

---

## 1. Point de départ, sans complaisance

Ce qu'on appelle « le moteur » dans `docs/parcours-parent/` :

- `build.mjs` fait **60 lignes** et se réduit à `chrome --headless=new --no-pdf-header-footer --no-margins --print-to-pdf`. Aucune dépendance, aucune logique. Le moteur, c'est Chrome.
- La valeur réelle est dans le HTML : 7 `<section class="page">` de **297×210 mm en dur**, `@page { size: A4 landscape; margin: 0 }`, et un en-tête + pied de page **recopiés à la main dans chaque section**, avec `Page 1`, `Page 2`… **écrits en dur**.
- Aucun asset externe : tout est CSS pur, ce qui est la seule raison pour laquelle le fichier s'ouvre en `file://`.

Conséquences directes du statu quo : insérer une page au milieu oblige à renuméroter sept pieds de page à la main, et `overflow: hidden` **écrête silencieusement** toute ligne en trop — elle disparaît du PDF sans un mot.

---

## 2. Ce qu'on construit

**Un système de document paginé**, pas un wrapper autour de Chrome.

Le wrapper existe déjà et ne justifie pas un projet. Ce qui manque, et qui fait la différence entre « un HTML imprimé » et « un document » : numérotation automatique, en-tête/pied définis une seule fois, sommaire aux vrais numéros, pagination du contenu, format piloté par le CSS.

**Hors périmètre assumé** : les templates métier (dossier opérateur, offre commerciale, spec API). Ils viendront *par-dessus*, et seulement une fois le système éprouvé.

---

## 3. Ce que les spikes ont établi

Quatre spikes exécutés pendant la session. Ils sont conservés, rejouables, dans [`docs/spikes/`](./spikes/) — ce sont les preuves, pas des souvenirs. Ils ont corrigé quatre hypothèses, dont deux qui auraient orienté l'architecture dans le mur.

### Spike 1 — `target-counter` ✅

Un sommaire écrit comme une simple liste de liens, avec :

```css
.toc a::after { content: " ......... " target-counter(attr(href url), page); }
```

Paged.js résout les numéros (`2`, `3`, `4` vérifiés), **en une seule passe**. Le problème de point fixe — le sommaire occupe des pages et décale donc les numéros qu'il affiche — **n'a pas lieu**. `@top-left`, `@bottom-right`, `counter(page)`, `counter(pages)` fonctionnent tous.

> Corollaire : le composant de sommaire n'a qu'à fabriquer la liste de liens **au chargement**, avant toute pagination. Aucun double rendu.

**Hypothèse corrigée** : la classe `pagedjs_rendered`, que j'avais supposée, **n'existe pas**. Le signal d'attente déterministe est le hook `window.PagedConfig = { after: … }`, déclaré *avant* le chargement du polyfill.

### Spike 2 — pages nommées et orientations mixtes ❌

| Vérification | Résultat |
|---|---|
| Paged.js reconnaît `@page mockup` | ✅ classe `pagedjs_mockup_page` posée |
| Paged.js applique `size: A4 landscape` | ❌ la page reste 794×1123 px (A4 portrait), même à l'écran |
| Chrome écrit des tailles mixtes dans le PDF | ❌ les 3 MediaBox valent `210 × 297` |

**Deux obstacles empilés.** La voie « pages nommées pour changer d'orientation » est fermée.

### Spike 3 — planche paysage par rotation ✅

La solution est celle de l'imprimerie : on ne change pas le format de la feuille, on **tourne le contenu de 90°** sur une feuille portrait, puis on pose l'attribut `/Rotate` de la page PDF pour que le lecteur l'affiche à l'endroit.

| page | feuille | `/Rotate` | vu par le lecteur |
|---|---|---|---|
| 1 | 210 × 297 | 0 | portrait |
| 2 | 210 × 297 | 270 | **PAYSAGE** |
| 3 | 210 × 297 | 0 | portrait |

Vérifié : rendu correct, et **la numérotation reste continue** (la planche est bien la page 2 sur 3). Toutes les feuilles font 210×297, donc l'impression papier sort d'un seul bac.

### Spike 4 — `file://` ☠️

Avec une simple feuille de style **liée**, sous `file://` :

```
pagination terminée : false        pages : 0
Access to XMLHttpRequest ... blocked   /   engine.css — net::ERR_FAILED
```

Ce n'est pas une dégradation, c'est un **écran blanc** : Paged.js échoue à lire la feuille, plante, et ne rend aucune page. Idem pour les `.woff2`, que Chrome traite en CORS.

> **La propriété « double-clic sur le HTML et je vois mon document » est morte.** Elle ne survivait que parce que `parcours-parent` n'a aucun asset externe.

---

## 4. Décisions

| # | Décision | Ce qu'on paie pour l'avoir |
|---|---|---|
| 1 | **Système de document paginé**, pas un wrapper CLI ni des templates métier | — |
| 2 | **Le contenu coule**, avec échappatoire page fixe pour les planches composées | le DOM imprimé ne ressemble plus au HTML source : déboguer une coupure devient moins direct |
| 3 | ~~`puppeteer-core` + Chrome système~~ **RÉVISÉE le 2026-08-13** : `puppeteer` avec son Chromium épinglé | un téléchargement unique d'environ 180 Mo, mis en cache pour toute la machine. En échange, un PDF ne dépend plus de qui l'a produit |
| 4 | **Tout en CSS, aucun fichier de config de design.** Un `pdfgen.config.json` optionnel ne porte que du build (entrée, sortie, chemin Chrome, timeout) | générer un document par script devient moins direct — mais c'est de la génération de HTML, un autre outil |
| 5 | **Habillage → classe CSS. Calcul → composant.** Étendu en #9 | — |
| 6 | **Noms composés naturels, sans préfixe** (`<cover-page>`, `<table-of-contents>`) — le tiret est imposé par la spec des custom elements, pas le namespace | rien n'indique dans le HTML d'où viennent ces balises ; impose de garder la liste courte |
| 7 | **Vocabulaire public en anglais**, doc du projet en français | — |
| 8 | **Un document = un dossier** (`index.html` + moteur à côté), pas un fichier autonome | on perd l'envoi du HTML par mail — usage qui n'existait pas en pratique |
| 9 | **Critère #5 étendu** : un composant se justifie aussi quand le balisage correct est un patron **non reconstituable de mémoire** | — |
| 10 | **Planche paysage** = feuille portrait + contenu tourné + `/Rotate` en post-traitement (`pdf-lib`), **avec** numéro de page | une dépendance de plus, et la chaîne devient un vrai pipeline, plus « Chrome imprime, fini » |
| 11 | **Dépôt git séparé**, installé depuis git (`npm i github:…#vX`), tags épinglés | pas de plages semver ; monter de version = éditer chaque `package.json`. Bascule vers GitHub Packages au-delà de deux consommateurs |
| 12 | **Échec par défaut sur débordement**, avec seuil de tolérance et `--allow-overflow` | un écrêtage de 2 mm sur une bordure décorative bloquera un build légitime |
| 13 | **Polices libres auto-hébergées fournies par l'outil**, surchargeables | `parcours-parent` garde Helvetica Neue et **reste donc non reproductible hors Mac** — exception assumée |
| 14 | **Trois commandes : `build`, `preview`, `init`.** Pas quatre | — |
| 15 | **`preview` montre le HTML paginé** (~200 ms, inspecteur disponible) ; `build --open` pour contrôler le PDF | la prévisualisation **redresse** les planches paysage, donc n'est pas pixel-identique au PDF sur ces pages |
| 16 | **CSS écrit pour du HTML de document générique** (`h1`–`h6`, `p`, `table`, `pre`, `blockquote`), pas pour les classes de `parcours-parent` | discipline d'écriture, pas de travail supplémentaire |

### Principes retenus

> **Si le navigateur peut le comprendre, ça va en CSS.**

> **Habillage → classe CSS. Calcul, ou patron non devinable → composant.**

> **Le document se regarde dans le navigateur, pas dans le PDF.** Le PDF est un artefact de livraison, pas l'objet de travail.

> **Un outil qui refuse de livrer un document mutilé vaut mieux qu'un outil qui le livre en le signalant.**

---

## 5. La chaîne

```
index.html + engine.css + engine.js + polices
        │
        ├── preview ──► serveur local + watch ──► navigateur (Paged.js, planches redressées)
        │
        └── build   ──► serveur local
                        └─► Chrome piloté (puppeteer-core)
                            └─► attente déterministe (PagedConfig.after)
                                └─► contrôle de débordement ──► échec si dépassement
                                    └─► page.pdf()
                                        └─► post-traitement pdf-lib (/Rotate sur les planches)
                                            └─► document.pdf
```

### Les quatre helpers, et rien d'autre

| Besoin | Forme | Justification |
|---|---|---|
| Page composée non coupable | `class="fixed-page"` | pur habillage |
| En-tête / pied / numéros | `@page` | standard CSS, vérifié |
| Couverture | `<cover-page>` | lit les `<meta>`, se met hors numérotation |
| Sommaire | `<table-of-contents>` | fabrique la liste de liens ; les numéros viennent de `target-counter` |
| Planche paysage | `<landscape-plate>` | patron de balisage non devinable (critère #9) |

Encadrés, grilles, bandeaux d'état, maquettes iPhone : **restent dans le document**, pas dans l'outil.

---

## 6. Plan de construction

| # | Étape | Ce que ça débloque |
|---|---|---|
| 1 | ~~Chaîne de rendu nue sur un document jouet~~ **faite** | le pipeline tourne bout en bout (`examples/jouet/`) |
| 2 | ~~`preview` + watch~~ **faite** | on peut travailler sans souffrir |
| 3 | ~~Portage de `parcours-parent`~~ **fait** | **premier PDF réel livrable** — 8 feuilles, 7 numérotées |
| 4 | ~~Document en flux~~ **faite** — `<cover-page>`, `<table-of-contents>`, CSS générique, et 35 pages tirées d'un vrai document API | l'autre moitié du moteur, éprouvée |
| 5 | ~~`init` + documentation~~ **faite** | on savait enfin quoi générer |

**`preview` avant le portage** : composer 7 pages A4 paysage en régénérant un PDF à chaque essai est le meilleur moyen d'abandonner à la page 3.

**`init` en dernier** : on ne peut pas générer un bon squelette tant qu'on ne sait pas ce qu'est un bon squelette.

**Garde-fou** : si l'étape 3 révèle que `parcours-parent` ne se porte pas proprement, on s'arrête et on rediscute — plutôt que d'empiler 4 et 5 sur une fondation qui ne tient pas.

### Condition de fin

Deux documents de recette, parce que `parcours-parent` seul **n'exerce aucune fonction de flux** — il est 100 % pages fixes et ne testerait ni la pagination automatique, ni le sommaire, ni `target-counter`.

| Document | Ce qu'il prouve |
|---|---|
| `parcours-parent` porté | pages fixes, planches paysage, charte, en-tête/pied |
| un document API converti (`SchoolLead_API_Operateurs.md`) | flux, coupures automatiques, sommaire, `target-counter`, tableaux |

Tant que les deux ne sont pas rendus correctement, l'outil n'est pas fini.

---

### Ce que l'étape 1 a corrigé

Quatre défauts que seul le passage à l'exécution pouvait révéler.

- **`@page :first` était un mauvais défaut.** Il zérotait la première page de *tout* document ; le jouet, qui commence par du texte, sortait sans marges ni folio. Remplacé par une page nommée `cover`, que seul `<cover-page>` réclame.
- **La planche exige un calque interne**, donc `<landscape-plate>` a dû être implémenté dès l'étape 1. Posée sur l'enfant de l'auteur, la géométrie est surchargée par la première classe venue — `.illustration` (0,1,0) bat `landscape-plate > *` (0,0,1) — et l'illustration sort tournée puis rognée, sans message. Confirmation directe du critère #9.
- **Le contrôle de débordement se trompait deux fois.** Il mesurait `.fixed-page`, qui grandit avec son contenu et ne déborde donc jamais d'elle-même ; puis `.pagedjs_area`, dont les conteneurs internes annoncent des dimensions fausses (2451 px pour 658 px réels), d'où un débordement fantôme de 474 mm sur chaque page. Il mesure désormais les éléments **du document** contre la zone de contenu, en ignorant les conteneurs de Paged.js.
- **`pagedjs` ne déclare aucun sous-chemin dans `exports`**, donc `require.resolve('pagedjs/dist/…')` échoue. La résolution passe par la racine du paquet, isolée dans une seule fonction.

### Ce que l'étape 2 a corrigé

- **Le redressement des planches ne pouvait pas porter sur la page.** Tourner `.pagedjs_page` laissait une boîte de mise en page portrait de 297 mm pour 210 mm affichés : la planche chevauchait la page précédente. C'est la *feuille* qui tourne, dans une page à laquelle on donne son encombrement paysage — et il faut la recentrer d'abord, sans quoi elle tourne sur un centre qui n'est pas celui de la page.
- **Le canal d'événements empêche `networkidle0`.** La connexion reste ouverte par construction, donc le réseau n'est jamais au repos en prévisualisation. Sans conséquence sur `build`, qui n'injecte pas le client — mais tout futur outil qui attendrait `networkidle0` sur une page de preview resterait bloqué.
- **Le rechargement mémorise le défilement.** Repartir du haut à chaque sauvegarde rendrait la boucle inutilisable sur un document long ; la position est restaurée après pagination, pas avant, parce que la hauteur du document n'existe pas encore.

### Ce que l'étape 3 a corrigé

Le portage a tenu : couverture à fond perdu, charte, maquettes iPhone et numérotation sont fidèles, et les 14 en-têtes et pieds recopiés à la main ont disparu au profit de quatre boîtes de marge. Quatre découvertes en chemin.

- **Le moteur ne doit PAS déclarer de format par défaut.** Paged.js retient la **première** déclaration `size` qu'il rencontre : le `size: A4 portrait` d'`engine.css` empêchait purement et simplement `parcours-parent` d'être en paysage, sans le moindre message. Le format appartient au document ; `engine.css` n'en impose plus.
- **Le contenu d'une boîte de marge vit dans un `::after`.** Ni `textContent` ni `getComputedStyle` ne le lisent — ce dernier rend l'expression `counter(page)` non résolue. Toute vérification de folio passe donc par le rendu, jamais par le DOM. C'est la deuxième fois que ce piège coûte du temps (déjà au spike 01).
- **Il fallait une échappatoire par élément au contrôle de débordement.** Les cercles décoratifs de la couverture sortent de la page **exprès** ; sans la classe `.bleed`, toute couverture décorée forcerait `--allow-overflow` sur le document entier, ce qui masquerait du même coup les vraies pertes de contenu.
- **`counter-reset: page N` affiche N sur la page qui porte la règle**, pas N+1. La couverture ne doit pas compter : le premier flux réinitialise à 1.

### Ce que l'étape 4 a corrigé

- **Un composant ne peut rien construire dans `connectedCallback`.** Un sommaire placé en tête s'instancie pendant l'analyse du HTML : à cet instant, les titres qui le suivent **n'existent pas encore**. Le moteur appelle donc `folioPrepare()` sur les composants une fois le document complet, juste avant de paginer. `<landscape-plate>` échappe à la règle — il ne lit rien du reste du document.
- **`@page cover` ne doit pas déclarer de `size` non plus.** Même piège qu'à l'étape 3, un cran plus bas : un format imposé là aurait interdit à un document paysage d'avoir une couverture paysage.
- **`height: 100%` exige un parent qui en ait une.** Sans hauteur sur `cover-page`, les mentions de bas de couverture remontaient se coller au sous-titre.
- **Une ancre commençant par un chiffre casse TOUTE la pagination.** `id="0-de-quoi-on-parle"` est légal en HTML mais illégal en CSS, et Paged.js résout `target-counter` par `querySelector` : un seul titre numéroté suffisait à faire échouer le rendu entier, avec un message qui ne désignait pas le titre fautif. Trouvé sur le premier document réel de 70 titres — le document jouet et l'exemple écrit à la main ne pouvaient pas le révéler.
- **Le sommaire se met en page sur le LIEN, pas sur la ligne.** Le numéro ne peut venir que de `target-counter(attr(href …))`, donc d'un pseudo-élément du lien : c'est lui qui doit porter les trois éléments flexibles — texte, trait de conduite, numéro.

### Ce que l'étape 5 a confirmé

Écrire `init` en dernier était le bon ordre : le squelette porte deux choses qu'on ne
connaissait pas au départ, et dont l'oubli donne une page blanche sans message — la
déclaration `@page { size }`, que folio n'impose pas exprès (découverte à l'étape 3), et
l'interdiction d'ouvrir le document en `file://` (spike 04). Un `init` écrit à l'étape 1
aurait généré un squelette faux.

Le critère retenu : **le document créé doit se construire du premier coup**, et il exerce
les quatre marques — couverture, sommaire, page composée, planche paysage. Un `init` qui
produit un document cassé serait pire que pas d'`init` du tout.

### Révision de la décision #3 — le 2026-08-13

Le compromis initial — piloter le Chrome du poste pour éviter 180 Mo de téléchargement — a
tenu tant que le rendu dépendait de toute façon des polices du système. Une fois celles-ci
embarquées (décision #13), **la version de Chrome restait la dernière cause de divergence**,
et la seule chose qui empêchait une CI de régénérer les PDF.

folio embarque donc son propre Chromium, épinglé par la version de puppeteer. La démonstration
tenait en une ligne : sur ce poste, le Chrome système est en 151.0.7922.**109** quand le
Chromium épinglé est en 151.0.7922.**77**. Deux navigateurs différents, deux paginations
possibles, sur la même machine.

`CHROME_PATH` reste une échappatoire — poste hors ligne, architecture sans build disponible —
mais elle **avertit** désormais qu'elle annule la garantie, au lieu d'être silencieuse.

Ce que ça ne règle pas : le PDF n'est toujours pas reproductible **à l'octet**, Chrome y
écrivant un identifiant et une date de création. Supprimer la cause de divergence de mise en
page n'est pas la même chose que produire deux fichiers identiques.

Piège rencontré : `puppeteer.executablePath()` est **asynchrone** depuis puppeteer 25. Le
traiter comme une valeur donne un chemin `Promise { <pending> }` et un message d'erreur qui
accuse un Chromium manquant.

### Le document redevient du HTML ordinaire — le 2026-08-13

Les documents n'avaient ni `<html>`, ni `<head>`, ni `<body>`, et devaient déclarer eux-mêmes
les deux lignes de plomberie du moteur. Deux corrections liées :

- **Structure conventionnelle.** `<!doctype>`, `<html lang="fr">`, `<head>`, `<body>`. Le `lang`
  n'est pas décoratif : il pilote la césure à l'impression.
- **folio injecte sa plomberie en servant la page**, comme il le faisait déjà pour le client de
  rechargement. Le document ne référence plus `/_folio/` du tout. On ne perd rien : le
  double-clic était déjà mort (spike 04), donc ces deux lignes n'avaient de valeur que servies.
  Un document qui les déclare encore n'est pas touché — jamais de double chargement.

**L'ordre d'injection est une invariante, pas un détail.** Placée avant `</head>`, la feuille du
moteur passait après le `<style>` du document et gagnait la cascade : la charte de l'auteur se
faisait écraser par les valeurs par défaut, et `parcours-parent` s'est mis à déborder. Elle
s'injecte donc en TÊTE de `<head>`, juste après le charset — `engine.css` est une base, le
document surcharge.

Trois pièges au passage, dont deux faux diagnostics de ma part :

1. **`page.pdf()` a sa propre limite de protocole**, distincte de celle de la pagination, et ses
   30 s par défaut ne suffisent pas à un document long. L'échec ne disait rien d'utile : un
   « Timed out after waiting 30000ms » nu, sans mention du PDF.
2. J'ai d'abord accusé la sonde `raf` de `waitForFunction`, puis l'attente `networkidle0`. Les
   deux changements ont été conservés — ils sont défendables en eux-mêmes — mais **aucun
   n'était la cause**, et leurs commentaires ont été rectifiés pour ne pas laisser croire le
   contraire.
3. Un dossier de document exécute le folio **installé**, pas le code local. Une modification du
   moteur ne se voit pas tant que le tag n'est pas publié et le verrou refait.

### Enquête sur « le document de 34 pages met une minute » — le 2026-08-13

**Le symptôme n'existait pas.** Mesuré proprement, ce document se construit en **8 secondes**.
La minute observée venait de mes propres essais interrompus : chaque build tué laisse dix
processus Chromium vivants, qui se disputent ensuite le processeur. La fuite se lit comme une
lenteur du moteur, ce qu'elle n'est pas.

Ce que la mesure par étapes donne, une fois la machine au repos :

| Étape | 34 pages | 6 pages |
|---|---|---|
| `page.pdf()` | **7,4 s (70 %)** | 0,17 s |
| Lancement de Chrome | 1,8 s | 0,8 s |
| Pagination Paged.js | 1,1 s | 0,29 s |
| Contrôle de débordement | 0,01 s | 0,00 s |
| Rotation, serveur, relevés | ~0 | ~0 |

L'impression est le poste dominant, et c'est du temps Chrome — rien de folio n'y est en cause.
Le contrôle de débordement, que je soupçonnais d'être quadratique, coûte dix millisecondes.

**Le vrai défaut, trouvé en cherchant le faux :** `build` ne fermait pas son navigateur quand
on l'interrompait. `preview` gérait déjà `SIGINT` ; `build` n'écoutait rien, donc un Ctrl+C, un
`SIGTERM` ou un délai de CI laissaient dix processus derrière. Corrigé.

**Une suite de tests, enfin** (`npm test`, `node:test`, aucune dépendance). Six tests, huit
secondes. Ils lancent tous un vrai Chromium sur un vrai document, parce que c'est le seul
niveau où les bogues de ce projet se produisent : tous ceux qu'on a trouvés vivaient dans
l'interaction entre Paged.js, Chrome et la cascade CSS, jamais dans nos fonctions.

Le premier test écrit a immédiatement trouvé un **faux positif de la garde de débordement** :
474 mm annoncés sur un document sain. `getBoundingClientRect()` rend l'UNION des fragments
d'un élément, et Paged.js gare hors champ (x ≈ 1870 pour une zone qui s'arrête à 734) le
contenu destiné aux pages suivantes. On mesure donc désormais fragment par fragment, en ne
retenant que ceux qui chevauchent réellement la page.

Ce faisant, une deuxième chose est apparue : **Paged.js ne sait pas repousser un bloc de
hauteur fixe insécable**. Il le laisse garé hors champ, et le contenu disparaît du PDF sans
qu'aucun débordement ne soit mesurable. C'est maintenant détecté et signalé à part — « n'a pas
pu être placé » — parce que ça ne se corrige pas comme un débordement.

## 7. Questions ouvertes

- ~~**Nom du projet.**~~ Tranché le 2026-08-12 : **folio** — en typographie, le folio est le numéro de page imprimé, c'est-à-dire précisément ce que le projet apporte et qui manque aujourd'hui. La décision #6 garantit qu'un renommage ne toucherait aucun document.
- ~~**Quelle famille de polices par défaut**~~ Tranchée le 2026-08-12 : **Source Sans 3 + Source Code Pro**, SIL OFL 1.1, auto-hébergées dans `engine/fonts/`. Choisies sur pièce (`examples/specimen/`), puis départagées par un banc d'essai sur `parcours-parent` : Source est la **seule des quatre** candidates qui y passe sans qu'on retouche une valeur, parce qu'elle est plus étroite. Inter a été écartée — elle ne distingue pas `I` de `l`. Helvetica Neue n'était pas candidate : propriétaire.
- **Seuil de tolérance au débordement** (décision #12) : à calibrer sur le portage de `parcours-parent`.
- **Sens de rotation des planches** (`/Rotate 90` ou `270`) : décide de quel bord est en haut. À trancher sur une illustration réelle.
- **Convertisseur Markdown** : hors v1 (décision #16), mais le corpus `docs/` compte ~30 fichiers Markdown qui ne seront jamais réécrits en HTML à la main. C'est la suite naturelle du projet.
