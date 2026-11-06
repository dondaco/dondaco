/* Moteur de génération des tapis « Paysage intérieur ».
   Le tapis est construit par couches à partir des réponses :
   base (relief) → eau → végétation → pierre → ciel → chemin → nettoyage (aucun élément < 1 cm).
   Chaque zone = une laine du nuancier + un point (cut 1,5 / loop 3 / cut 4 / cut 4 brossé / pompon) + une hauteur. */
(function(){
"use strict";
const LAINES=[["061","Noir","#131314"],["1B07","Anthracite Grey","#36343D"],["000","Blanc","#EBDBC8"],["4N05","Cloud Dancer","#E3CFBE"],["009","Écru","#EADACC"],["3A17","Teal","#236F78"],["205","Forest Green","#446748"],["1I06","Moss Green","#4F7739"],["192","Sacramento","#354E37"],["206","Granite Green","#7E9887"],["209","Vert Frêne","#B3BEA9"],["1J08","Apple Green","#ACB64B"],["802C","Vert néon","#A1CE56"],["153","Mary Jane Green","#839A52"],["803C","Reflecting Green","#BBCC54"],["169","Mojito","#CAC58E"],["366","Château de sable","#CFA37E"],["429","Light Yellow / Butter","#F5DAAC"],["447","Illuminating Yellow","#F5D97C"],["3J01","Jaune","#F8CC4C"],["3H04","Miel","#F2B436"],["423","Mangue","#EFA721"],["313","Orange","#F48820"],["2C13","Pumpkin Orange","#F16D34"],["2024C","Peach Fuzz","#E68F6B"],["325","Abricot clair","#EEAD87"],["368","Ivoire Chaud","#E7CCB4"],["499","Ivoire Pâle","#E8C3BA"],["498","Rose Regina","#EAABAC"],["336","Rose poussiéreux","#C99791"],["459","Rose coquillage","#F2A9B2"],["517","Rose amarante","#DA96A9"],["485","Rose Pink","#D883AB"],["806C","Rose bonbon","#F691AA"],["4E08","Strawberry","#F44E69"],["805C","Saumon cru","#F77164"],["301","Paprika","#DE4617"],["2A11","Burnt Sienna","#BF3718"],["452","Rouge","#E1132A"],["4D05","Indian Red","#E57B79"],["BRB 1530","Pink Doll","#F169A0"],["464","Raspberry","#D23870"],["4A08","Deep Red","#B90526"],["4A13","Rouge Écarlate","#A2102F"],["502","Cassis","#652F50"],["585","Violet","#664BAA"],["597","Lavande","#B498B9"],["278","Jordy Blue","#94A8CE"],["218","Pastel Blue","#B3CBD3"],["300","Aquamarine","#BBD8D0"],["ARS3F15","Bleu clair","#94CFD9"],["274","Cote d'Azur","#3873B3"],["ARS2K12","Bleu","#2756A7"],["3B15","Cobalt Blue","#0A5A9D"],["264","Atlantic Blue","#3F6691"],["561","Navy","#1E1B5D"],["2J10","Royal Indigo","#081D61"],["1I11","Ombre de Fougère","#66600E"],["381","Branche d'olivier","#8D682E"],["403","Green Olive","#90762C"],["4H11","Coffee","#44291C"],["351","Marron","#99622D"],["4L11","Mousse de moka","#A1775A"],["353","Chameau","#C0812B"],["113","Gris ancre","#75787D"],["096","Rhino Grey","#9D9596"],["056","Gris tonnerre","#C1AFA6"],["AD10","Gris soie","#CCBEB2"],["110","Cloud","#CCC8CD"],["","Non teinté clair","#C2B6AC"],["","Moyen non teint","#8C8784"],["","Foncé non teint","#493D38"]];
const Y={};LAINES.forEach(([ref,nom,hex])=>{if(ref)Y[ref]={ref,nom,hex,rgb:[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))};});
const TECH={cut15:"Cut 1,5 cm",loop3:"Loop 3 cm",cut4:"Cut 4 cm",brush4:"Cut 4 cm brossé",pompon:"Pompons"};
const RW=70,RH=100;

/* ---------- hasard, bruit, outils ---------- */
function rng(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  let a=h>>>0,b=Math.imul(h,0x9E3779B9)>>>0,c=0x85EBCA6B^a,d=0xC2B2AE35^b;
  return()=>{a|=0;b|=0;c|=0;d|=0;const t=(a+b|0)+d|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=c<<21|c>>>11;c=c+t|0;return(t>>>0)/4294967296;};}
function makeNoise(r){const N=64,g=new Float32Array(N*N);for(let i=0;i<N*N;i++)g[i]=r();
  return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,X0=xi&63,X1=(xi+1)&63,Y0=(yi&63)*N,Y1=((yi+1)&63)*N;
    const a=g[Y0+X0],b=g[Y0+X1],c=g[Y1+X0],d=g[Y1+X1],sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};}
const fbm=(n,x,y)=>n(x,y)*.6+n(x*2.13+17.1,y*2.13+3.7)*.3+n(x*4.37+5.3,y*4.37+11.9)*.1;
const hash=(x,y)=>{let h=Math.imul(x,374761393)+Math.imul(y,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
function distT(mask,w,h){const INF=1e9,d=new Float32Array(w*h);for(let i=0;i<w*h;i++)d[i]=mask[i]?INF:0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!d[i])continue;let v=d[i];
    v=x>0?Math.min(v,d[i-1]+3):Math.min(v,3);
    if(y>0){v=Math.min(v,d[i-w]+3);if(x>0)v=Math.min(v,d[i-w-1]+4);if(x<w-1)v=Math.min(v,d[i-w+1]+4);}else v=Math.min(v,3);d[i]=v;}
  for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(!d[i])continue;let v=d[i];
    v=x<w-1?Math.min(v,d[i+1]+3):Math.min(v,3);
    if(y<h-1){v=Math.min(v,d[i+w]+3);if(x<w-1)v=Math.min(v,d[i+w+1]+4);if(x>0)v=Math.min(v,d[i+w-1]+4);}else v=Math.min(v,3);d[i]=v;}
  for(let i=0;i<w*h;i++)d[i]/=3;return d;}
function blur(src,w,h,r){if(r<1)return src.slice();const tmp=new Float32Array(w*h),out=new Float32Array(w*h),k=2*r+1;
  for(let y=0;y<h;y++){let s=0;const o=y*w;for(let x=-r;x<=r;x++)s+=src[o+Math.min(w-1,Math.max(0,x))];
    for(let x=0;x<w;x++){tmp[o+x]=s/k;s+=src[o+Math.min(w-1,x+r+1)]-src[o+Math.max(0,x-r)];}}
  for(let x=0;x<w;x++){let s=0;for(let y=-r;y<=r;y++)s+=tmp[Math.min(h-1,Math.max(0,y))*w+x];
    for(let y=0;y<h;y++){out[y*w+x]=s/k;s+=tmp[Math.min(h-1,y+r+1)*w+x]-tmp[Math.max(0,y-r)*w+x];}}
  return out;}

/* ---------- couleurs ---------- */
const lum=ref=>{const c=Y[ref].rgb;return .2126*c[0]+.7152*c[1]+.0722*c[2];};
function hsl(ref){const[r,g,b]=Y[ref].rgb.map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
  if(!d)return[0,0,l];const s=d/(1-Math.abs(2*l-1));let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;return[h,s,l];}
const AVOID=[[/rouge|red|bordeaux/,(h,s,l)=>s>.35&&(h>345||h<14)&&l<.75],[/rose|pink/,(h,s,l)=>s>.3&&(h>300||h<14)&&l>.55],
  [/orange/,(h,s)=>s>.4&&h>=14&&h<40],[/jaune|yellow|moutarde/,(h,s)=>s>.35&&h>=40&&h<66],[/vert|green|kaki/,(h,s)=>s>.15&&h>=66&&h<170],
  [/bleu|blue|turquoise|marine/,(h,s)=>s>.15&&h>=170&&h<255],[/violet|mauve|lila|prune|purple/,(h,s)=>s>.15&&h>=255&&h<330],
  [/marron|brun|brown|beige|camel/,(h,s,l)=>h>=14&&h<45&&l<.62&&s>.2],[/gris|grey|gray/,(h,s)=>s<.12],[/noir|black/,(h,s,l)=>l<.18],[/blanc|white|écru|ecru/,(h,s,l)=>l>.82]];
const SEASONS={
  printemps:{ground:["153","1I06","1J08"],dom:["803C","1J08","153","1I06","205","169"],ana:[["429","447"],["459","498","2024C"]],
    pop:[["806C","485"],["597","585"],["313","2C13"],["274","ARS3F15"],["3J01"]],water:["300","ARS3F15","274","3B15"],foam:["009"],
    sand:["429","366","009"],stone:["AD10","096","113","056"],lava:["2C13","805C","2024C","447"],plates:["1B07","113","096"],night:["264","561"],disc:["447"],star:["009"]},
  ete:{ground:["206","209","169"],dom:["209","169","206","1I06","192"],ana:[["336","499","498"],["597","278"]],
    pop:[["517","485","464"],["597","585"],["218","278"],["429"]],water:["300","218","278","264"],foam:["4N05"],
    sand:["499","AD10","056"],stone:["110","096","113","1B07"],lava:["517","336","459","4N05"],plates:["561","1B07","264"],night:["2J10","561"],disc:["4N05"],star:["4N05"]},
  automne:{ground:["403","381","1I11"],dom:["1I06","403","381","1I11","205","192"],ana:[["353","3H04","423"],["4L11","351","4H11"]],
    pop:[["301","2A11"],["2024C","325"],["502","464"],["3A17","264"],["423","313"]],water:["300","3A17","264","561"],foam:["368"],
    sand:["366","353","4L11","368"],stone:["056","096","113","1B07"],lava:["2A11","301","353","3H04"],plates:["061","1B07","113"],night:["561","2J10"],disc:["3H04"],star:["368"]},
  hiver:{ground:["192","205","1B07"],dom:["209","206","205","192"],ana:[["096","113","056"],["AD10","4N05","110"]],
    pop:[["4A13","4A08"],["BRB 1530","806C"],["585","502"],["3B15","2J10"],["3J01"]],water:["110","ARS3F15","3B15","561"],foam:["000"],
    sand:["110","AD10","000"],stone:["AD10","096","113","1B07","061"],lava:["4A08","4A13","452","110"],plates:["061","1B07","113"],night:["561","2J10"],disc:["000"],star:["000"]}};
