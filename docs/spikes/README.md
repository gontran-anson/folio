# Spikes

Quatre questions techniques tranchées **par exécution**, le 2026-08-12, avant d'écrire
une ligne du moteur. Ce sont les preuves sur lesquelles repose `DECISIONS.md` — elles
sont conservées et rejouables, pas racontées de mémoire.

Deux d'entre elles ont invalidé l'architecture qu'on s'apprêtait à écrire.

| # | Question | Verdict |
|---|---|---|
| [01](./01-target-counter/) | Paged.js résout-il `target-counter` pour numéroter un sommaire ? | ✅ oui, **en une seule passe** — pas de point fixe, pas de double rendu |
| [02](./02-named-pages/) | Peut-on changer d'orientation avec une `@page` nommée ? | ❌ non, **deux fois** : Paged.js n'applique pas `size`, et Chrome n'écrit qu'une taille par PDF |
| [03](./03-landscape-plate/) | Une planche paysage par rotation du contenu + `/Rotate` ? | ✅ oui, et la numérotation reste continue |
| [04](./04-file-protocol/) | Peut-on ouvrir le document en `file://` ? | ☠️ **écran blanc** — Paged.js plante et rend zéro page |

## Les rejouer

```bash
npm install
npm run spike:01     # …02, 03, 04
```

Ils supposent Chrome à un emplacement usuel, ou `CHROME_PATH` exporté.

## Ce qu'ils ont corrigé, en plus de leur verdict

- La classe `pagedjs_rendered` **n'existe pas**. Le signal d'attente est le hook
  `window.PagedConfig = { after: … }`, déclaré *avant* le chargement du polyfill.
  C'est la première hypothèse qui a échoué, et elle aurait fait attendre le rendu
  pour rien jusqu'au timeout.
- Le spike 04 ne montre pas une dégradation mais un **plantage** : avec une simple
  feuille de style liée, on obtient `pages : 0`. Aucun message n'aurait alerté
  l'auteur — juste une page blanche.
