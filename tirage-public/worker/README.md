# Interprétation, échange et mémoire des retours (service relais)

Le site est statique : il ne peut pas contenir de clé secrète. Ce petit service (Cloudflare Worker, gratuit)
garde ta clé API Claude côté serveur. Il fait trois choses :

- **/interpretation** : la conclusion du tirage, inspirée des retours passés bien reçus ;
- **/echange** : une courte conversation (8 messages maximum) où la personne dit comment elle reçoit son tirage ;
- **/retour** : si la personne coche la case de consentement, Claude tire de l'échange une **leçon anonyme**
  (sans prénom, question ni détail personnel) qui sera réutilisée pour les prochains tirages du même type
  et des mêmes couleurs.

## Mise en place (une fois, environ 20 minutes)

1. **Clé API Claude** : sur https://console.anthropic.com, crée un compte, ajoute un moyen de paiement
   (facturation à l'usage, indépendante de l'abonnement Claude), fixe une **limite de dépense mensuelle**
   (Settings → Limits), puis crée une clé (API Keys → Create Key).
2. **Cloudflare** : compte gratuit sur https://dash.cloudflare.com → Workers & Pages → Create → Create Worker.
   Nomme-le `couleurs-ia`, valide, puis « Edit code » : remplace tout par le contenu de `worker.js`, puis « Deploy ».
3. **Secret** : Worker → Settings → Variables and Secrets → Add → type *Secret*, nom `ANTHROPIC_API_KEY`, valeur = ta clé.
4. **Mémoire des retours** : Storage & Databases → KV → Create namespace, nom `couleurs-retours`.
   Puis Worker → Settings → Bindings → Add → KV namespace, nom de variable `RETOURS`, choisir `couleurs-retours`.
   (Sans cette étape tout fonctionne, mais les retours ne sont pas mémorisés.)
5. **Adresse** : copie l'adresse du Worker (`https://couleurs-ia.<ton-nom>.workers.dev`) et envoie-la à Claude,
   ou mets-la dans `tirage-public/index.html` à la ligne `const AI_ENDPOINT = "";`.

Tu peux relire les leçons enregistrées dans Cloudflare : KV → `couleurs-retours` → les clés `t:<tirage>`
(par tirage) et `c:<couleur>:<côté>` (par couleur).

## Sécurité, vie privée et coût

- La clé n'apparaît jamais dans le site.
- Le service n'accepte que les demandes venant de `https://dondaco.github.io`, ne parle que du tirage,
  et limite à 40 appels par heure et par visiteur.
- Rien n'est conservé sans la case cochée ; ce qui est conservé est une leçon générale et anonyme, pas la conversation.
- Modèle le plus économique (Claude Haiku) : un tirage avec échange coûte de l'ordre d'un centime.
  La limite de dépense de l'étape 1 plafonne la facture.