function palette(season,avoid){const S=SEASONS[season]||SEASONS.printemps,a=(avoid||"").toLowerCase().trim();
  const bad=a?AVOID.filter(([re])=>re.test(a)).map(x=>x[1]):[];
  const keep=ref=>Y[ref]&&!bad.some(f=>f(...hsl(ref)));
  const clean=(arr,fb)=>{const k=arr.filter(keep).sort((x,y)=>lum(y)-lum(x));return k.length?k:(fb||arr.filter(r=>Y[r]));};
  const P={};for(const k in S){if(k==="ana"||k==="pop")P[k]=S[k].map(f=>clean(f,[])).filter(f=>f.length);else P[k]=clean(S[k],clean(S.stone));}
  if(!P.ana.length)P.ana=[P.dom];if(!P.pop.length)P.pop=P.ana;return P;}

/* ---------- contexte ---------- */
function ctx(q,G){const w=Math.round(RW*G),h=Math.round(RH*G),N=w*h;
  const r=rng([q.seed,q.v,q.season,q.cx,q.shape,q.relief,q.dens,q.texture,JSON.stringify(q.layers)].join("|"));
  const n1=makeNoise(r),n2=makeNoise(r),n3=makeNoise(r),n4=makeNoise(r);
  const shape=q.shape||"organique",organic=shape==="organique";
  const sdfF=(x,y)=>{const cx=x-RW/2,cy=y-RH/2;
    if(shape==="rond"){return Math.hypot(cx,cy)-(RW/2-.6);}
    if(shape==="ovale"){const a=RW/2-.6,b=RH/2-.6;return(Math.hypot(cx/a,cy/b)-1)*Math.min(a,b);}
    const inset=organic?2.5:.6,rr=organic?17:3,qx=Math.abs(cx)-(RW/2-inset-rr),qy=Math.abs(cy)-(RH/2-inset-rr);
    let s=Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-rr;if(organic)s+=(fbm(n2,x/14,y/14)-.5)*9;return s;};
  const sdf=new Float32Array(N),inRug=new Uint8Array(N);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const s=sdfF((i+.5)/G,(j+.5)/G);sdf[j*w+i]=s;inRug[j*w+i]=s<0?1:0;}
  const zones=[null],zM=new Map();
  const Z=(ref,tech,kind)=>{if(!Y[ref]){(window.__badRefs=window.__badRefs||[]).push(kind+":"+ref);ref="056";}const key=ref+"|"+tech+"|"+kind;if(!zM.has(key)){zones.push({ref,tech,kind});zM.set(key,zones.length-1);}return zM.get(key);};
  const P=palette(q.season,q.avoid);
  const c={q,P,w,h,N,G,r,n1,n2,n3,n4,sdf,inRug,zone:new Uint16Array(N),H:new Float32Array(N).fill(1.5),wet:new Uint8Array(N),busy:new Uint8Array(N),zones,Z,
    pick:a=>a[Math.floor(r()*a.length)],info:[]};
  c.kind=o=>c.zone[o]?zones[c.zone[o]].kind:"";
  c.at=(x,y)=>{const i=Math.floor(x*G),j=Math.floor(y*G);return(i<0||j<0||i>=w||j>=h)?-1:j*w+i;};
  c.dens={epure:.55,equilibre:1,foisonnant:1.5}[q.dens]||1;
  return c;}
function heightFor(tech,ins,u,R,lumpN){
  if(tech==="loop3")return 1.5+1.5*sstep(0,.7,ins);if(tech==="cut15")return 1.5;if(tech==="pompon")return 4;
  const dome=Math.sqrt(Math.max(0,1-u*u*u)),lump=lumpN*(tech==="brush4"?.4:.9);
  return Math.max(1.5,1.5+2.5*sstep(0,Math.min(R*.7,4.5),ins)*(.8+.2*dome)-lump*sstep(0,2,ins));}
/* le point préféré selon le relief et la matière choisis */
function techFor(c,u=c.r()){const rl=c.q.relief,tx=c.q.texture;
  if(tx==="galet"&&u<.35)return"loop3";if(tx==="sable"&&u<.3)return"loop3";if(tx==="mousse"&&u<.3)return"brush4";
  if(rl==="lisse")return u<.7?"loop3":"cut4";if(rl==="doux")return u<.35?"loop3":u<.88?"cut4":"brush4";return u<.15?"loop3":u<.7?"cut4":"brush4";}
/* couleur d'un élément selon le niveau de couleurs : ton sur ton, nuancé, explosif */
function famFor(c,base){const u=c.r(),P=c.P;if(c.q.cx==="mono")return base;if(c.q.cx==="explosif")return u<.62?base:u<.84?c.pick(P.ana):c.pick(P.pop);return u<.88?base:c.pick(P.ana);}
function blob(c,m,ok){const {w,h,G,zone,H,n2,n3,inRug,busy}=c,z=c.Z(m.ref,m.tech,m.kind||"mousse"),b=Math.ceil(m.r*1.35*G),ci=m.x*G,cj=m.y*G;
  const p1=c.r()*6.28,p2=c.r()*6.28,zc=m.core?c.Z(m.core,m.tech,m.kind||"mousse"):0;
  for(let y=Math.max(0,Math.floor(cj-b));y<Math.min(h,cj+b);y++)for(let x=Math.max(0,Math.floor(ci-b));x<Math.min(w,ci+b);x++){const o=y*w+x;
    if(!inRug[o]||(ok&&!ok(o)))continue;const dx=x/G-m.x,dy=y/G-m.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    const sc=m.r*.55,rad=m.r*(.84+.32*fbm(n3,dx/sc+p1*7,dy/sc+p2*7))+(fbm(n3,x/G/1.2,y/G/1.2)-.5)*.8;
    if(d>=rad)continue;const ins=rad-d;zone[o]=zc&&ins>Math.max(1.6,rad*.45)+(fbm(n2,x/G/2+p2,y/G/2)-.5)*1.4?zc:z;
    H[o]=m.tech==="pompon"?1.5+m.r*.6+Math.sqrt(Math.max(0,m.r*m.r-d*d)):m.flat?m.flat:heightFor(m.tech,ins,d/rad,m.r,fbm(n2,dx/(m.r*.33)+p1*5,dy/(m.r*.33)));busy[o]=1;}}
const triIdx=(k,n)=>{if(n<2)return 0;const p=2*n-2,m=((k%p)+p)%p;return m<n?m:p-m;};
function bandField(c,bw,warp,ang,baseFn){const {w,h,G,n1,n2,n3}=c,F=new Float32Array(c.N),ca=Math.cos(ang),sa=Math.sin(ang);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const x=(i+.5)/G,y=(j+.5)/G,qx=fbm(n2,x/34,y/34),qy=fbm(n3,x/34+5,y/34);
    const b=baseFn?baseFn(x,y):(x*ca+y*sa);F[j*w+i]=b/bw+warp*(fbm(n1,x/26+2.2*qx,y/26+2.2*qy)-.5);}
  const Gm=new Float32Array(c.N);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const o=j*w+i,R=i<w-1?o+1:o,L=i>0?o-1:o,D=j<h-1?o+w:o,U=j>0?o-w:o;
    Gm[o]=Math.max(1e-3,Math.hypot((F[R]-F[L])/((R-L)||1),(F[D]-F[U])/(((D-U)/w)||1))*G);}
  return {F,Gm};}

/* ---------- bases (le relief) ---------- */
function basePlaine(c){const {w,h,G,n1,n2,zone,H,inRug,P}=c,g=P.ground;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const o=j*w+i;if(!inRug[o])continue;const x=i/G,y=j/G,m=fbm(n1,x/17+31,y/17+7);
    const ref=m>.62&&g[2]?g[2]:m>.5?g[1]||g[0]:g[0],loop=fbm(n2,x/12+3,y/12)>.64;zone[o]=c.Z(ref,loop?"loop3":"cut15","sol");H[o]=loop?3:1.5;}
  c.info.push("une plaine douce");}
function baseBandes(c,ramp,bw,warp,ang,baseFn,kind){const {zone,H,inRug}=c,{F,Gm}=bandField(c,bw,warp,ang,baseFn),cyc=["cut15","loop3","cut4","cut15","brush4"];
  for(let o=0;o<c.N;o++){if(!inRug[o])continue;const f=F[o],k=Math.floor(f),g=Gm[o],dm=Math.min(f-k,k+1-f)/g,t=cyc[((k%5)+5)%5];
    zone[o]=c.Z(ramp[triIdx(k,ramp.length)],t,kind);H[o]=t==="cut4"||t==="brush4"?heightFor(t,dm,.5,2.5,0):t==="loop3"?3:1.5;}}
function baseAnneaux(c){const {r,P}=c,cx=RW*(.3+.4*r()),cy=RH*(.3+.4*r()),sq=.75+r()*.4;
  const ramp=c.q.cx==="explosif"?P.dom.concat(P.ana[0].slice(0,2)):c.q.cx==="mono"?P.dom.slice(0,4):P.dom.concat(P.ana[0].slice(0,1));
  baseBandes(c,ramp,3.6/Math.sqrt(c.dens),5,0,(x,y)=>Math.hypot(x-cx,(y-cy)*sq),"anneau");c.ring={cx,cy,sq};c.info.push("des anneaux de mousse");}
