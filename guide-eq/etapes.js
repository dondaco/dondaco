/* Les 4 étapes du parcours : SOURCE UNIQUE, partagée par le Labo (aperçu) et le tableau de bord artiste (cases à cocher).
   Chaque case : k (identifiant, ne pas changer), t (texte), hint (explication), cours (cours de la Donda Skool qui accompagne), cle (case mise en avant), appel (appel de groupe avec Donda), do (la même chose dite comme une action, pour « Ta prochaine action »), labo / join (liens). */
window.SKOOL_URL='https://www.skool.com/studio-virtuel-8936';
/* Lien pour REJOINDRE : toujours la page « À propos » (Skool donne un bonus de classement au trafic que le propriétaire y envoie). */
window.SKOOL_JOIN=window.SKOOL_URL+'/about';
/* Liens des chapitres de la Donda Skool (à compléter avec les vrais liens ; sinon : l'onglet Classroom). */
window.COURS_URL={};
window.coursUrl=n=>(window.COURS_URL&&window.COURS_URL[n])||(window.SKOOL_URL+'/classroom');
window.LABO_URL='https://dondaco.github.io/dondaco/labo/';
window.ETAPES=[
 {id:'rec',name:'REC',goal:'Finir un son',items:[
   {k:'rec1',t:'Mon logiciel de musique est installé',do:'Installer un logiciel de musique',cours:'Installer ton logiciel'},
   {k:'recl',t:'Je sais utiliser les 7 outils du Labo',do:'Apprendre les 7 outils du Labo',hint:'EQ, compression, saturation, reverb, delay, clipping, de-esser : les bases pour t\'enregistrer et te mixer. Tu préfères que Donda t\'explique ? Le chapitre est aussi dans la Donda Skool.',labo:true,cours:'Mixe tes propres sons'},
   {k:'rec2',t:'J\'ai fini une démo, du début à la fin',do:'Finir une démo, du début à la fin',hint:'C\'est le devoir de fin du chapitre mix : tu reçois le template et tu finis ta première démo.',cours:'Mixe tes propres sons'},
   {k:'rec3',t:'J\'ai posté ma démo dans la Donda Skool',do:'Poster ta démo dans la Donda Skool',hint:'La communauté gratuite : tu y retrouves les cours, les autres artistes et Donda, qui écoute ta démo.',join:true}]},
 {id:'loop',name:'POST',goal:'Poster régulièrement',items:[
   {k:'loop0',t:'J\'ai rejoint l\'appel de lancement POST',do:'Rejoindre l\'appel de lancement POST',appel:'Lancement',hint:'Donda organise tes 4 semaines avec toi : quoi poster, et quand.'},
   {k:'loopv',t:'J\'ai fini mon premier reel viral',do:'Finir ton premier reel viral',cours:'Viral TikTok & Reel'},
   {k:'loop1',t:'Semaine 1 : j\'ai posté comme prévu',do:'Semaine 1 : poster comme prévu'},
   {k:'loop2',t:'Semaine 2 : j\'ai posté comme prévu',do:'Semaine 2 : poster comme prévu'},
   {k:'loop3',t:'Semaine 3 : j\'ai posté comme prévu',do:'Semaine 3 : poster comme prévu'},
   {k:'loop4',t:'Semaine 4 : j\'ai posté comme prévu',do:'Semaine 4 : poster comme prévu'},
   {k:'loopb',t:'Appel bilan : on a analysé l\'évolution de mes chiffres',do:'Rejoindre l\'appel bilan de tes 4 semaines',appel:'Bilan',hint:'Fin des 4 semaines : on regarde ensemble ce qui a marché, et ce qui a grandi.'}]},
 {id:'drop',name:'DROP',goal:'Sortir un vrai single',items:[
   {k:'drops',t:'J\'ai configuré mes plateformes de streaming pour ma sortie',do:'Configurer tes plateformes de streaming',cours:'Plateformes de streaming'},
   {k:'drop1',t:'Mon single est prêt',do:'Finir ton single',cours:'Sortir un single'},
   {k:'dropm',t:'Mon moodboard est prêt',do:'Faire ton moodboard',hint:'L\'univers visuel de ta sortie : couleurs, photos, ambiance.',cours:'Moodboard'},
   {k:'dropc',t:'J\'ai envoyé ma candidature au Challenge 30 jours',do:'Envoyer ta candidature au Challenge 30 jours',hint:'30 jours pour défendre ton single en petit groupe avec Donda : un plan de campagne, du contenu chaque jour, les appels du lundi.',cle:true},
   {k:'drop4',t:'J\'ai réussi mon Challenge 30 jours',do:'Réussir ton Challenge 30 jours'}]},
 {id:'era',name:'LIVE',goal:'4 jours en studio, puis 6 mois pour défendre tes titres',items:[
   {k:'era1',t:'J\'ai envoyé ma candidature',do:'Envoyer ta candidature pour la résidence'},
   {k:'era2',t:'J\'ai vécu la résidence',do:'Vivre ta résidence'},
   {k:'era3',t:'Mes 6 mois d\'accompagnement sont faits',do:'Défendre tes titres pendant 6 mois',hint:'Le suivi qui commence après la résidence : 6 mois avec ton groupe pour sortir et défendre les titres créés en résidence.'}]}
];
