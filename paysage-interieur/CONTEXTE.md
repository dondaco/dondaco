# Paysage intérieur · contexte du projet

À lire en entier avant de travailler sur le projet. Ce fichier résume tout ce qui a été décidé jusqu'ici
(les conversations précédentes avec Claude ne sont pas transmises d'un compte à l'autre).

## Le concept

Un atelier de tuftage fabrique des **tapis de méditation en laine tuftée, d'une seule pièce**.
Le site est un **questionnaire intérieur** : la personne parle d'elle (lieux, moments, ressentis), jamais de « tapis ».
À la fin, le site **génère un design de tapis unique** (un paysage abstrait, rêvé, féerique, où l'on devine la mer,
la forêt, le ciel…) et son **portrait**. Plus tard : la demande est envoyée à l'atelier, qui valide, fixe taille,
prix et délai, puis renvoie une proposition avec un lien de paiement.

- **Client** : voit le portrait et le **rendu réaliste Blender** du tapis (zoomable). Pas de plan technique, pas de prompt, pas d'export.
- **Atelier** : adresse terminée par `#atelier` → plan technique (zones à plat, courbes de niveau, hauteurs, liste des laines), choix d'ambiance, export Blender, prompt.

## Contraintes de fabrication (à respecter dans tout le générateur)

- **Laines** : uniquement le nuancier Tufting Shop (72 laines, `data/laines.json`, couleurs mesurées sur les photos).
- **Points et hauteurs** : cut 1,5 cm · loop 3 cm · cut 4 cm · cut 4 cm brossé (poils longs, feutrés) · pompons.
- **Négatif** : au moins 1 cm d'écart pour qu'un élément se distingue ; aucun morceau de moins de 1 cm² (nettoyage automatique).
- **Jamais de liseré clair le long du bord du tapis** (règle `pasDeBordure`).
- La taille et le prix viennent plus tard, pas dans le questionnaire. Version inversée pour tufter : plus tard.

## Le parcours (index.html)

1. **Toi** : prénom.
2. **Tes lieux** : Q1 lieu (plaine, forêt, montagnes/canyon, bord de l'eau, sous un plaid), Q2 moment (matin, midi, coucher, nuit), Q3 saison, Q4 ce qui ressource (terre, eau, feu, air, végétal).
3. **Ton regard** : Q5 ce qui attire le regard (fleur, soleil/lune, reflet, oiseau, pierre), Q6 couleur à éviter, Q7 besoin du soir (silence / énergie / les deux).
4. **Chez toi** : Q8 intérieur (épuré / chaleureux / rempli), Q9 rivière / maison / jardin, Q10 dit clairement / se devine / petit secret.
5. **Ta touche** : Q11 souvenir (texte libre, pas encore dessiné), Q12 un mot (calme, douceur, joie, énergie, mystère, cocon, liberté, émerveillement).
6. **Couleur et forme** : **la couleur principale** (20 laines au choix) et **la forme** (rectangle, carré, ovale, rond, tache, nuage, feuille, fleur aux pétales ronds).
7. **Ton tapis** : portrait + tapis + « Changer » par couche + remplacement de couleurs + rendu réaliste.

## Comment les réponses deviennent un tapis (moteur.js)

- **Ambiance** (Q1, précisée par Q2/Q4) : plaine, cocon, forêt, jardin, mer (avec plage ou île), ciel (voie lactée, lune, étoiles), montagne, canyon/désert.
- **Élément signature unique** (Q5, selon Q10) : grappe de fleurs, soleil ou lune, reflet d'eau, sentier (bande continue d'un bord à l'autre), rochers. Jamais plusieurs.
- **Densité** (Q8), **contraste / relief** (Q7), **formes** organiques ou nettes (Q9), Q12 nuance l'ensemble.
- **Palette accordée à la couleur principale** (`palette3`) : la principale + ses nuances (jamais plus saturées), deux voisines douces, des neutres accordés, un seul accent adouci.
  L'eau, le ciel, les strates prennent les nuances de la principale **quel que soit l'univers** (une mer bordeaux reste bordeaux).
  **Règle de dominance : la couleur principale couvre au moins 45 % du tapis.**
- **Végétation en massifs** (grosse touffe + couronne plus claire, une seule famille de couleur), calme entre les massifs, nombre de laines plafonné.
- **Mêmes réponses = même tapis.** « Changer » modifie vraiment le tapis sans tout redistribuer.
- **Remplacer une couleur** : sous le tapis, chaque laine (≥ 1 %) peut être remplacée ; **la couleur principale ne se change qu'en revenant à l'étape Couleur et forme**.

## Décisions prises (ne pas revenir dessus sans en parler)

- Le client ne doit **pas douter** : pas de choix d'ambiance, pas de « Autre proposition », pas de légende technique côté client.
- Les « Changer » par couche restent (personnalisation).
- **Abandonné** : ambiance lave/volcan (jamais beau), ambiance « épurée » vide avec un galet, style **motif symétrique / répété** (rosace, écailles…), forme fleur de lotus, l'ancien contour « organique » irrégulier, le rendu « client » simulé en 2D, les palettes par saison qui donnaient des assemblages criards.
- Formes d'après les références de l'atelier : **tache** = goutte lisse asymétrique avec une baie ; **nuage** = bulles ; **feuille** = différente à chaque tapis ; **pétales ronds** = hortensia / rose ouverte.
- Pas de chemin dans le ciel : une voie lactée diffuse.
- Les retours de l'atelier portent surtout sur **l'esthétique et la cohérence des couleurs** : un tapis de méditation doit être beau, calme, cohérent, donner envie de s'y asseoir.

## Rendu réaliste (Blender, sur le Mac M1 Max de l'atelier)

- `rendu/rendu_blender.py` : tapis 3D (relief réel, vraies fibres en poils, texture selon le point), vue du dessus.
- `rendu/serveur.py` : petit serveur local qui affiche le site et lance Blender à la demande ; le site lance le rendu tout seul à l'étape « Ton tapis ». Environ 30 s sur le Mac.
- `demarrer-le-serveur.command` : site sur http://localhost:8765/.
- `partager-le-serveur.command` : lien public temporaire (cloudflared) avec code d'accès, pour tester à distance ; les rendus restent faits sur le Mac.
- Sur le lien claude.ai (aperçu) il n'y a pas de rendu : la page ne peut pas parler au Mac.

## Fichiers

- `index.html` : questionnaire, portrait, interface. `moteur.js` : générateur (et rendu 2D / plan atelier).
- `rendu/` : Blender, serveur, export. `data/laines.json` : nuancier. `references/ANALYSE.md` : analyse des images de référence.
- `A-FAIRE.md` : chantiers à venir. `prototype.html` : ancien prototype, plus à jour.
- Branche de travail : `claude/couleurs-le-disent-app-rsxtki` du dépôt `dondaco/dondaco`.

## Façon de travailler

- Répondre en français simple : les personnes de l'atelier ne sont pas développeuses.
- Après chaque changement : tester (Playwright est disponible), montrer des images avant/après, puis commit + push sur la branche.
- Avant de commencer : `git pull` (deux personnes travaillent sur le projet) ; éviter de modifier `moteur.js` / `index.html` en même temps.
