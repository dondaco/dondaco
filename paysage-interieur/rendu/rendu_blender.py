"""Rendu réaliste d'un tapis « Paysage intérieur » avec Blender (Cycles).

Entrées (dans un dossier) : couleurs.png, hauteurs.png, points.png exportés par le moteur.
  - couleurs.png : la couleur de chaque laine, transparent hors du tapis
  - hauteurs.png : la hauteur de laine, gris 0 → 0 cm, blanc → 6 cm
  - points.png   : le point (40 = cut 1,5 · 80 = loop 3 · 120 = cut 4 · 160 = cut 4 brossé · 200 = pompon)

Lancer :
  blender -b -P rendu_blender.py -- DOSSIER SORTIE.png [largeur_cm hauteur_cm] [echantillons] [vue]
  vue = "photo" (de biais, comme une photo produit) ou "dessus" (vu du dessus)
"""
import sys, math, time
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DOSSIER = argv[0] if len(argv) > 0 else "."
SORTIE = argv[1] if len(argv) > 1 else "rendu.png"
LARG_CM = float(argv[2]) if len(argv) > 2 else 70.0
HAUT_CM = float(argv[3]) if len(argv) > 3 else 100.0
SAMPLES = int(argv[4]) if len(argv) > 4 else 64
VUE = argv[5] if len(argv) > 5 else "photo"
t0 = time.time()

# --- scène vide ---
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def charge(nom, couleur=False):
    img = bpy.data.images.load(f"{DOSSIER}/{nom}")
    img.colorspace_settings.name = "sRGB" if couleur else "Non-Color"
    return img

img_col = charge("couleurs.png", True)
img_hei = charge("hauteurs.png")
img_tec = charge("points.png")
W, H = img_hei.size

# --- hauteurs adoucies (la laine n'a pas d'arêtes vives) ---
px = np.array(img_hei.pixels[:], dtype=np.float32).reshape(H, W, 4)
h = px[:, :, 0].copy()
dedans = np.array(img_col.pixels[:], dtype=np.float32).reshape(H, W, 4)[:, :, 3] > 0.5
h[~dedans] = 1.5 / 6  # hors du tapis : même hauteur que le bord, pour un bord net
for _ in range(2):
    p = np.pad(h, 1, mode="edge")
    h = (p[:-2, :-2] + p[:-2, 1:-1] + p[:-2, 2:] + p[1:-1, :-2] + p[1:-1, 1:-1] + p[1:-1, 2:] + p[2:, :-2] + p[2:, 1:-1] + p[2:, 2:]) / 9
px[:, :, 0] = px[:, :, 1] = px[:, :, 2] = h
img_hei.pixels[:] = px.ravel()

# --- le tapis : une grille déformée par les hauteurs ---
lx, ly = LARG_CM / 100, HAUT_CM / 100
bpy.ops.mesh.primitive_grid_add(x_subdivisions=W, y_subdivisions=H, size=1)
tapis = bpy.context.active_object
tapis.name = "Tapis"
tapis.scale = (lx, ly, 1)
tex = bpy.data.textures.new("hauteurs", type="IMAGE")
tex.image = img_hei
tex.extension = "EXTEND"
dep = tapis.modifiers.new("relief", "DISPLACE")
dep.texture = tex
dep.texture_coords = "UV"
dep.mid_level = 0.0
dep.strength = 0.06 / 1.0  # 1.0 = 6 cm ; l'objet n'est pas mis à l'échelle en Z
# découpe : on garde seulement la forme du tapis (pixels non transparents)
import bmesh
alpha = np.array(img_col.pixels[:], dtype=np.float32).reshape(H, W, 4)[:, :, 3]
bm = bmesh.new(); bm.from_mesh(tapis.data)
uvl = bm.loops.layers.uv.active
hors = set()
for f in bm.faces:
    u = sum(l[uvl].uv.x for l in f.loops) / len(f.loops); v = sum(l[uvl].uv.y for l in f.loops) / len(f.loops)
    if alpha[min(H - 1, int(v * H)), min(W - 1, int(u * W))] < 0.5: hors.add(f)
bmesh.ops.delete(bm, geom=list(hors), context="FACES")
bm.to_mesh(tapis.data); bm.free()
epa = tapis.modifiers.new("épaisseur", "SOLIDIFY"); epa.thickness = 0.008; epa.offset = -1
bpy.ops.object.shade_smooth()

# --- la matière : laine ---
mat = bpy.data.materials.new("Laine")
mat.use_nodes = True
nt = mat.node_tree
N, L = nt.nodes, nt.links
N.clear()
out = N.new("ShaderNodeOutputMaterial")
bsdf = N.new("ShaderNodeBsdfPrincipled")
uv = N.new("ShaderNodeTexCoord")
tcol = N.new("ShaderNodeTexImage"); tcol.image = img_col; tcol.interpolation = "Linear"
ttec = N.new("ShaderNodeTexImage"); ttec.image = img_tec; ttec.interpolation = "Closest"
for t in (tcol, ttec):
    L.new(uv.outputs["UV"], t.inputs["Vector"])

def masque(val):  # 1 là où le point vaut val (en /255)
    c = N.new("ShaderNodeMath"); c.operation = "COMPARE"
    c.inputs[1].default_value = val / 255; c.inputs[2].default_value = 0.06
    L.new(ttec.outputs["Color"], c.inputs[0]); return c
m_loop, m_brush, m_pom = masque(80), masque(160), masque(200)