function baseStrates(c,river){const {P,r}=c;let ramp=c.q.layers.relief==="vallee"?P.dom.slice():P.sand.concat(P.ana[0]||[]);
  if(c.q.cx==="mono")ramp=ramp.slice(0,4);if(c.q.cx==="explosif")ramp=ramp.concat((P.ana[1]||P.ana[0]).slice(0,2));ramp=[...new Set(ramp)];
  const bw=4.2/Math.sqrt(c.dens);
  if(river)baseBandes(c,ramp,bw,4,0,(x,y)=>Math.abs(x-river(y)),"strate");else baseBandes(c,ramp,bw,6,(r()-.5)*.6,null,"strate");
  c.info.push(c.q.layers.relief==="dunes"?"des dunes en strates":"des strates de vallée");}
function baseMontagne(c){const {w,h,G,r,n1,n2,zone,H,inRug,P}=c,s=8/Math.sqrt(c.dens),cols=Math.ceil(RW/s)+2,rows=Math.ceil(RH/s)+2,grid=[];
  const stones=c.q.cx==="mono"?P.stone.slice(1,4):P.stone,moss=P.dom,snow=c.q.season==="hiver";
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){const x=(gx-1+.15+.7*r())*s,y=(gy-1+.15+.7*r())*s,e=fbm(n1,x/30,y/30),lt=r();
    const ref=snow&&e>.66?P.foam[0]:stones[Math.min(stones.length-1,Math.floor((1-e*.6-lt*.4)*stones.length))];grid.push({x,y,e,ref,t:e>.58?"cut4":e>.44?"loop3":"cut4"});}
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const o=j*w+i;if(!inRug[o])continue;const x=(i+.5)/G,y=(j+.5)/G,gx=Math.floor(x/s)+1,gy=Math.floor(y/s)+1;
    let d1=1e9,d2=1e9,b=null;for(let a=-1;a<=1;a++)for(let bb=-1;bb<=1;bb++){const q=grid[(gy+bb)*cols+(gx+a)];if(!q)continue;const d=Math.hypot(x-q.x,y-q.y);if(d<d1){d2=d1;d1=d;b=q;}else if(d<d2)d2=d;}
    const m=fbm(n2,x/13,y/13);
    if(m<.4){zone[o]=c.Z(moss[Math.min(moss.length-1,(fbm(n1,x/9+9,y/9)>.5?2:3))],m<.36?"cut4":"brush4","mousse");H[o]=heightFor("cut4",(.4-m)*40,.5,3,0);}
    else{const e=(d2-d1)/2;zone[o]=c.Z(b.ref,b.t,"roche");H[o]=b.t==="loop3"?3:heightFor("cut4",e,.5,3,0);}}
  c.info.push("une montagne de roches et de mousse");}
function baseLave(c){const {w,h,G,r,n1,n2,n3,zone,H,inRug,P}=c,s=13/Math.sqrt(c.dens),cols=Math.ceil(RW/s)+2,rows=Math.ceil(RH/s)+2,grid=[];
  const plates=c.q.cx==="mono"?P.plates.slice(0,2):P.plates,lava=P.lava,lava2=P.lava.slice().reverse();
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++)grid.push({x:(gx-1+.15+.7*r())*s,y:(gy-1+.15+.7*r())*s,ref:c.pick(plates),t:techFor(c)});
  const ph=r()*6.28,x0=RW*(.32+.36*r()),xs=y=>x0+8*Math.sin(y/16+ph)+(fbm(n1,3.3,y/22)-.5)*14;
  for(let j=0;j<h;j++){const y=(j+.5)/G,xm=xs(y),wm=2+1.6*fbm(n2,y/15,3.1);
    for(let i=0;i<w;i++){const o=j*w+i;if(!inRug[o])continue;const x=(i+.5)/G,gx=Math.floor(x/s)+1,gy=Math.floor(y/s)+1;
      let d1=1e9,d2=1e9,b=null;for(let a=-1;a<=1;a++)for(let bb=-1;bb<=1;bb++){const q=grid[(gy+bb)*cols+(gx+a)];if(!q)continue;const d=Math.hypot(x-q.x,y-q.y);if(d<d1){d2=d1;d1=d;b=q;}else if(d<d2)d2=d;}
      const e=(d2-d1)/2,cw=.6+.7*fbm(n3,x/11,y/11),depth=Math.max(cw-e,wm-Math.abs(x-xm));
      if(depth>0){const band=depth<1?0:depth<2?1:depth<3?2:3,F=c.q.cx==="explosif"&&fbm(n1,x/25+9,y/25)>.58?lava2:lava;
        zone[o]=c.Z(F[F.length-1-Math.min(band,F.length-1)],"cut15","lave");H[o]=1.5;}
      else{zone[o]=c.Z(b.ref,b.t,"plaque");H[o]=heightFor(b.t,-depth,Math.min(1,d1/(s*.6)),s*.5,fbm(n2,x/1.8,y/1.8));}}}
  c.info.push("des plaques de basalte et une coulée");}

/* ---------- eau ---------- */
function waterBands(c,o,dIn,refs){const d=dIn,x=(o%c.w)/c.G,y=Math.floor(o/c.w)/c.G,wob=(fbm(c.n3,x/7,y/7)-.5)*1.1;
  const i=d<2.2+wob*.6?0:d<4.6+wob?1:d<8+wob?2:3;return refs[Math.min(i,refs.length-1)];}
function eauEtang(c,size){const {w,h,G,r,n1,inRug,sdf,zone,H,wet,P}=c,R0=RW*size,k=3+Math.floor(r()*3),balls=[];
  let px=RW/2+(r()-.5)*RW*.3,py=RH/2+(r()-.5)*RH*.32,ang=r()*6.283;
  for(let i=0;i<k;i++){const rad=R0*(i?(.4+r()*.5):1),m=rad+8;px=Math.min(RW-m,Math.max(m,px));py=Math.min(RH-m,Math.max(m,py));balls.push([px,py,rad]);
    ang+=(r()-.5)*2.4;const st=R0*(.8+r()*.5);px+=Math.cos(ang)*st;py+=Math.sin(ang)*st;}
  const lake=new Uint8Array(c.N);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const o=j*w+i;if(!inRug[o]||sdf[o]>-5)continue;const x=(i+.5)/G,y=(j+.5)/G;let F=0;
    for(const[bx,by,br]of balls){const dx=x-bx,dy=y-by;F+=br*br/(dx*dx+dy*dy+.01);}F*=1+(fbm(n1,x/8,y/8)-.5)*.8;if(F>1)lake[o]=1;}
  const dIn=distT(lake,w,h),notL=lake.map(v=>v?0:1),dOut=distT(notL,w,h);
  for(let o=0;o<c.N;o++){if(!inRug[o])continue;
    if(lake[o]){zone[o]=c.Z(waterBands(c,o,dIn[o]/G,P.water),"cut15","eau");H[o]=1.5;wet[o]=1;}
    else if(dOut[o]/G<1.3+fbm(c.n3,(o%w)/G/6,o/w/G/6)*.6){zone[o]=c.Z(P.foam[0],"cut15","rivage");H[o]=1.5;wet[o]=2;}}
  c.lakeDist={dIn,dOut};c.info.push(size<.12?"une petite source":"un étang");}
function eauRiviere(c,narrow){const {w,h,G,r,zone,H,inRug,wet,P}=c,ph=r()*6.28,x0=RW*(.3+.4*r()),A=6+r()*6;
  const xs=c.riverFn||(y=>x0+A*Math.sin(y/15+ph)+3*Math.sin(y/7+ph*2)),wr=narrow?2.2:3.4;
  for(let j=0;j<h;j++){const y=(j+.5)/G,xm=xs(y),sl=xs(y+.5)-xs(y-.5),cs=1/Math.sqrt(1+sl*sl);
    for(let i=0;i<w;i++){const o=j*w+i;if(!inRug[o])continue;const dr=Math.abs((i+.5)/G-xm)*cs;
      if(dr<wr){zone[o]=c.Z(dr<wr-1.2?P.water[2]:P.water[1],"cut15","eau");H[o]=1.5;wet[o]=1;}
      else if(dr<wr+1.1){zone[o]=c.Z(P.foam[0],"cut15","berge");H[o]=1.5;wet[o]=2;}}}
  c.river={xs,wr};c.info.push(narrow?"une cascade qui file":"une rivière");}
function vagues(c,mask,F,Gm){const {zone,H,wet,P}=c;let ramp=P.water.slice();if(c.q.cx==="explosif")ramp.splice(2,0,P.ana[0][0]);
  for(let o=0;o<c.N;o++){if(!mask[o])continue;const f=F[o],k=Math.floor(f),g=Gm[o],dl=(f-k)/g,du=(k+1-f)/g,role=((k%4)+4)%4;wet[o]=1;
    if(role===0&&dl<1.1){zone[o]=c.Z(P.foam[0],"loop3","écume");H[o]=3;continue;}
    const ref=ramp[triIdx(k,ramp.length)];
    if(role===1||role===3){zone[o]=c.Z(ref,"cut4","vague");H[o]=heightFor("cut4",Math.min(dl,du),.5,2.5,0);}else{zone[o]=c.Z(ref,role===2?"loop3":"cut15","vague");H[o]=role===2?3:1.5;}}}
function eauMer(c){const {w,h,G,r,n1,inRug,zone,H,wet,P}=c,side=Math.floor(r()*4),mask=new Uint8Array(c.N),beach=new Uint8Array(c.N);
  const u=(x,y)=>[x,RW-x,y,RH-y][side],t=(x,y)=>side<2?y:x;
  for(let o=0;o<c.N;o++){if(!inRug[o])continue;const x=(o%w+.5)/G,y=(Math.floor(o/w)+.5)/G,b=(side<2?20:26)+(fbm(n1,t(x,y)/18,3)-.5)*14,d=u(x,y);
    if(d<b)mask[o]=1;else if(d<b+2.4)beach[o]=1;}
  const {F,Gm}=bandField(c,4.6/Math.sqrt(c.dens),5,0,(x,y)=>u(x,y));vagues(c,mask,F,Gm);
  for(let o=0;o<c.N;o++)if(beach[o]){zone[o]=c.Z(P.sand[0],"cut15","plage");H[o]=1.5;wet[o]=2;}
  c.info.push("la mer sur un bord");}
