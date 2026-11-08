#!/bin/bash
# Double-clique sur ce fichier pour lancer le site avec les rendus réalistes (Blender) sur ce Mac.
# Laisse la fenêtre du Terminal ouverte pendant que tu utilises le site.
cd "$(dirname "$0")"
APP="/Applications/Blender.app"
PY=$(ls "$APP"/Contents/Resources/*/python/bin/python3* 2>/dev/null | head -1)
[ -z "$PY" ] && PY=$(command -v python3)
if [ -z "$PY" ]; then echo "Blender est introuvable. Installe-le depuis https://www.blender.org/download/ puis relance."; read -p "Entrée pour fermer"; exit 1; fi
(sleep 2; open "http://localhost:8765/") &
"$PY" rendu/serveur.py 8765
