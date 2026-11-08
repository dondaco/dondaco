"""Serveur local « Paysage intérieur » : affiche le site et fait les rendus Blender en arrière-plan.

Lancer (le plus simple) : double-clic sur demarrer-le-serveur.command, qui utilise le Python inclus dans Blender.
Ou à la main :  python3 serveur.py [port]
Puis ouvrir http://localhost:8765/ dans le navigateur.

Le site détecte le serveur (GET /etat) et affiche le bouton « Rendu réaliste » ;
il envoie les cartes du tapis (POST /rendu) et reçoit l'image rendue.
Bibliothèque standard uniquement.
"""
import base64, glob, json, os, shutil, subprocess, sys, tempfile, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ICI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ICI)  # le dossier paysage-interieur
SCRIPT = os.path.join(ICI, "rendu_blender.py")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
VERROU = threading.Lock()  # un rendu à la fois
QUALITES = {  # fibres, échantillons, taille de l'image en %
    "apercu": (8000, 16, 50),
    "finale": (60000, 96, 100),
}


def trouver_blender():
    candidats = [os.environ.get("BLENDER", ""), "/Applications/Blender.app/Contents/MacOS/Blender",
                 shutil.which("blender") or ""]
    for c in candidats:
        if c and os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    return None


BLENDER = trouver_blender()


class Gestion(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=SITE, **k)

    def log_message(self, fmt, *args):
        if "/rendu" in (self.path or ""):
            super().log_message(fmt, *args)

    def repondre(self, code, obj):
        corps = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path.startswith("/etat"):
            return self.repondre(200, {"ok": True, "blender": bool(BLENDER), "occupe": VERROU.locked()})
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith("/rendu"):
            return self.repondre(404, {"erreur": "inconnu"})
        if not BLENDER:
            return self.repondre(500, {"erreur": "Blender introuvable. Installe-le dans Applications, ou indique son chemin dans la variable BLENDER."})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            q = json.loads(self.rfile.read(n))
        except Exception:
            return self.repondre(400, {"erreur": "demande illisible"})
        fibres, ech, res = QUALITES.get(q.get("qualite"), QUALITES["finale"])
        vue = "photo" if q.get("vue") == "photo" else "dessus"
        if not VERROU.acquire(blocking=False):
            return self.repondre(409, {"erreur": "Un rendu est déjà en cours, réessaie dans un moment."})
        dossier = tempfile.mkdtemp(prefix="tapis-")
        try:
            for nom in ("couleurs", "hauteurs", "points"):
                with open(os.path.join(dossier, nom + ".png"), "wb") as f:
                    f.write(base64.b64decode(q[nom]))
            sortie = os.path.join(dossier, "rendu.png")
            t0 = time.time()
            cmd = [BLENDER, "-b", "-P", SCRIPT, "--", dossier, sortie, str(q.get("largeur", 70)), str(q.get("hauteur", 100)),
                   str(ech), vue, str(fibres), str(res)]
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
            if p.returncode != 0 or not os.path.isfile(sortie):
                fin = (p.stdout + p.stderr)[-1500:]
                return self.repondre(500, {"erreur": "Le rendu a échoué.", "journal": fin})
            with open(sortie, "rb") as f:
                img = base64.b64encode(f.read()).decode()
            return self.repondre(200, {"image": img, "secondes": round(time.time() - t0)})
        except subprocess.TimeoutExpired:
            return self.repondre(500, {"erreur": "Le rendu a pris plus de 30 minutes et a été arrêté."})
        except Exception as e:
            return self.repondre(500, {"erreur": f"Erreur : {e}"})
        finally:
            VERROU.release()
            shutil.rmtree(dossier, ignore_errors=True)


if __name__ == "__main__":
    print(f"Paysage intérieur : http://localhost:{PORT}/")
    print("Blender :", BLENDER or "INTROUVABLE — installe Blender dans Applications")
    print("Laisse cette fenêtre ouverte pendant que tu utilises le site. Ctrl+C pour arrêter.")
    ThreadingHTTPServer(("127.0.0.1", PORT), Gestion).serve_forever()