function eauIle(c){const {w,h,G,r,n1,inRug,sdf,zone,H,wet,P}=c,R0=RW*.3,cx=RW*(.4+.2*r()),cy=RH*(.4+.2*r()),isl=new Uint8Array(c.N);
  for(let o=0;o<c.N;o++){if(!inRug[o])continue;const x=(o%w+.5)/G,y=(Math.floor(o/w)+.5)/G,a=Math.atan2(y-cy,x-cx);
    const rr=R0*(1+.14*Math.sin(3*a+1)+.08*Math.sin(5*a))*(1+(fbm(n1,x/10,y/10)-.5)*.5);if(Math.hypot(x-cx,(y-cy)*.8)<rr)isl[o]=1;}
  const out=isl.map((v,o)=>v||!inRug[o]?0:1),dO=distT(isl.map(v=>v?0:1),w,h),mask=new Uint8Array(c.N);
  for(let o=0;o<c.N;o++){if(!out[o])continue;const d=dO[o]/G;if(d<2.4){zone[o]=c.Z(P.sand[0],"cut15","plage");H[o]=1.5;wet[o]=2;}else mask[o]=1;}
  const Fd=new Float32Array(c.N);for(let o=0;o<c.N;o++)Fd[o]=dO[o]/G;
  const {F,Gm}=bandField(c,4.4,4,0,(x,y)=>{const o=c.at(x,y);return o<0?0:Fd[o];});vagues(c,mask,F,Gm);
  c.info.push("une île au milieu de l’eau");}

/* ---------- végétation ---------- */
function freeAt(c,x,y,rad){const o=c.at(x,y);if(o<0||!c.inRug[o]||c.sdf[o]>-(rad*.5))return false;
  for(const[dx,dy]of[[0,0],[rad,0],[-rad,0],[0,rad],[0,-rad]]){const q=c.at(x+dx,y+dy);if(q<0||c.wet[q])return false;}return true;}
const dryOk=c=>o=>!c.wet[o];
function mounds(c,{cover,rMin,rMax,weight,tech,base,core=true}){const {r,P}=c,placed=[];let got=0;const target=RW*RH*cover;
  for(let t=0;t<7000&&got<target;t++){const x=r()*RW,y=r()*RH,rad=rMin+r()*(rMax-rMin);if(!freeAt(c,x,y,rad+1))continue;
    if(weight&&r()>weight(x,y))continue;if(placed.some(m=>Math.hypot(m.x-x,m.y-y)<Math.max(m.r,rad)*.62))continue;
    const F=famFor(c,base||P.dom),near=placed.find(m=>Math.hypot(m.x-x,m.y-y)<m.r+rad+2),pool=F.filter(q=>!near||q!==near.ref),ref=(pool.length?pool:F)[Math.floor(r()*(pool.length||F.length))];
    const fi=F.indexOf(ref),m={x,y,r:rad,ref,tech:tech||techFor(c),core:core&&rad>4.2&&F.length>1&&r()<.7?F[fi>0?fi-1:fi+1]:null};placed.push(m);got+=Math.PI*rad*rad*.8;blob(c,m,dryOk(c));}
  return placed;}
function edgeW(c,x,y){const o=c.at(x,y);const e=o<0?0:Math.exp(-Math.max(0,-c.sdf[o])/8);let s=0;
  if(c.lakeDist&&o>=0)s=Math.exp(-(c.lakeDist.dOut[o]/c.G)/6);if(c.river)s=Math.max(s,Math.exp(-(Math.abs(x-c.river.xs(y))-c.river.wr)/6));return .2+.8*Math.max(e,s);}
function vegetation(c,v){const {r,P}=c,d=c.dens;let n=0;
  if(v==="foret"){n=mounds(c,{cover:.32*d,rMin:3.2,rMax:7,weight:(x,y)=>edgeW(c,x,y)}).length;c.info.push(`une forêt de ${n} touffes`);}
  else if(v==="mousse"){let sh=0;const sf=c.q.cx==="mono"?P.dom:c.q.cx==="explosif"?c.pick(P.pop):c.pick(P.ana);
    for(let t=0;t<300&&sh<1+Math.floor(r()*2);t++){const x=RW*(.15+.7*r()),y=RH*(.15+.7*r()),R=6+r()*4;if(!freeAt(c,x,y,R*.7))continue;blob(c,{x,y,r:R,ref:c.pick(sf),tech:"brush4",kind:"poils longs"},dryOk(c));sh++;}
    n=mounds(c,{cover:.18*d,rMin:3,rMax:6,weight:(x,y)=>edgeW(c,x,y)}).length;c.info.push(`${n} coussins de mousse${sh?` et ${sh} zone${sh>1?"s":""} à poils longs`:""}`);}
  else if(v==="prairie"){n=mounds(c,{cover:.11*d,rMin:1.6,rMax:2.8,tech:"loop3",base:P.ground.concat(P.dom.slice(0,2)),core:false}).length;c.info.push(`une prairie de ${n} touffes`);}
  else if(v==="clairiere"){const cx=RW*(.35+.3*r()),cy=RH*(.35+.3*r()),R=14+r()*6;
    n=mounds(c,{cover:.3*d,rMin:2.8,rMax:5.5,weight:(x,y)=>Math.exp(-Math.pow((Math.hypot(x-cx,y-cy)-R)/5,2))}).length;c.info.push(`une clairière entourée de ${n} touffes`);}
  else if(v==="arbre"){for(let t=0;t<300;t++){const x=RW*(.25+.5*r()),y=RH*(.25+.5*r()),R=8+r()*3;if(!freeAt(c,x,y,R+1))continue;
      const F=famFor(c,P.dom);blob(c,{x,y,r:R,ref:F[Math.min(F.length-1,2)],core:F[Math.min(F.length-1,1)],tech:"cut4"},dryOk(c));
      for(let k=0;k<9;k++){const a=r()*6.28,rr=R+2+r()*3,s=2+r()*2;if(freeAt(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr,s))blob(c,{x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr,r:s,ref:c.pick(F),tech:techFor(c)},o=>!c.wet[o]&&!c.busy[o]);}
      break;}
    mounds(c,{cover:.08*d,rMin:2.5,rMax:4,weight:(x,y)=>edgeW(c,x,y)});c.info.push("un grand arbre");}
  else if(v==="fleurs"){n=mounds(c,{cover:.12*d,rMin:2.6,rMax:4.5,weight:(x,y)=>edgeW(c,x,y)}).length;
    const fams=c.q.cx==="mono"?[P.dom.slice(0,3)]:c.q.cx==="explosif"?P.pop.concat(P.ana):P.ana;let k=0,cl=0;
    for(let t=0;t<400&&cl<Math.max(1,Math.round(3*d));t++){const cx=RW*(.12+.76*r()),cy=RH*(.1+.8*r());if(!freeAt(c,cx,cy,4))continue;
      const F=c.pick(fams),F2=c.q.cx==="explosif"?c.pick(fams):F,pts=[];
      for(let u=0;u<300&&pts.length<14+Math.floor(r()*12);u++){const a=r()*6.28,dd=Math.sqrt(r())*(4+r()*3),x=cx+Math.cos(a)*dd,y=cy+Math.sin(a)*dd,s2=1.1+r()*.7;
        if(!freeAt(c,x,y,s2+.3)||pts.some(q=>Math.hypot(q[0]-x,q[1]-y)<q[2]+s2+.05))continue;pts.push([x,y,s2]);
        blob(c,{x,y,r:s2,ref:c.pick(r()<.7?F:F2),tech:"pompon",kind:"pompon",flat:3.5},o=>!c.wet[o]);k++;}
      cl++;}
    c.info.push(`${cl} grappes de ${k} pompons et ${n} touffes`);}}

/* ---------- pierre ---------- */
function stone(c,S){const {w,h,G,zone,H,inRug,busy,n2}=c,b=Math.ceil(Math.max(S.rx,S.ry)*G)+2,ca=Math.cos(S.a),sa=Math.sin(S.a),z=c.Z(S.ref,S.tech,"pierre");
  for(let y=Math.max(0,Math.floor(S.y*G-b));y<Math.min(h,S.y*G+b);y++)for(let x=Math.max(0,Math.floor(S.x*G-b));x<Math.min(w,S.x*G+b);x++){const o=y*w+x;if(!inRug[o]||c.wet[o])continue;
    const dx=x/G-S.x,dy=y/G-S.y,lx=dx*ca+dy*sa,ly=-dx*sa+dy*ca,mr=Math.min(S.rx,S.ry),d=(Math.hypot(lx/S.rx,ly/S.ry)-1)*mr+(fbm(n2,x/G/3,y/G/3)-.5)*.8;
    if(d<0){zone[o]=z;H[o]=heightFor(S.tech,-d,1-Math.min(1,-d/mr),mr,0);busy[o]=1;}}}
