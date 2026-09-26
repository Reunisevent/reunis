// Recherche rapide : la loupe du haut de page ouvre un panneau de recherche sur la
// page en cours (résultats en direct, clic = fiche article), sans changer de page.
(function(){
  var MAX = 24;
  var catalogue = null, chargement = null, toutAfficher = false, panneau, champ, liste, info;

  var css = ''
    + '.rr-fond{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:300;opacity:0;transition:opacity .2s;}'
    + '.rr-fond.ouvert{opacity:1;}'
    + '.rr-panneau{position:fixed;top:0;left:50%;transform:translate(-50%,-12px);width:min(900px,calc(100% - 32px));margin-top:16px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:var(--bg);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);z-index:301;opacity:0;transition:opacity .2s,transform .2s;overflow:hidden;}'
    + '.rr-panneau.ouvert{opacity:1;transform:translate(-50%,0);}'
    + '.rr-tete{display:flex;align-items:center;gap:10px;padding:16px;border-bottom:1px solid rgba(0,0,0,.07);}'
    + '.rr-barre{flex:1;display:flex;align-items:center;height:48px;border:1.5px solid var(--rose);border-radius:8px;background:var(--white);box-shadow:0 0 0 3px rgba(214,91,128,.15);}'
    + '.rr-barre svg{margin-left:14px;flex-shrink:0;}'
    + '.rr-champ{flex:1;min-width:0;border:none;outline:none;background:transparent;padding:10px 12px;font-family:"Arimo",sans-serif;font-size:16px;color:var(--noir);}'
    + '.rr-fermer{background:none;border:none;font-family:"Arimo",sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--noir);padding:10px 4px;cursor:pointer;}'
    + '.rr-fermer:hover{color:var(--rose);}'
    + '.rr-info{padding:14px 16px 0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);}'
    + '.rr-liste{overflow-y:auto;padding:12px 16px 16px;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;}'
    + '.rr-carte{background:var(--white);cursor:pointer;}'
    + '.rr-img{aspect-ratio:3/4;background:var(--bg);overflow:hidden;display:flex;align-items:center;justify-content:center;color:#ddd;font-size:1.6rem;}'
    + '.rr-img img{width:100%;height:100%;object-fit:cover;transition:transform .3s;}'
    + '.rr-carte:hover .rr-img img{transform:scale(1.04);}'
    + '.rr-nom{padding:8px 8px 2px;font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;line-height:1.3;}'
    + '.rr-prix{padding:0 8px 10px;font-size:11px;color:var(--muted);}'
    + '.rr-tout{grid-column:1/-1;margin:14px auto 0;background:none;border:none;font-family:"Arimo",sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--rose);text-decoration:underline;text-underline-offset:4px;cursor:pointer;padding:8px;}'
    + '.rr-tout:hover{color:var(--noir);}'
    + '@media(max-width:860px){'
    +   '.rr-panneau{top:0;left:0;transform:translateY(12px);width:100%;height:100%;max-height:none;margin:0;border-radius:0;}'
    +   '.rr-panneau.ouvert{transform:none;}'
    +   '.rr-liste{grid-template-columns:repeat(2,1fr);}'
    + '}';

  function normaliser(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function construire(){
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var fond = document.createElement('div'); fond.className = 'rr-fond'; fond.onclick = fermer;
    panneau = document.createElement('div'); panneau.className = 'rr-panneau';
    panneau.setAttribute('role', 'dialog'); panneau.setAttribute('aria-label', 'Rechercher dans le catalogue');
    panneau.innerHTML = '<div class="rr-tete"><div class="rr-barre">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>'
      + '<input class="rr-champ" type="text" placeholder="Rechercher un article…" autocomplete="off" enterkeyhint="search"></div>'
      + '<button type="button" class="rr-fermer">Fermer</button></div>'
      + '<div class="rr-info"></div><div class="rr-liste"></div>';
    panneau._fond = fond;
    document.body.appendChild(fond); document.body.appendChild(panneau);
    champ = panneau.querySelector('.rr-champ'); liste = panneau.querySelector('.rr-liste'); info = panneau.querySelector('.rr-info');
    panneau.querySelector('.rr-fermer').onclick = fermer;
    champ.addEventListener('input', function(){ toutAfficher = false; liste.scrollTop = 0; afficher(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && panneau.classList.contains('ouvert')) fermer(); });
  }

  function chargerCatalogue(){
    if(!chargement){
      chargement = fetch('/api/catalogue')
        .then(function(r){ if(!r.ok) throw new Error(); return r.json(); })
        .then(function(a){ catalogue = a; afficher(); })
        .catch(function(){ chargement = null; info.textContent = 'Erreur de chargement — réessayez.'; });
    }
  }

  function afficher(){
    var q = normaliser(champ.value.trim());
    liste.innerHTML = '';
    if(!q){ info.textContent = catalogue ? 'Tapez un mot : chaise, nappe, bougie…' : 'Chargement du catalogue…'; return; }
    if(!catalogue){ info.textContent = 'Chargement du catalogue…'; return; }
    var res = catalogue.filter(function(a){
      return normaliser([a.nom, (a.couleurs || []).join(' '), a.categorie, a.sous_categorie, a.sous_sous_categorie, a.mots_cles].join(' ')).indexOf(q) >= 0;
    });
    var limite = toutAfficher ? res.length : MAX;
    info.textContent = res.length ? res.length + ' résultat' + (res.length > 1 ? 's' : '') + (res.length > limite ? ' — les ' + limite + ' premiers' : '') : 'Aucun résultat';
    res.slice(0, limite).forEach(function(a){
      var prix = parseFloat(a.prix_location);
      var c = document.createElement('div'); c.className = 'rr-carte';
      c.innerHTML = '<div class="rr-img">' + (a.photo ? '<img src="' + a.photo + '" alt="" loading="lazy">' : '✦') + '</div>'
        + '<div class="rr-nom"></div><div class="rr-prix">' + (prix ? prix.toFixed(2) + '€' : 'Sur devis') + '</div>';
      c.querySelector('.rr-nom').textContent = a.nom;
      c.onclick = function(){
        try { localStorage.setItem('reunis_article_courant', JSON.stringify(a)); } catch(e) {}
        window.location.href = 'article.html';
      };
      liste.appendChild(c);
    });
    if(res.length > limite){
      var tout = document.createElement('button');
      tout.type = 'button'; tout.className = 'rr-tout';
      tout.textContent = 'Voir tous les résultats (' + res.length + ')';
      tout.onclick = function(){ toutAfficher = true; afficher(); };
      liste.appendChild(tout);
    }
  }

  function ouvrir(){
    if(!panneau) construire();
    panneau._fond.style.display = ''; panneau.style.display = '';
    requestAnimationFrame(function(){ panneau._fond.classList.add('ouvert'); panneau.classList.add('ouvert'); });
    document.body.style.overflow = 'hidden';
    champ.focus();
    afficher();
    chargerCatalogue();
    return false;
  }

  function fermer(){
    panneau.classList.remove('ouvert'); panneau._fond.classList.remove('ouvert');
    document.body.style.overflow = '';
    setTimeout(function(){ if(!panneau.classList.contains('ouvert')){ panneau.style.display = 'none'; panneau._fond.style.display = 'none'; } }, 200);
  }

  window.ouvrirRechercheRapide = ouvrir;
})();
