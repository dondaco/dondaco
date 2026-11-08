#!/bin/bash
# Double-clique sur ce fichier pour partager le site (et les rendus faits sur ce Mac) avec quelqu'un à distance.
# Il donne un lien à envoyer. Laisse la fenêtre ouverte et le Mac allumé pendant que la personne l'utilise.
cd "$(dirname "$0")"
APP="/Applications/Blender.app"
PY=$(ls "$APP"/Contents/Resources/*/python/bin/python3* 2>/dev/null | head -1)
[ -z "$PY" ] && PY=$(command -v python3)
if [ -z "$PY" ]; then echo "Blender est introuvable. Installe-le depuis https://www.blender.org/download/ puis relance."; read -p "Entrée pour fermer"; exit 1; fi
if curl -s http://localhost:8766/etat >/dev/null; then echo "Le partage tourne déjà dans une autre fenêtre."; read -p "Entrée pour fermer"; exit 0; fi
# cloudflared : crée un lien public temporaire vers ce Mac (gratuit, sans compte)
CF="./rendu/cloudflared"
if [ ! -x "$CF" ]; then
  echo "Première fois : téléchargement de cloudflared…"
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz | tar xz -C rendu && chmod +x "$CF"
fi
if [ ! -x "$CF" ]; then echo "Impossible de télécharger cloudflared."; read -p "Entrée pour fermer"; exit 1; fi
CODE=$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 10)
PAYSAGE_CODE="$CODE" "$PY" rendu/serveur.py 8766 >/dev/null 2>&1 &
SERVEUR=$!
trap 'kill $SERVEUR 2>/dev/null' EXIT
sleep 1
echo "Création du lien…"
"$CF" tunnel --no-autoupdate --url http://localhost:8766 2>&1 | while read -r ligne; do
  URL=$(echo "$ligne" | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com')
  if [ -n "$URL" ]; then
    LIEN="$URL/?code=$CODE"
    echo ""
    echo "Lien à envoyer : $LIEN"
    echo "$LIEN" | pbcopy && echo "(il est déjà copié : colle-le dans un message)"
    echo ""
    echo "Laisse cette fenêtre ouverte. Ctrl + C pour arrêter le partage."
  fi
done