# fibres du velours coupé : petites touffes (Voronoi) + fibres fines (bruit)
obj = N.new("ShaderNodeTexCoord")
vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 260
L.new(obj.outputs["Object"], vor.inputs["Vector"])
fib = N.new("ShaderNodeTexNoise"); fib.inputs["Scale"].default_value = 1400; fib.inputs["Detail"].default_value = 4
L.new(obj.outputs["Object"], fib.inputs["Vector"])
cut = N.new("ShaderNodeMath"); cut.operation = "MULTIPLY_ADD"; cut.inputs[1].default_value = -0.7; cut.inputs[2].default_value = 1
L.new(vor.outputs["Distance"], cut.inputs[0])
cutf = N.new("ShaderNodeMixRGB"); cutf.blend_type = "MULTIPLY"; cutf.inputs["Fac"].default_value = 0.35
L.new(cut.outputs[0], cutf.inputs[1]); L.new(fib.outputs["Fac"], cutf.inputs[2])
# boucles du loop : bord des cellules
vl = N.new("ShaderNodeTexVoronoi"); vl.feature = "DISTANCE_TO_EDGE"; vl.inputs["Scale"].default_value = 230
L.new(obj.outputs["Object"], vl.inputs["Vector"])
loopb = N.new("ShaderNodeMath"); loopb.operation = "POWER"; loopb.inputs[1].default_value = 0.35
L.new(vl.outputs["Distance"], loopb.inputs[0])
# brossé : doux, presque lisse
brs = N.new("ShaderNodeTexNoise"); brs.inputs["Scale"].default_value = 90; brs.inputs["Detail"].default_value = 6
L.new(obj.outputs["Object"], brs.inputs["Vector"])
mix1 = N.new("ShaderNodeMixRGB"); L.new(m_loop.outputs[0], mix1.inputs["Fac"]); L.new(cutf.outputs[0], mix1.inputs[1]); L.new(loopb.outputs[0], mix1.inputs[2])
mix2 = N.new("ShaderNodeMixRGB"); L.new(m_brush.outputs[0], mix2.inputs["Fac"]); L.new(mix1.outputs[0], mix2.inputs[1]); L.new(brs.outputs["Fac"], mix2.inputs[2])
bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.75; bump.inputs["Distance"].default_value = 0.003
L.new(mix2.outputs[0], bump.inputs["Height"])
# laine chinée : légère variation de couleur
var = N.new("ShaderNodeTexNoise"); var.inputs["Scale"].default_value = 60
L.new(obj.outputs["Object"], var.inputs["Vector"])
vr = N.new("ShaderNodeMapRange"); vr.inputs["To Min"].default_value = 0.86; vr.inputs["To Max"].default_value = 1.06
L.new(var.outputs["Fac"], vr.inputs["Value"])
ombre = N.new("ShaderNodeMixRGB"); ombre.blend_type = "MULTIPLY"; ombre.inputs["Fac"].default_value = 1
L.new(tcol.outputs["Color"], ombre.inputs[1]); L.new(vr.outputs["Result"], ombre.inputs[2])
# les creux entre les touffes sont un peu plus sombres
creux = N.new("ShaderNodeMixRGB"); creux.blend_type = "MULTIPLY"; creux.inputs["Fac"].default_value = 0.45
L.new(ombre.outputs[0], creux.inputs[1]); L.new(mix2.outputs[0], creux.inputs[2])
L.new(creux.outputs[0], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.95
bsdf.inputs["Sheen Weight"].default_value = 0.3
bsdf.inputs["Sheen Roughness"].default_value = 0.6
L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
L.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
tapis.data.materials.append(mat)

# --- le sol ---
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, -0.0005))
sol = bpy.context.active_object
ms = bpy.data.materials.new("Sol"); ms.use_nodes = True
pb = ms.node_tree.nodes["Principled BSDF"]
pb.inputs["Base Color"].default_value = (0.62, 0.52, 0.40, 1)
pb.inputs["Roughness"].default_value = 0.55
sol.data.materials.append(ms)

# --- lumière : soleil rasant doux + ciel clair ---
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(55), 0, math.radians(-35)))
sun = bpy.context.active_object.data; sun.energy = 2.6; sun.angle = math.radians(12)
world = bpy.data.worlds.new("Ciel"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.85, 0.87, 0.9, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45

# --- caméra ---
bpy.ops.object.camera_add()
cam = bpy.context.active_object; scene.camera = cam
if VUE == "dessus":
    cam.location = (0, 0, 1.55); cam.rotation_euler = (0, 0, 0); cam.data.lens = 50
    scene.render.resolution_x, scene.render.resolution_y = 840, 1160
else:
    cam.location = (0, -0.92, 0.86); cam.data.lens = 38
    d = bpy.data.objects.new("cible", None); d.location = (0, 0.04, 0); scene.collection.objects.link(d)
    tr = cam.constraints.new("TRACK_TO"); tr.target = d; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
    scene.render.resolution_x, scene.render.resolution_y = 1000, 1000

# --- rendu ---
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
try:  # sur un Mac Apple Silicon, utiliser la carte graphique (Metal)
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"; prefs.get_devices()
    if any(d.type == "METAL" for d in prefs.devices):
        for d in prefs.devices: d.use = True
        scene.cycles.device = "GPU"
except Exception:
    pass
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"  # couleurs fidèles aux laines
scene.render.filepath = SORTIE
bpy.ops.render.render(write_still=True)
print(f"RENDU TERMINÉ en {time.time() - t0:.0f} s ({scene.cycles.device}, {SAMPLES} échantillons) → {SORTIE}")
