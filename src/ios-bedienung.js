
// iOS UX: avoid accidental double-tap zoom on control surfaces; preserve canvas gestures.
(function(){
  document.querySelectorAll('button').forEach(function(b){
    if(!b.hasAttribute('type'))b.setAttribute('type','button');
    if(!b.getAttribute('aria-label')&&!b.textContent.trim())b.setAttribute('aria-label',b.id||'Spielaktion');
  });
  var cv=document.getElementById('cv');
  if(cv){cv.setAttribute('aria-label','Spielfeld: Tippen zum Bauen, ziehen zum Verschieben, zwei Finger zum Zoomen');cv.setAttribute('role','img');}
  document.addEventListener('contextmenu',function(e){if(e.target.closest('#stage'))e.preventDefault();});
})();
