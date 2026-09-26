/* Compteur de quantité partagé (page article + page sélection).
   initQtyInput({ input, minus, plus, msg, max, onChange }) :
   - input  : <input type="number"> saisissable
   - minus / plus : boutons − / + (clic, appui long accéléré, clavier)
   - msg    : élément (optionnel) pour le message « Stock max : N »
   - max    : nombre ou fonction renvoyant le stock disponible
   - onChange(qty) : appelé à chaque nouvelle quantité valide */
function initQtyInput(o){
  var input = o.input, msg = o.msg;
  var value = 1, msgTimer = null;

  function getMax(){
    var m = parseInt(typeof o.max === 'function' ? o.max() : o.max, 10);
    return m > 0 ? m : 1;
  }
  function toInt(v){
    var s = String(v).trim();
    return /^\d+$/.test(s) ? parseInt(s, 10) : null;
  }
  function showMsg(text){
    if(!msg) return;
    msg.textContent = text;
    msg.classList.add('visible');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(function(){ msg.classList.remove('visible'); }, 2500);
  }
  function set(n){
    n = Math.min(getMax(), Math.max(1, n));
    input.max = getMax();
    input.value = n;
    if(n !== value){ value = n; o.onChange(n); }
    return n;
  }
  // Validation au blur / Entrée : vide ou invalide → 1, dépassement → stock max
  function commit(){
    var n = toInt(input.value), max = getMax();
    if(n === null || n < 1) n = 1;
    if(n > max){ n = max; showMsg('Stock max : ' + max); }
    set(n);
  }

  input.addEventListener('input', function(){
    // Mise à jour en direct (plafonnée au stock) ; le champ est corrigé au blur / Entrée
    var n = toInt(input.value);
    if(n === null || n < 1) return;
    n = Math.min(getMax(), n);
    if(n !== value){ value = n; o.onChange(n); }
  });
  input.addEventListener('change', commit);
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); commit(); input.blur(); }
  });
  input.addEventListener('focus', function(){
    setTimeout(function(){ try { input.select(); } catch(err){} }, 0);
  });

  function step(dir, size){
    if(document.activeElement === input){ commit(); input.blur(); }
    var n = value;
    if(size > 1) n = dir > 0 ? Math.floor(n / size) * size + size : Math.ceil(n / size) * size - size;
    else n += dir;
    if(dir > 0 && n > getMax()) showMsg('Stock max : ' + getMax());
    set(n);
  }

  // Clic = +1/−1 au relâchement ; appui long (> 400 ms) = défilement qui accélère
  function bindButton(btn, dir){
    if(!btn) return;
    var holdTimer = null, repeatTimer = null, repeated = false, count = 0, pressed = false, lastPointer = 0;
    function stop(){
      pressed = false;
      clearTimeout(holdTimer); clearTimeout(repeatTimer);
    }
    function tick(){
      if(!pressed) return;
      repeated = true;
      count++;
      var before = value;
      step(dir, count > 40 ? 10 : count > 20 ? 5 : 1);
      if(value === before){ stop(); return; }
      repeatTimer = setTimeout(tick, Math.max(50, 160 - count * 10));
    }
    btn.addEventListener('pointerdown', function(e){
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if(document.activeElement === input){ commit(); input.blur(); }
      pressed = true; repeated = false; count = 0;
      try { btn.setPointerCapture(e.pointerId); } catch(err){}
      holdTimer = setTimeout(tick, 400);
    });
    btn.addEventListener('pointerup', function(){
      var wasPressed = pressed;
      lastPointer = Date.now();
      stop();
      if(wasPressed && !repeated) step(dir, 1);
    });
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('lostpointercapture', stop);
    btn.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    // Clavier (Entrée / Espace sur le bouton) : le clic qui suit un pointeur est déjà traité
    btn.addEventListener('click', function(){ if(Date.now() - lastPointer > 800) step(dir, 1); });
  }
  bindButton(o.minus, -1);
  bindButton(o.plus, 1);

  set(toInt(input.value) || 1);
  return {
    get: function(){ return value; },
    set: set,
    refresh: function(){ set(value); }
  };
}