function pierre(c,m){const {r,P}=c,d=c.dens,list=[];
  const place=(n,rMin,rMax,gap,cl)=>{for(let t=0;t<5000&&list.length<n;t++){let x,y;if(cl){const a=r()*6.28,dd=r()*cl.s;x=cl.x+Math.cos(a)*dd;y=cl.y+Math.sin(a)*dd;}else{x=r()*RW;y=r()*RH;}
    const rx=rMin+r()*(rMax-rMin),ry=rx*(.65+r()*.3);if(!freeAt(c,x,y,rx+1.2))continue;const o=c.at(x,y);if(c.busy[o])continue;
    if(list.some(S=>Math.hypot(S.x-x,S.y-y)<S.rx+rx+gap))continue;const F=famFor(c,P.stone);
    const S={x,y,rx,ry,a:r()*3.14,ref:c.pick(F),tech:r()<.25?"loop3":"cut4"};list.push(S);stone(c,S);}};
  if(m==="galets"){const k=2+Math.floor(r()*3);for(let i=0;i<k;i++){const cl={x:RW*(.15+.7*r()),y:RH*(.15+.7*r()),s:7};const n0=list.length;place(n0+Math.round((4+r()*5)*d),1.4,3,1.1,cl);}c.info.push(`${list.length} galets en petits groupes`);}
  else if(m==="rochers"){place(Math.round(4*d)+1,4,8,2);c.info.push(`${list.length} rochers`);}
  else if(m==="falaise"){const {w,h,G,zone,H,inRug,n1,n2}=c,side=r()<.5?0:1,s=6,grid=[],stones=famFor(c,P.stone);
    for(let gy=0;gy<RH/s+2;gy++)for(let gx=0;gx<4;gx++)grid.push({x:(side?RW-gx*s:gx*s)+(r()-.5)*s*.7,y:gy*s+(r()-.5)*s*.7,ref:c.pick(stones)});
    for(let o=0;o<c.N;o++){if(!inRug[o]||c.wet[o])continue;const x=(o%w+.5)/G,y=(Math.floor(o/w)+.5)/G,dd=side?RW-x:x,bw=9+(fbm(n1,3,y/14)-.5)*8;if(dd>bw)continue;
      let d1=1e9,d2=1e9,b=null;for(const q of grid){const e=Math.hypot(x-q.x,y-q.y);if(e<d1){d2=d1;d1=e;b=q;}else if(e<d2)d2=e;}
      zone[o]=c.Z(b.ref,"cut4","falaise");H[o]=heightFor("cut4",Math.min((d2-d1)/2,bw-dd),.5,3,fbm(n2,x/2,y/2)*.4);c.busy[o]=1;}
    c.info.push("une falaise sur un côté");}}

/* ---------- ciel ---------- */
function ciel(c,s){const {w,h,G,r,n1,n2,zone,H,inRug,P}=c;
  const overOk=o=>inRug[o]&&!c.wet[o];
  if(s==="soleil"||s==="lune"){const R=s==="soleil"?7+r()*3:9+r()*3;let mx,my;
    for(let t=0;t<200;t++){mx=RW*(.25+.5*r());my=RH*(.12+.25*r());if(freeAt(c,mx,my,R*.6))break;}
    const ref=c.q.cx==="explosif"?c.pick(P.pop)[0]:P.disc[0],halo=P.ground[0],ma=r()*6.28,off=R*.42,R2=R*.88,cx2=mx+Math.cos(ma)*off,cy2=my+Math.sin(ma)*off,b=Math.ceil((R+4)*G);
    for(let y=Math.max(0,Math.floor(my*G-b));y<Math.min(h,my*G+b);y++)for(let x=Math.max(0,Math.floor(mx*G-b));x<Math.min(w,mx*G+b);x++){const o=y*w+x;if(!overOk(o))continue;
      const X=x/G,Yy=y/G,d=Math.hypot(X-mx,Yy-my);
      if(s==="soleil"){if(d<R){zone[o]=c.Z(ref,"cut4","soleil");H[o]=heightFor("cut4",R-d,d/R,R*.5,fbm(n2,X/2,Yy/2)*.3);c.busy[o]=1;}
        else if(d>R+1.1&&d<R+2.2){zone[o]=c.Z(ref,"loop3","halo");H[o]=3;c.busy[o]=1;}}
      else{if(d>=R)continue;const d2=Math.hypot(X-cx2,Yy-cy2);if(d2<=R2||(R-d)+(d2-R2)<1.4)continue;zone[o]=c.Z(ref,"cut4","lune");H[o]=heightFor("cut4",Math.min(R-d,d2-R2),d/R,R*.5,0);c.busy[o]=1;}}
    c.info.push(s==="soleil"?"un soleil levant":"un croissant de lune");}
  else if(s==="etoiles"){let k=0;const n=Math.round(18*c.dens);
    for(let t=0;t<4000&&k<n;t++){const x=r()*RW,y=r()*RH*.7,big=r()<.25,sz=big?1.8+r()*1:.65;if(!freeAt(c,x,y,sz+1))continue;const o=c.at(x,y);if(c.busy[o])continue;
      blob(c,{x,y,r:sz,ref:P.star[0],tech:"loop3",kind:"étoile",flat:3},q=>overOk(q)&&!c.busy[q]);k++;}c.info.push(`${k} petites étoiles`);}
  else if(s==="brume"||s==="nuages"){const light=s==="brume"?P.dom[0]:(P.sand[0]||P.foam[0]);let k=0;
    if(s==="brume"){for(let o=0;o<c.N;o++){if(!overOk(o)||c.busy[o]||!["sol","anneau","strate"].includes(c.kind(o)))continue;const x=(o%w)/G,y=Math.floor(o/w)/G;if(fbm(n1,x/16+50,y/9)>.66&&y<RH*.6){zone[o]=c.Z(light,"brush4","brume");H[o]=3.4;k++;}}c.info.push("une brume légère");}
    else{for(let i=0;i<Math.round(3*c.dens)+1;i++){const cx=RW*(.15+.7*r()),cy=RH*(.08+.4*r());for(let q=0;q<5;q++){const x=cx+(q-2)*3.2,y=cy+(r()-.5)*2,s2=2.4+r()*1.4;
      if(freeAt(c,x,y,1))blob(c,{x,y,r:s2,ref:light,tech:"brush4",kind:"nuage"},q2=>overOk(q2));}}c.info.push("quelques nuages");}}}

/* ---------- chemin ---------- */
function chemin(c){const {r,P}=c,ph=r()*6.28,x0=RW*(.3+.4*r()),xs=y=>x0+10*Math.sin(y/18+ph)+4*Math.sin(y/9);let k=0;
  for(let y=RH-2;y>2;y-=2.6){const x=xs(y);if(!freeAt(c,x,y,1.4))continue;const o=c.at(x,y);if(c.busy[o])continue;
    blob(c,{x,y,r:.8,ref:P.sand[0],tech:"loop3",kind:"sentier",flat:3},q=>!c.wet[q]&&!c.busy[q]);k++;}
  c.info.push("un sentier en pointillés");}

/* ---------- nettoyage : aucun morceau de moins de 1 cm² ---------- */
function clean(c){const {w,h,zone,inRug}=c,lab=new Int32Array(c.N).fill(-1),minA=Math.max(4,Math.round(1.2*c.G*c.G)),stack=[];
  for(let s=0;s<c.N;s++){if(lab[s]>=0||!inRug[s])continue;const z=zone[s],cells=[];stack.push(s);lab[s]=s;
    while(stack.length){const o=stack.pop();cells.push(o);const i=o%w;for(const q of[i>0?o-1:-1,i<w-1?o+1:-1,o-w,o+w]){if(q<0||q>=c.N||lab[q]>=0||!inRug[q]||zone[q]!==z)continue;lab[q]=s;stack.push(q);}}
    if(cells.length<minA){const cnt=new Map();for(const o of cells){const i=o%w;for(const q of[i>0?o-1:-1,i<w-1?o+1:-1,o-w,o+w]){if(q<0||q>=c.N||!inRug[q]||zone[q]===z)continue;cnt.set(zone[q],(cnt.get(zone[q])||0)+1);}}
      let best=0,bn=0;cnt.forEach((n,k)=>{if(n>bn){bn=n;best=k;}});if(best)for(const o of cells){zone[o]=best;}}}}

/* ---------- ambiances : une composition claire par thème ---------- */
const NEB={printemps:["806C","597","300"],ete:["502","517","597"],automne:["502","2A11","423"],hiver:["585","597","3B15"]};
const THEMES={epure:"Épuré",mer:"Mer et plage",foret:"Forêt luxuriante",ciel:"Ciel et espace",montagne:"Montagne",lave:"Lave",desert:"Désert et canyon",jardin:"Jardin fleuri"};
function groundCalm(c,refs,kind){const {w,h,G,n1,zone,H,inRug}=c;
  for(let o=0;o<c.N;o++){if(!inRug[o]||zone[o])continue;const x=(o%w)/G,y=Math.floor(o/w)/G;zone[o]=c.Z(fbm(n1,x/18+31,y/18+7)>.58&&refs[1]?refs[1]:refs[0],"cut15",kind||"sol");H[o]=1.5;}}
/* points forts de composition (règle des tiers), choisis au hasard */
function strongPoint(c){const r=c.r;return[RW*(r()<.5?.36:.64)+(r()-.5)*4,RH*(r()<.5?.36:.64)+(r()-.5)*5];}
/* un sentier continu d'un bord à l'autre ; les autres éléments le contournent */
function sentier(c){const {w,h,G,r,zone,H,inRug,wet,P}=c,vert=r()<.6,L=vert?RH:RW,S=vert?RW:RH,x0=S*(.32+.36*r()),A=S*(.1+.08*r()),ph=r()*6.28,ph2=r()*6.28;
  const xs=t=>x0+A*Math.sin(t/(L*.32)+ph)+3*Math.sin(t/9+ph2),core=1.3,edge=1.05;
  for(let o=0;o<c.N;o++){if(!inRug[o]||wet[o]===1)continue;const x=(o%w+.5)/G,y=(Math.floor(o/w)+.5)/G,t=vert?y:x,s=vert?x:y;
    const sl=xs(t+.5)-xs(t-.5),d=Math.abs(s-xs(t))/Math.sqrt(1+sl*sl);
    if(d<core){zone[o]=c.Z(P.sand[0],"cut15","sentier");H[o]=1.5;wet[o]=2;}else if(d<core+edge){zone[o]=c.Z(P.sand[1]||P.sand[0],"loop3","bord du sentier");H[o]=3;wet[o]=2;}}
  c.info.push("un sentier qui traverse tout le tapis");}
function anneauxAutour(c,fx,fy,R,n,gap){const {w,G,zone,H,inRug}=c;
  for(let o=0;o<c.N;o++){if(!inRug[o]||c.kind(o)!=="sol")continue;const x=(o%w+.5)/G,y=(Math.floor(o/w)+.5)/G,d=Math.hypot(x-fx,y-fy)-R+(fbm(c.n2,x/9,y/9)-.5)*1.4;
    if(d>1.2&&d<1.2+gap*n&&((d-1.2)%gap)<1){zone[o]=c.Z(c.zones[zone[o]].ref,"loop3","sol");H[o]=3;}}}
