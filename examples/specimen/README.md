# Spécimen — quelle police par défaut ?

Décision #13 : folio fournit une famille libre auto-hébergée, pour que le rendu ne dépende
pas du poste. **Helvetica Neue, utilisée par `parcours-parent`, est propriétaire** : elle ne
peut pas être redistribuée dans le dépôt, donc elle ne peut pas être le défaut.

Ce spécimen compare les trois candidates **au corps réel du document API** (9,8 pt) et sur du
vrai contenu — accents français, guillemets, œ, Æ, tableau dense, bloc de code, URL, et les
glyphes qui se confondent (`Il1`, `O0`, `rn`/`m`).

```bash
npm install                          # à la racine de folio
node src/cli.mjs build examples/specimen/index.html --open
```

Les `.woff2` sont copiés depuis les paquets `@fontsource/*` (devDependencies de folio), sous
licence SIL OFL 1.1 — sous-ensemble latin, 400 romain, 400 italique, 700 romain.
