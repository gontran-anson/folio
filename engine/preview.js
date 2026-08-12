// Client de prévisualisation — injecté par `folio preview`, absent de `folio build`.
//
// Il fait deux choses, et rien d'autre : recharger la page quand un fichier change,
// et signaler au CSS qu'on est à l'écran et non dans un PDF.

// Le drapeau que engine.css attend pour redresser les planches paysage.
// À l'écran, la rotation à l'endroit n'existe pas : elle vient de l'attribut /Rotate,
// posé sur le PDF au moment du build. Sans ce redressement, l'auteur composerait son
// illustration couchée. C'est le seul écart assumé entre la prévisualisation et le PDF.
document.documentElement.classList.add('folio-preview')

const source = new EventSource('/_folio/live')

source.addEventListener('reload', () => {
  // On mémorise le défilement : sur un document de quarante pages, repartir du haut
  // à chaque sauvegarde rendrait la boucle inutilisable.
  sessionStorage.setItem('folio:scroll', String(window.scrollY))
  location.reload()
})

window.addEventListener('DOMContentLoaded', () => {
  const y = sessionStorage.getItem('folio:scroll')
  if (y === null) return
  sessionStorage.removeItem('folio:scroll')
  // Après la pagination, pas avant : la hauteur du document n'existe pas encore.
  const restore = () => window.scrollTo(0, Number(y))
  const timer = setInterval(() => {
    if (document.querySelector('.pagedjs_page')) {
      clearInterval(timer)
      requestAnimationFrame(restore)
    }
  }, 50)
  setTimeout(() => clearInterval(timer), 10000)
})