function disque(c,kind,fx,fy,R,overWet){const {w,h,G,r,zone,H,inRug,P}=c,ref=kind==="lune"?P.disc[0]:kind==="soleil"?(c.q.cx==="mono"?P.disc[0]:P.lava[P.lava.length-1]):P.disc[0];
  const ma=r()*6.28,off=R*.42,R2=R*.88,cx2=fx+Math.cos(ma)*off,cy2=fy+Math.sin(ma)*off,b=Math.ceil((R+3)*G);
  for(let y=Math.max(0,Math.floor(fy*G-b));y<Math.min(h,fy*G+b);y++)for(let x=Math.max(0,Math.floor(fx*G-b));x<Math.min(w,fx*G+b);x++){const o=y*w+x;if(!inRug[o]||(c.wet[o]&&!overWet))continue;
    const X=x/G,Yy=y/G,d=Math.hypot(X-fx,Yy-fy);if(d>=R)continue;let ins=R-d;
    if(kind==="lune"){const d2=Math.hypot(X-cx2,Yy-cy2);if(d2<=R2||(R-d)+(d2-R2)<1.4)continue;ins=Math.min(ins,d2-R2);}
    zone[o]=c.Z(ref,"cut4",kind);H[o]=heightFor("cut4",ins,d/R,R*.5,fbm(c.n2,X/2,Yy/2)*.3);c.busy[o]=1;}
  c.info.push(kind==="lune"?"un croissant de lune":kind==="soleil"?"un soleil":"une planète");}
/* massifs : une grosse touffe, une couronne de touffes plus petites et plus claires, une seule famille de couleur ; du calme entre les massifs */
function massifs(c,{n,rBig,fams,gap=6,kind="bosquet",near}){const {r}=c,list=[];
  for(let t=0;t<600&&list.length<n;t++){let x,y;
    if(near&&near.length&&r()<.7){const m=c.pick(near),a=r()*6.28,dd=m.R+rBig*1.6+gap*.5;x=m.x+Math.cos(a)*dd;y=m.y+Math.sin(a)*dd;}else{x=RW*(.12+.76*r());y=RH*(.1+.8*r());}
    const R=rBig*(.8+.4*r());if(!freeAt(c,x,y,R*.8)||c.busy[c.at(x,y)])continue;
    if(list.concat(near||[]).some(m=>Math.hypot(m.x-x,m.y-y)<m.R*1.6+R*1.6+gap))continue;
    const F=fams[list.length%fams.length],di=Math.min(F.length-1,Math.max(1,Math.floor(F.length*.6))),dark=F[di];
    blob(c,{x,y,r:R,ref:dark,core:F[di-1],tech:"cut4",kind},dryOk(c));
    const k=4+Math.floor(r()*4),a0=r()*6.28;
    for(let i=0;i<k;i++){const a=a0+i*6.28/k+(r()-.5)*.5,s2=R*(.38+r()*.2),dd=R+s2*.55,x2=x+Math.cos(a)*dd,y2=y+Math.sin(a)*dd;
      if(!freeAt(c,x2,y2,s2*.7))continue;blob(c,{x:x2,y:y2,r:s2,ref:F[Math.max(0,di-1-Math.floor(r()*2))],tech:techFor(c),kind},o=>!c.wet[o]&&!c.busy[o]);
      if(r()<.55){const s3=1.4+r()*.8,d3=dd+s2+s3*.6,x3=x+Math.cos(a)*d3,y3=y+Math.sin(a)*d3;if(freeAt(c,x3,y3,s3))blob(c,{x:x3,y:y3,r:s3,ref:F[0],tech:"loop3",kind},o=>!c.wet[o]&&!c.busy[o]);}}
    list.push({x,y,R});}
  return list;}
function famsFor(c){const P=c.P,two=f=>f.length>1?f:f.concat(P.dom.slice(0,1));
  if(c.q.cx==="mono")return[P.dom];if(c.q.cx==="explosif")return[P.dom].concat(P.pop.map(two)).slice(0,4);return[P.dom,P.dom,two(P.ana[0])];}
function grappes(c,n,fams){const {r}=c;let k=0,cl=0;
  for(let t=0;t<500&&cl<n;t++){let cx=RW*(.12+.76*r()),cy=RH*(.1+.8*r());if(c.anchors&&c.anchors.length&&t<300){const m=c.pick(c.anchors),a=r()*6.28;cx=m.x+Math.cos(a)*(m.R*1.8+6);cy=m.y+Math.sin(a)*(m.R*1.8+6);}if(!freeAt(c,cx,cy,4)||c.busy[c.at(cx,cy)])continue;
    const F=c.pick(fams),pts=[];
    for(let u=0;u<300&&pts.length<14+Math.floor(r()*12);u++){const a=r()*6.28,dd=Math.sqrt(r())*(4+r()*3),x=cx+Math.cos(a)*dd,y=cy+Math.sin(a)*dd,s2=1.1+r()*.7;
      if(!freeAt(c,x,y,s2+.3)||pts.some(q=>Math.hypot(q[0]-x,q[1]-y)<q[2]+s2+.05))continue;pts.push([x,y,s2]);
      blob(c,{x,y,r:s2,ref:c.pick(F),tech:"pompon",kind:"pompon"},o=>!c.wet[o]);k++;}
    cl++;}
  if(cl)c.info.push(`${cl} grappe${cl>1?"s":""} de pompons`);}
function poilsLongs(c,n,fam){const {r}=c;let sh=0;
  for(let t=0;t<300&&sh<n;t++){const x=RW*(.15+.7*r()),y=RH*(.15+.7*r()),R=6+r()*4;if(!freeAt(c,x,y,R*.7))continue;blob(c,{x,y,r:R,ref:c.pick(fam),tech:"brush4",kind:"poils longs"},dryOk(c));sh++;}
  if(sh)c.info.push(`${sh} zone${sh>1?"s":""} à poils longs`);}
function eauDouce(c,eau){if(eau==="lac")eauEtang(c,.15);else if(eau==="source")eauEtang(c,.09);else if(eau==="riviere"||eau==="cascade")eauRiviere(c,eau==="cascade");}

function themeEpure(c){const {P,r}=c,L=c.q.layers||{},tend=c.q.tendance||"foret";
  const refs=tend==="mer"?[P.sand[0],P.sand[1]]:tend==="ciel"?[P.night[0],P.night[0]]:[P.ground[0],P.ground[0]];
  const [fx,fy]=strongPoint(c),sig=c.q.signature;let R=7;
  if(sig==="lune"||sig==="soleil"||(!sig&&tend==="ciel")){R=8+r()*3;disque(c,sig||"lune",fx,fy,R);}
  else if(sig==="rochers"||sig==="falaise"||(!sig&&tend==="montagne")){const S={x:fx,y:fy,rx:6+r()*2,ry:4.5+r()*1.5,a:r()*3.14,ref:P.stone[1]||P.stone[0],tech:"cut4"};stone(c,S);R=S.rx;
    if(r()<.6){const S2={x:fx+S.rx+4,y:fy+3,rx:2.6,ry:2,a:r()*3,ref:P.stone[2]||P.stone[0],tech:"cut4"};stone(c,S2);}c.info.push("un galet seul");}
  else if(tend==="mer"||L.eau==="lac"||L.eau==="source"){eauEtang(c,.1);R=0;}
  else{const F=P.dom;blob(c,{x:fx,y:fy,r:6,ref:F[Math.min(2,F.length-1)],core:F[1],tech:"cut4"});for(let k=0;k<3;k++){const a=r()*6.28;blob(c,{x:fx+Math.cos(a)*7.5,y:fy+Math.sin(a)*7.5,r:2.4+r()*1.2,ref:c.pick(F),tech:techFor(c)},o=>!c.busy[o]);}R=9;c.info.push("une touffe de mousse seule");}
  groundCalm(c,refs);if(R)anneauxAutour(c,fx,fy,R,4,2.6);if(sig==="sentier")c.info.push("(sentier omis : version épurée)");
  c.info.unshift("épuré : un seul élément et beaucoup de calme");}
