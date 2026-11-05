# Recueil gratuit des retours (option B)

Circuit : la personne fait son tirage sur la page claude.ai avec son compte Claude → à la fin, si elle l'accepte,
son Claude résume son ressenti en une leçon anonyme → le bouton « Envoyer mon retour » ouvre `retour.html`
sur le site GitHub → la page dépose la leçon dans ce service gratuit → chaque jour, une tâche automatique
de Claude relève les retours du jour, écarte ce qui n'est pas un vrai retour, et les ajoute à la base
de la page claude.ai, où ils inspirent les interprétations suivantes.

Les personnes invitées en « Contributeur » sur la page claude.ai enregistrent directement leur retour, sans ce détour.

## Installation (gratuite, environ 10 minutes, sans carte bancaire)

1. Compte gratuit sur https://dash.cloudflare.com.
2. Storage & Databases → KV → Create namespace : `couleurs-retours`.
3. Workers & Pages → Create → Create Worker : nom `couleurs-retours` → Deploy → Edit code :
   remplace tout par le contenu de `retours.js` → Deploy.
4. Worker → Settings → Bindings → Add → KV namespace : nom de variable `RETOURS`, namespace `couleurs-retours`.
5. Worker → Settings → Variables and Secrets → Add → *Secret* : nom `LECTURE_CLE`, valeur = un mot de passe
   de ton choix (il protège la lecture des retours).
6. Envoie à Claude l'adresse du Worker (`https://couleurs-retours.<ton-nom>.workers.dev`) et le mot de passe
   `LECTURE_CLE` : il activera la page `retour.html` et programmera la mise à jour quotidienne.

Les retours restent 90 jours dans le service, le temps d'être importés ; ils ne contiennent ni nom ni question.
