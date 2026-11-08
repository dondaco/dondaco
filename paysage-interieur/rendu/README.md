# Rendu réaliste avec Blender

Le moteur dessine le plan du tapis ; Blender en fait une image réaliste : relief réel (1,5 / 3 / 4 cm),
la couleur de chaque laine, une texture différente pour le velours coupé, le loop et le brossé,
le tapis posé sur un sol sous une lumière douce.

## Le plus simple : rendu automatique depuis le site (sur le Mac)

1. Installe Blender (gratuit) dans Applications : https://www.blender.org/download/
2. Télécharge le dossier `paysage-interieur` et double-clique sur **`demarrer-le-serveur.command`**
   (la première fois, macOS peut le bloquer : clic droit > Ouvrir > Ouvrir).
   Le site s'ouvre dans le navigateur à l'adresse http://localhost:8765/ ; laisse la fenêtre du Terminal ouverte.
3. Réponds au questionnaire. Sous le plan du tapis : **« Aperçu rapide »** (environ 30 s, image réduite)
   ou **« Rendu réaliste »** (fibres complètes). Blender calcule en arrière-plan et l'image s'affiche dans la page.

Le serveur (`rendu/serveur.py`) utilise le Python inclus dans Blender : rien d'autre à installer.
Ce mode ne marche pas depuis le lien claude.ai (la page n'a pas le droit de parler à l'ordinateur) :
là, utilise le bouton « Exporter pour Blender ».

## À la main : exporter les cartes d'un tapis

Il faut Node.js et Playwright (`npm install playwright`, puis `npx playwright install chromium`).

```bash
node exporter.js ../moteur.js mon-tapis "$(node -e 'console.log(JSON.stringify(require("./exemples.json")[3]))')" 8
```

Le dossier `mon-tapis` contient alors `couleurs.png`, `hauteurs.png`, `points.png` et `atelier.png` (le plan).

## 2. Lancer le rendu

Blender (gratuit) : https://www.blender.org/download/ — sur un Mac Apple Silicon, le script utilise la carte graphique (Metal).

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P rendu_blender.py -- mon-tapis rendu-photo.png 70 100 128 photo
```

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P rendu_blender.py -- mon-tapis rendu-dessus.png 70 100 128 dessus
```

Arguments : dossier, image de sortie, largeur et hauteur du tapis en cm, échantillons (64 pour un test, 128 à 256 pour une belle image), vue (`photo` de biais ou `dessus`).

Temps mesurés sur le serveur de test (4 cœurs, sans carte graphique, 64 échantillons) : environ 75 s en vue photo (1000 × 1000) et 110 s en vue de dessus (840 × 1160).