function themeMer(c){const {w,h,G,r,n1,zone,H,inRug,wet,P}=c,a=(Math.floor(r()*4)*Math.PI/2)+(r()-.5)*.8,nx=Math.cos(a),ny=Math.sin(a);
  let umin=1e9,umax=-1e9;for(const[x,y]of[[0,0],[RW,0],[0,RH],[RW,RH]]){const u=x*nx+y*ny;umin=Math.min(umin,u);umax=Math.max(umax,u);}
  const s0=umin+(umax-umin)*(.38+.17*r()),bw=4.8/Math.sqrt(c.dens),sea=P.water,dry=P.sand[0],wetS=P.sand[1]||P.sand[0];
  for(let o=0;o<c.N;o++){if(!inRug[o])continue;const x=(o%w+.5)/G,y=(Math.floor(o/w)+.5)/G,u=x*nx+y*ny,t=-x*ny+y*nx,s=s0+(fbm(n1,t/16,3)-.5)*12,d=u-s;
    if(d>0){const f=Math.max(0,d/bw+(fbm(c.n2,x/20,y/20)-.5)*1.4*Math.min(1,d/4)),k=Math.floor(f),dl=(f-k)*bw;wet[o]=1;
      if(k%3===0&&dl<1.1&&k<6){zone[o]=c.Z(P.foam[0],"loop3","écume");H[o]=3;continue;}
      const ref=sea[Math.max(0,Math.min(sea.length-1,Math.floor(f/1.6)))];const t2=k%3===1?"cut4":"cut15";zone[o]=c.Z(ref,t2,"mer");H[o]=t2==="cut4"?heightFor("cut4",Math.min(dl,bw-dl),.5,2.5,0):1.5;}
    else if(d>-2.6){zone[o]=c.Z(wetS,"cut15","sable mouillé");H[o]=1.5;wet[o]=2;}
    else{const dd=-d-2.6+(fbm(c.n3,t/9,1)-.5)*2.5,rip=c.dens>=1&&dd>2&&dd<20&&dd%6<1;zone[o]=c.Z(dry,rip?"loop3":"cut15","sable");H[o]=rip?3:1.5;}}
  c.info.push("une plage et la mer qui fonce vers le large");
  const sig=c.q.signature;
  if(c.q.layers&&c.q.layers.mineral==="galets"){let k=0;for(let t=0;t<2000&&k<Math.round(7*c.dens);t++){const x=r()*RW,y=r()*RH,rx=1.4+r()*1.6;if(!freeAt(c,x,y,rx+1.2)||c.kind(c.at(x,y))!=="sable")continue;stone(c,{x,y,rx,ry:rx*.75,a:r()*3,ref:c.pick(P.stone),tech:"cut4"});k++;}c.info.push(`${k} galets sur le sable`);}
  if(sig==="rochers"){let k=0;for(let t=0;t<2000&&k<3;t++){const x=r()*RW,y=r()*RH,rx=4+r()*3;if(!freeAt(c,x,y,rx+1.5)||c.kind(c.at(x,y))!=="sable")continue;stone(c,{x,y,rx,ry:rx*.7,a:r()*3,ref:c.pick(P.stone),tech:"cut4"});k++;}c.info.push(`${k} rochers sur la plage`);}
  else if(sig==="soleil"){for(let t=0;t<300;t++){const x=RW*(.2+.6*r()),y=RH*(.15+.7*r()),o=c.at(x,y);if(o>=0&&c.kind(o)==="mer"&&freeAt2(c,x,y,10)){disque(c,"soleil",x,y,7+r()*2,true);break;}}}
}
function freeAt2(c,x,y,R){for(const[dx,dy]of[[R,0],[-R,0],[0,R],[0,-R]]){const o=c.at(x+dx,y+dy);if(o<0||!c.inRug[o]||c.kind(o)!=="mer")return false;}return true;}
function themeForet(c){const {P,r}=c,L=c.q.layers||{},d=c.dens;
  groundCalm(c,[P.dom[P.dom.length-1],P.dom[P.dom.length-2]||P.dom[0]],"sous-bois");
  if(c.q.signature==="sentier")sentier(c);eauDouce(c,L.eau);
  const sh=c.q.cx==="mono"?P.dom:c.q.cx==="explosif"?c.pick(P.pop):c.pick(P.ana);poilsLongs(c,1+Math.floor(r()*2),sh);
  const ms=c.anchors=massifs(c,{n:Math.round(3+2.5*d),rBig:6.5,fams:famsFor(c),gap:1.5,kind:"bosquet"});
  mounds(c,{cover:.12*d,rMin:2.2,rMax:4.2,weight:(x,y)=>edgeW(c,x,y)});c.info.push(`${ms.length} bosquets denses`);
  grappes(c,c.q.cx==="explosif"?3:c.q.cx==="mono"?1:2,c.q.cx==="mono"?[P.dom.slice(0,3)]:c.q.cx==="explosif"?P.pop:P.ana);
  if(c.q.signature==="soleil"||c.q.signature==="lune"){const [fx,fy]=strongPoint(c);disque(c,c.q.signature,fx,fy,6);}
  c.info.unshift("forêt luxuriante");}
function themeJardin(c){const {P,r}=c,L=c.q.layers||{},d=c.dens;
  groundCalm(c,[P.ground[0],P.ground[1]||P.ground[0]]);if(c.q.signature==="sentier")sentier(c);eauDouce(c,L.eau);
  const ms=c.anchors=massifs(c,{n:Math.round(1+1.5*d),rBig:5,fams:[P.dom],gap:9,kind:"massif"});c.info.push(`${ms.length} massif${ms.length>1?"s":""} de verdure`);
  mounds(c,{cover:.04*d,rMin:1.5,rMax:2.3,tech:"loop3",base:P.ground.concat(P.dom.slice(0,2)),core:false});
  grappes(c,Math.max(2,Math.round(3*d)),c.q.cx==="mono"?[P.dom.slice(0,3)]:c.q.cx==="explosif"?P.pop.concat(P.ana):P.ana);
  if(c.q.signature==="rochers")pierre(c,"rochers");else if(c.q.signature==="soleil"||c.q.signature==="lune"){const [fx,fy]=strongPoint(c);disque(c,c.q.signature,fx,fy,6.5);}
  c.info.unshift("jardin fleuri");}
function themeCiel(c){const {w,h,G,r,n1,n2,zone,H,inRug,P}=c,neb=(c.q.cx==="mono"?P.water.slice(1):NEB[c.q.season]||NEB.hiver).filter(q=>Y[q]);
  const ph=r()*6.28,ang=(r()-.5)*1.2,ca=Math.cos(ang),sa=Math.sin(ang),y0=RH*(.45+.25*r());
  for(let o=0;o<c.N;o++){if(!inRug[o])continue;const x=(o%w+.5)/G,y=(Math.floor(o/w)+.5)/G,u=x*ca+y*sa,v=-x*sa+y*ca;
    const dv=v-(y0+7*Math.sin(u/17+ph))+(fbm(n1,x/14,y/14)-.5)*9,width=6+4*fbm(n2,u/20,1);
    if(Math.abs(dv)<width){const t=Math.abs(dv)/width,lvl=t<.33?2:t<.66?1:0;zone[o]=c.Z(neb[Math.min(lvl,neb.length-1)],lvl===2?"brush4":lvl===1?"loop3":"cut15","nébuleuse");H[o]=lvl===2?3.6:lvl===1?3:1.5;}
    else{zone[o]=c.Z(fbm(c.n3,x/20+7,y/20)>.6?P.night[1]||P.night[0]:P.night[0],"cut15","ciel");H[o]=1.5;}}
  const sig=c.q.signature==="soleil"?"soleil":"lune";let fx,fy;for(let t=0;t<200;t++){[fx,fy]=strongPoint(c);const o=c.at(fx,fy);if(o>=0&&c.kind(o)==="ciel")break;}
  disque(c,sig,fx,fy,9+r()*3);
  let k=0;const n=c.q.signature==="etoiles"?28:Math.round(12*c.dens);
  for(let t=0;t<4000&&k<n;t++){const x=r()*RW,y=r()*RH,big=r()<.2,sz=big?1.6+r()*.8:.65;if(!freeAt(c,x,y,sz+1))continue;const o=c.at(x,y);if(c.busy[o]||c.kind(o)!=="ciel")continue;
    blob(c,{x,y,r:sz,ref:P.star[0],tech:"loop3",kind:"étoile",flat:3},q=>!c.busy[q]);k++;}
  c.info.unshift("ciel et espace");c.info.push(`une nébuleuse, ${k} étoiles`);}
function themeMontagne(c){const L=c.q.layers||{};baseMontagne(c);if(L.eau==="riviere"||L.eau==="cascade")eauRiviere(c,L.eau==="cascade");else if(L.eau==="lac")eauEtang(c,.11);
  if(c.q.signature==="sentier")sentier(c);else if(c.q.signature==="soleil"||c.q.signature==="lune"){const [fx,fy]=strongPoint(c);disque(c,c.q.signature,fx,fy,6.5);}}
function themeLave(c){baseLave(c);}
function themeDesert(c){const L=c.q.layers||{},riv=L.eau==="riviere"||L.eau==="cascade"||L.eau==="lac";let xs=null;
  if(riv){const ph=c.r()*6.28,x0=RW*(.3+.4*c.r()),A=6+c.r()*6;xs=y=>x0+A*Math.sin(y/15+ph)+3*Math.sin(y/7+ph*2);c.riverFn=xs;}
  c.q.layers=Object.assign({},L,{relief:L.relief==="vallee"?"vallee":"dunes"});baseStrates(c,xs);
  if(xs){eauRiviere(c,L.eau==="cascade");mounds(c,{cover:.07,rMin:2.2,rMax:4.2,weight:(x,y)=>Math.exp(-Math.pow((Math.abs(x-xs(y))-6)/3,2))});}
  if(c.q.signature==="soleil"){let fx,fy;for(let t=0;t<200;t++){[fx,fy]=strongPoint(c);if(t>150)fx=c.r()*RW,fy=c.r()*RH;if(freeAt(c,fx,fy,8))break;}disque(c,"soleil",fx,fy,7);}else if(c.q.signature==="rochers")pierre(c,"rochers");else if(c.q.signature==="sentier"&&!xs)sentier(c);}

/* végétation et matières : au plus 4 (ton sur ton), 6 (nuancé) ou 10 (explosif) laines, en plus de celles de l'eau, du sable et du ciel ;
   les moins présentes prennent la couleur gardée la plus proche */
function capYarns(c){const cap={mono:5,nuance:8,explosif:12}[c.q.cx]||8,area=new Map();
  for(let o=0;o<c.N;o++){const z=c.zone[o];if(!z)continue;const ref=c.zones[z].ref;area.set(ref,(area.get(ref)||0)+1);}
  if(area.size<=cap)return;
  const prot=new Set(["eau","mer","écume","rivage","berge","sable","sable mouillé","sentier","bord du sentier","lune","soleil","nébuleuse","ciel","plage"]);
  const forced=[...new Set(c.zones.filter(z=>z&&prot.has(z.kind)&&area.has(z.ref)).map(z=>z.ref))];
  const capNP={mono:4,nuance:6,explosif:10}[c.q.cx]||6,keep=forced.concat([...area.entries()].sort((a,b)=>b[1]-a[1]).map(e=>e[0]).filter(r=>!forced.includes(r)).slice(0,capNP));
  const npRefs=new Set(c.zones.filter(z=>z&&!prot.has(z.kind)).map(z=>z.ref)),keepNP=keep.filter(k=>npRefs.has(k));
  const nearIn=(ref,pool)=>{const a=Y[ref].rgb;let best=pool[0],bd=1e9;for(const k of pool){const b=Y[k].rgb,d=(a[0]-b[0])**2*.3+(a[1]-b[1])**2*.59+(a[2]-b[2])**2*.11;if(d<bd){bd=d;best=k;}}return best;};
  for(const zz of c.zones){if(zz&&!keep.includes(zz.ref))zz.ref=nearIn(zz.ref,!prot.has(zz.kind)&&keepNP.length?keepNP:keep);}}

