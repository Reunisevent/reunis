// Correspondance texte partagée par toutes les barres de recherche du site
// (loupe du haut de page, recherche des pages catégories, « Décorer », maquette).
// Une recherche trouve un article quels que soient les majuscules, les accents
// et le pluriel : « Bougie », « bougies », « BOUGIÉ » donnent le même résultat.
(function(){
  // Petits mots ignorés dans la requête (« nappe de table » = « nappe table »).
  var VIDES = { a:1, au:1, aux:1, d:1, de:1, des:1, du:1, en:1, et:1, l:1, la:1, le:1, les:1, pour:1, un:1, une:1, avec:1, sur:1 };

  // Minuscules, sans accents ni ligatures, ponctuation remplacée par des espaces.
  function normaliser(s){
    return String(s == null ? '' : s).toLowerCase()
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  // Forme singulier approximative : « chevaux » / « cheval » → « chevau »,
  // « bougies » → « bougie », « tuyaux » → « tuyau ».
  function singulier(m){
    if(m.length <= 3) return m;
    if(/aux$/.test(m)) return m.slice(0, -1);
    if(/al$/.test(m)) return m.slice(0, -1) + 'u';
    if(/[sx]$/.test(m)) return m.slice(0, -1);
    return m;
  }

  function mots(s){ return normaliser(s).split(' ').filter(Boolean).map(singulier); }

  // Tout le texte d'un article sur lequel porte la recherche (champs Notion
  // compris : sous-catégorie, sous-sous catégorie et mots clés).
  function texteArticle(a){
    if(!a) return '';
    if(!Object.prototype.hasOwnProperty.call(a, '_rechercheTexte')){
      var liste = function(v){ return Array.isArray(v) ? v.join(' ') : (v || ''); };
      // Propriété non énumérable : absente du JSON quand l'article est mémorisé.
      Object.defineProperty(a, '_rechercheTexte', { value: ' ' + mots([
        a.nom, a.reference, liste(a.couleurs), liste(a.materiaux), a.categorie,
        a.sous_categorie, liste(a.sous_sous_categorie), liste(a.sous_sous_categories), liste(a.mots_cles)
      ].join(' ')).join(' ') + ' ' });
    }
    return a._rechercheTexte;
  }

  // Chaque mot de la requête doit apparaître dans l'article (dans n'importe quel
  // ordre ; un morceau de mot suffit pendant la saisie : « chai » → chaise).
  function correspond(a, requete){
    var q = mots(requete);
    var utiles = q.filter(function(m){ return !VIDES[m]; });
    if(utiles.length) q = utiles;
    if(!q.length) return true;
    var t = texteArticle(a);
    return q.every(function(m){ return t.indexOf(m) >= 0; });
  }

  window.ReunisRecherche = { normaliser: normaliser, correspond: correspond };
})();
