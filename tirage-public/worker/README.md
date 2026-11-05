# Interprétation par Claude pour tous les visiteurs

Le site est statique : il ne peut pas contenir de clé secrète. Ce petit service relais (Cloudflare Worker, gratuit)
garde ta clé API Claude côté serveur, reçoit les tirages du site et renvoie l'interprétation.

## Mise en place (une fois, environ 15 minutes)

1. **Clé API Claude** : sur https://console.anthropic.com, crée un compte, ajoute un moyen de paiement
   (facturation à l'usage, indépendante de l'abonnement Claude), fixe une **limite de dépense mensuelle**
   (Settings → Limits), puis crée une clé (API Keys → Create Key). Garde-la pour l'étape 3.
2. **Cloudflare** : crée un compte gratuit sur https://dash.cloudflare.com, puis
   Workers & Pages → Create → Create Worker. Nomme-le `couleurs-ia`, valide, puis « Edit code » :
   remplace tout le code par le contenu de `worker.js`, puis « Deploy ».
3. **Secret** : dans le Worker → Settings → Variables and Secrets → Add → type *Secret*,
   nom `ANTHROPIC_API_KEY`, valeur = ta clé. Enregistre.
4. **Adresse** : copie l'adresse du Worker (du type `https://couleurs-ia.<ton-nom>.workers.dev`)
   et mets-la dans `tirage-public/index.html`, à la ligne `const AI_ENDPOINT = "";`
   (ou envoie-la à Claude, qui la mettra pour toi).

## Sécurité et coût

- La clé n'apparaît jamais dans le site.
- Le service n'accepte que les demandes venant de `https://dondaco.github.io`, et seulement des tirages
  (pas de questions libres), avec au plus 20 interprétations par heure et par visiteur.
- Le modèle utilisé est le plus économique (Claude Haiku) ; chaque interprétation coûte moins d'un centime.
  La limite de dépense fixée à l'étape 1 garantit que la facture ne peut pas dépasser ce que tu as choisi.
