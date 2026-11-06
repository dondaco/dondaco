// Exporte les cartes d'un tapis (couleurs, hauteurs, points) en PNG pour Blender.
// Usage : node exporter.js ../moteur.js DOSSIER '{réglages du tapis en JSON}' [pixels_par_cm]
const {chromium}=require("playwright");const fs=require("fs");
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.setContent("<html><body></body></html>");await p.addScriptTag({path:process.argv[2]});
const q=JSON.parse(process.argv[4]),G=+process.argv[5]||8;
const out=await p.evaluate(({q,G})=>{const g=Moteur.generate(q,G),m=Moteur.maps(g),res={info:g.info};
  for(const k of ["col","hei","tec"]){const cv=document.createElement("canvas");cv.width=m.w;cv.height=m.h;cv.getContext("2d").putImageData(new ImageData(m[k],m.w,m.h),0,0);res[k]=cv.toDataURL("image/png").split(",")[1];}
  const cv=document.createElement("canvas");Moteur.render(cv,g,"atelier");res.atelier=cv.toDataURL("image/png").split(",")[1];return res;},{q,G});
fs.mkdirSync(process.argv[3],{recursive:true});
for(const[k,f]of[["col","couleurs.png"],["hei","hauteurs.png"],["tec","points.png"],["atelier","atelier.png"]])fs.writeFileSync(process.argv[3]+"/"+f,Buffer.from(out[k],"base64"));
console.log(out.info.join(", "));await b.close();})();