/* ---------- assemblage ---------- */
function generate(q,G){
  if(q.theme&&THEMES[q.theme]){const c=ctx(q,G);
    ({epure:themeEpure,mer:themeMer,foret:themeForet,ciel:themeCiel,montagne:themeMontagne,lave:themeLave,desert:themeDesert,jardin:themeJardin})[q.theme](c);
    clean(c);capYarns(c);for(let o=0;o<c.N;o++)if(!c.inRug[o])c.zone[o]=0;
    return {w:c.w,h:c.h,G,zone:c.zone,H:c.H,zones:c.zones,info:c.info,theme:q.theme};}
  const c=ctx(q,G),L=q.layers||{},rel=L.relief||"doux";
  const riverWanted=L.eau==="riviere"||L.eau==="cascade";
  if(rel==="plat")basePlaine(c);else if(rel==="marque")baseMontagne(c);else if(rel==="volcan")baseLave(c);
  else if(rel==="dunes"||rel==="vallee"){let xs=null;if(riverWanted){const ph=c.r()*6.28,x0=RW*(.3+.4*c.r()),A=6+c.r()*6;xs=y=>x0+A*Math.sin(y/15+ph)+3*Math.sin(y/7+ph*2);}baseStrates(c,xs);
    if(xs){c.riverFn=xs;}}
  else baseAnneaux(c);
  if(L.eau==="lac")eauEtang(c,.16);else if(L.eau==="source")eauEtang(c,.09);else if(riverWanted){eauRiviere(c,L.eau==="cascade");if(c.riverFn){/* rivière posée sur les strates */}}
  else if(L.eau==="mer")eauMer(c);else if(L.eau==="ile")eauIle(c);
  // matières (plusieurs possibles) : végétation, petits galets, brume
  if(L.mineral==="galets")pierre(c,"galets");
  if(L.vegetation&&L.vegetation!=="aucune")vegetation(c,L.vegetation);
  if(L.ciel==="brume")ciel(c,"brume");
  // un seul élément signature : celui que les réponses portent le plus
  const sig=(q.signature||["sentier","soleil","lune","etoiles","nuages","rochers","falaise"].filter(k=>L.chemin===k||L.ciel===k||L.mineral===k)[0])||null;
  if(sig==="sentier")chemin(c);else if(sig==="rochers"||sig==="falaise")pierre(c,sig);else if(sig)ciel(c,sig);
  c.signature=sig;
  clean(c);for(let o=0;o<c.N;o++)if(!c.inRug[o])c.zone[o]=0;
  return {w:c.w,h:c.h,G,zone:c.zone,H:c.H,zones:c.zones,info:c.info,signature:c.signature};}

/* ---------- rendu ---------- */
const fineN=makeNoise(rng("fibres")),fineM=makeNoise(rng("chiné"));
function render(cv,g,view,floorHex){const {w,h,G,zone,H,zones}=g;cv.width=w;cv.height=h;const x=cv.getContext("2d"),img=x.createImageData(w,h),D=img.data;
  const fl=(floorHex||"#E4DED3").replace("#",""),floor=[0,2,4].map(i=>parseInt(fl.slice(i,i+2),16));
  if(view==="atelier"){const Hin=H.map((v,o)=>zone[o]?v:1.5),Hc=blur(Hin,w,h,Math.max(1,Math.round(.45*G))),lv=v=>Math.floor((v-1.5)/.5+1e-6),mj=v=>Math.floor(v+1e-6),cand=[];
    for(let o=0;o<w*h;o++){const z=zone[o],k=o*4,i=o%w;let col=z?Y[zones[z].ref].rgb:floor;
      if(z){const r1=i<w-1?o+1:o,d1=o+w<w*h?o+w:o,edge=(zone[r1]!==z&&zone[r1])||(zone[d1]!==z&&zone[d1]);
        const iso=zone[r1]&&zone[d1]&&(lv(Hc[o])!==lv(Hc[r1])||lv(Hc[o])!==lv(Hc[d1])),maj=iso&&(mj(Hc[o])!==mj(Hc[r1])||mj(Hc[o])!==mj(Hc[d1]));
        if(edge)col=[30,30,30];else if(iso){const a=maj?.75:.28,ink=[92,52,24];col=col.map((v,q)=>v*(1-a)+ink[q]*a);
          if(maj&&G>=4&&!(i%3)&&!(Math.floor(o/w)%3))cand.push([i,Math.floor(o/w),Math.max(mj(Hc[o]),mj(Hc[r1]),mj(Hc[d1]))]);}}
      D[k]=col[0];D[k+1]=col[1];D[k+2]=col[2];D[k+3]=255;}
    x.putImageData(img,0,0);cand.sort((A,B)=>B[2]-A[2]||hash(A[0],A[1])-hash(B[0],B[1]));const lab=[];
    for(const q of cand){if(lab.length>=16)break;if(lab.every(([a,b])=>Math.hypot(a-q[0],b-q[1])>13*G))lab.push(q);}
    if(G>=4){x.font=`600 ${Math.round(G*1.3)}px Figtree, system-ui, sans-serif`;x.textAlign="center";x.textBaseline="middle";x.lineJoin="round";
      for(const[lx,ly,v]of lab){const t=v+" cm";x.lineWidth=Math.max(2,G*.45);x.strokeStyle="rgba(255,255,255,.9)";x.strokeText(t,lx,ly);x.fillStyle="#5C3418";x.fillText(t,lx,ly);}}
    return;}
  const mask=new Float32Array(w*h);for(let o=0;o<w*h;o++)mask[o]=zone[o]?1:0;
  const sh=blur(mask,w,h,Math.round(1.6*G)),Hb=blur(H,w,h,Math.max(1,Math.round(.8*G))),Hb2=blur(H,w,h,Math.round(2.2*G));
  const L=[-.42,-.6,.68],Lz=L[2],offX=Math.round(.5*G),offY=Math.round(.9*G),jit={cut15:.3,loop3:.12,cut4:.4,brush4:.75,pompon:.25};
  const S=G>=4?3:1;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const o=j*w+i,k=o*4,z0=zone[o];
    if(!z0){let zi=0;const a=.4*G,ii=Math.round(i+(hash(i,j)-.5)*2*a),jj=Math.round(j+(hash(j+77,i+13)-.5)*2*a);if(ii>=0&&jj>=0&&ii<w&&jj<h)zi=zone[jj*w+ii];
      if(!zi){const si=i-offX,sj=j-offY,s=si>=0&&sj>=0?sh[sj*w+si]:0,f=1-.26*s,n=1+(hash(i>>1,j>>1)-.5)*.025;D[k]=floor[0]*f*n;D[k+1]=floor[1]*f*n;D[k+2]=floor[2]*f*n;D[k+3]=255;continue;}}
    // couleur fondue : moyenne de plusieurs fibres voisines
    let cr=0,cg=0,cb=0,tz=z0;const a=jit[zones[z0||1].tech]*G;
    for(let s=0;s<S;s++){const ii=Math.round(i+(hash(i+s*31,j)-.5)*2*a),jj=Math.round(j+(hash(j+77+s*17,i+13)-.5)*2*a);let zi=z0;
      if(ii>=0&&jj>=0&&ii<w&&jj<h&&zone[jj*w+ii])zi=zone[jj*w+ii];if(!zi)zi=z0||1;if(s===0)tz=zi;const col=Y[zones[zi].ref].rgb;cr+=col[0];cg+=col[1];cb+=col[2];}
    cr/=S;cg/=S;cb/=S;
    const t=zones[tz].tech,ii=Math.min(w-2,Math.max(1,i)),jj=Math.min(h-2,Math.max(1,j)),q=jj*w+ii;
    const dx=(Hb[q+1]-Hb[q-1])*G/2*.85,dy=(Hb[q+w]-Hb[q-w])*G/2*.85,nl=Math.hypot(dx,dy,1);
    let shade=1+.75*((-dx*L[0]-dy*L[1]+Lz)/nl-Lz);shade=Math.min(1.16,Math.max(.66,shade));
    const ao=1-Math.min(.26,Math.max(0,(Hb2[o]-Hb[o])*.14)),X=i/G,Yc=j/G,hs=hash(i,j);let tx;
    if(G<4)tx=1+(hs-.5)*.1;
    else if(t==="loop3"){const pch=.4,v=Yc/pch,row=Math.floor(v),u=X/pch+(row&1)*.5,fu=u-Math.floor(u)-.5,fv=v-row-.5,rr=Math.sqrt(fu*fu+fv*fv);
      tx=.93+.12*Math.max(0,1-Math.abs(rr-.3)*5)+(hs-.5)*.07+(fineN(X/.6,Yc/.6)-.5)*.05;}
    else if(t==="brush4")tx=1.04+(fineN(X/1.1,Yc/1.1)-.5)*.14+(fineN(X/.1,Yc/.1)-.5)*.07+(hs-.5)*.04;
    else if(t==="pompon")tx=1+(hs-.5)*.16+(fineN(X/.18,Yc/.18)-.5)*.1;
    else tx=1+(hs-.5)*.13+(fineN(X/.16,Yc/.16)-.5)*.08+(fineN(X/2.2+40,Yc/2.2)-.5)*.05;
    const hv=G<4?0:(fineM(X/1.4,Yc/1.4)-.5)*.06,f=shade*ao*tx;
    D[k]=Math.min(255,cr*f*(1+hv));D[k+1]=Math.min(255,cg*f*(1+hv*.3));D[k+2]=Math.min(255,cb*f*(1-hv));D[k+3]=255;}
  x.putImageData(img,0,0);}
function legend(g){const cnt=new Map();let tot=0;
  for(let o=0;o<g.zone.length;o++){const z=g.zone[o];if(!z)continue;tot++;const Zo=g.zones[z],key=Zo.ref+"|"+Zo.tech;cnt.set(key,(cnt.get(key)||0)+1);}
  return [...cnt.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>{const[ref,tech]=k.split("|");return {ref,nom:Y[ref].nom,hex:Y[ref].hex,tech,techFr:TECH[tech],part:n/tot};});}
window.Moteur={generate,render,legend,Y,TECH,THEMES};
})();
