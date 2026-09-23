/* Interface de référence : rendu depuis data.js, calculs purs dans core.js.
 * Les contenus édités sont toujours assignés via value/textContent, jamais innerHTML. */
(() => {
  'use strict';
  const {modules} = RADS;
  const $ = selector => document.querySelector(selector);
  const main = $('#main');
  const searchInput = $('#search');
  const report = $('#report-text');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
  const moduleURL = (m,v,row) => '#module/'+m.id+'/'+v.id+(row?'/'+row.id:'');
  const state = {favorites:new Set(),query:'',psa:'',volume:'',installPrompt:null,registration:null,toastTimer:null,lastRoute:'',reloadApproved:false,selectionFocus:null};
  try {
    const saved = JSON.parse(localStorage.getItem('radiorads.favorites') || '[]');
    if(Array.isArray(saved)) state.favorites = new Set(saved.filter(id=>modules.some(m=>m.id===id)));
  } catch (_) { /* Préférence illisible : repartir d'une liste vide. */ }

  function toast(text) {
    $('#toast').textContent = text; $('#toast').hidden=false;
    clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);
  }
  function persist(key,value) {
    try {localStorage.setItem('radiorads.'+key,value);} catch (_) {toast('Stockage indisponible : préférence conservée pour cette session seulement.');}
  }
  function route() {
    let parts;
    try {parts=decodeURIComponent(location.hash.slice(1)).split('/');} catch (_) {parts=['home'];}
    const m=modules.find(m=>m.id===parts[1]);
    const v=m?.variants.find(v=>v.id===parts[2])||m?.variants[0];
    return {page:parts[0]||'home',m,v,row:parts[3]};
  }
  function nav() {
    const r=route();
    $('#navigation').innerHTML = `<a class="nav-item ${r.page==='home'?'active':''}" href="#home" ${r.page==='home'?'aria-current="page"':''}>${icon('table-cells-large')} Vue d’ensemble</a>
      <a class="nav-item ${r.page==='favorites'?'active':''}" href="#favorites" ${r.page==='favorites'?'aria-current="page"':''}>${icon('star')} Mes favoris <small>${state.favorites.size}</small></a>
      <div class="nav-divider"></div><div class="nav-label">CLASSIFICATIONS</div>`+
      modules.map(m=>`<a class="nav-item ${r.page==='module'&&r.m===m?'active':''}" href="${moduleURL(m,m.variants[0])}" ${r.page==='module'&&r.m===m?'aria-current="page"':''}>${icon(m.icon)}<span>${m.name}</span><small>${m.organ==='Ovaires & annexes'?'Annexes':m.organ}</small></a>`).join('');
  }
  function favoriteButton(m, detail=false) {
    const selected=state.favorites.has(m.id);
    return `<button class="${detail?'button':'favorite-button'}" data-favorite="${m.id}" aria-pressed="${selected}" aria-label="${selected?'Retirer':'Ajouter'} ${m.name} ${selected?'des':'aux'} favoris">${icon('star')}${detail?(selected?'Favori':'Épingler'):''}</button>`;
  }
  function card(m) {
    return `<article class="module-card" style="--accent:var(--${m.accent})">
      <a href="${moduleURL(m,m.variants[0])}"><div class="module-top"><div class="organ-icon">${icon(m.icon)}</div><div><h3>${m.name}</h3><span class="organ">${m.organ}</span></div></div>${m.id==='vi'?'<img class="module-thumb" src="assets/vi-rads-thumb.png" alt="Miniature simplifiée des séquences IRM VI-RADS">':''}<p>${m.subtitle}</p><div class="module-foot"><span class="version-pill">${m.variants.map(v=>v.version).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')}</span><span class="card-arrow">Ouvrir le guide ${icon('arrow-right')}</span></div></a>${favoriteButton(m)}</article>`;
  }
  function renderHome(favorites=false) {
    const list=favorites?modules.filter(m=>state.favorites.has(m.id)):modules;
    main.innerHTML=`<div class="page-heading"><div><span class="eyebrow">${favorites?'VOTRE SÉLECTION':'LE REPÈRE AU QUOTIDIEN'}</span><h1>${favorites?'Mes favoris':'Vos référentiels, à portée de main.'}</h1></div><span class="date-tag">${icon('calendar-check')} Revue du 23 septembre 2026</span></div>
    ${!favorites?`<section class="hero"><div><span class="eyebrow">RADIORADS COMPANION</span><h2>Moins de recherche.<br>Plus de clarté.</h2><p>Retrouvez les catégories, les critères essentiels et les conduites à tenir. Un guide pensé pour votre pratique de l’imagerie.</p><div class="hero-tags"><span>${icon('book-open')} Références sourcées</span><span>${icon('laptop-medical')} Pensé pour la lecture</span><span>${icon('wifi')} Accès hors ligne</span></div></div><div class="hero-art" aria-hidden="true"><span class="orbit"></span>${icon('layer-group')}</div></section>
    <div class="stats-row"><div class="stat"><strong>${String(modules.length).padStart(2,'0')}</strong><span>classifications<br>essentielles</span></div><div class="stat"><strong>${String(modules.flatMap(m=>m.variants).length).padStart(2,'0')}</strong><span>parcours de<br>référence</span></div><div class="stat"><strong>${String(state.favorites.size).padStart(2,'0')}</strong><span>guides épinglés<br>dans vos favoris</span></div></div>`:''}
    <div class="section-heading"><h2>${favorites?'Vos guides épinglés':'Explorer les classifications'}</h2><p>Choisissez un organe pour consulter son référentiel</p></div>
    ${list.length?`<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">${list.map(card).join('')}</div>`:`<div class="empty-state">${icon('star')}<h2>Vos essentiels, réunis ici.</h2><p>Utilisez l’étoile d’une classification pour la retrouver rapidement.</p><a class="button mt-4" href="#home">Explorer les guides</a></div>`}
    <div class="bottom-note">${icon('circle-info')}<div><strong>Un repère, avec son contexte.</strong><br>Les catégories sont choisies par le médecin. Les recommandations dépendent du terrain, de la modalité et de la qualité de l’examen. <a class="underline" href="#about">Consulter la méthode.</a></div></div>`;
  }
  function scoreCard(m,v,r) {
    return `<article class="score-card" id="${r.id}"><div class="score-card-header"><span class="score-badge tone-${r.tone}">${esc(r.score)}</span><div><h3>${esc(r.title)}</h3><div class="risk">${esc(r.risk)}</div></div><button class="button compact choose" data-select="${r.id}" aria-label="Préparer une conclusion ${esc(m.name+' '+r.score+' — '+r.title)}">${icon('file-pen')} Conclusion</button></div><p>${esc(r.criteria)}</p><div class="action-text"><strong>Conduite à tenir</strong>${esc(r.action)}</div></article>`;
  }
  function psaBox() {
    return `<section class="aside-box"><h2>${icon('calculator')} Densité du PSA</h2><div class="psa-grid"><label for="psa">PSA · ng/mL<input id="psa" inputmode="decimal" type="text" placeholder="Ex. 6,5" value="${esc(state.psa)}" autocomplete="off" aria-describedby="psa-result"></label><label for="volume">Volume · cm³<input id="volume" inputmode="decimal" type="text" placeholder="Ex. 50" value="${esc(state.volume)}" autocomplete="off" aria-describedby="psa-result"></label></div><div class="density-result" id="psa-result" role="status"></div><p class="psa-note">PSA ÷ volume • 1 mL = 1 cm³.<br>Ce calcul ne modifie pas PI-RADS.</p><button id="add-density" class="button compact mt-4" disabled>Ajouter à la conclusion</button></section>`;
  }
  function sourcesHTML(v) {
    return `<section class="aside-box sources"><h2>${icon('book-open')} Sources & version</h2>${v.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ${icon('arrow-up-right-from-square')}</a>`).join('')}<small>Documents consultés le 23/09/2026.<br>Les liens externes nécessitent une connexion.</small></section>`;
  }
  function renderModule(m,v,selectedRow) {
    main.innerHTML=`<div class="breadcrumb"><a href="#home">Classifications</a>${icon('chevron-right')}<span>${m.organ}</span></div>
    <div class="detail-heading"><div class="detail-title" style="--accent:var(--${m.accent})"><span class="organ-icon">${icon(m.icon)}</span><div><h1>${m.name}</h1><p>${m.full}<br>${m.agency}</p></div></div><div class="detail-actions">${favoriteButton(m,true)}</div></div>
    <nav class="tabs" aria-label="Parcours ${m.name}">${m.variants.map(item=>`<a class="tab" href="${moduleURL(m,item)}" ${item===v?'aria-current="page"':''}>${item.label} <span class="small">· ${item.version}</span></a>`).join('')}</nav>
    <div class="context-box"><span class="eyebrow">POPULATION & CHAMP D’APPLICATION</span>${esc(v.population)}<div class="context-meta"><span>${icon('bookmark')} ${v.version}</span><span>${icon('list-check')} Catégorie choisie par le médecin</span><span>Synthèse de référence · critères principaux</span></div>${m.id==='vi'?'<figure class="vi-mini-figure"><img src="assets/vi-rads-mini.svg" alt="Repère visuel simplifié VI-RADS : T2W, DWI, ADC et DCE"><figcaption>Repère visuel original : la sémiologie IRM guide l’estimation de l’invasion musculaire.</figcaption></figure>':''}</div>
    <div class="detail-grid"><div><div class="section-heading"><h2>Catégories & conduite à tenir</h2></div><nav class="jump-links" aria-label="Accès aux catégories">${v.rows.map(r=>`<a href="${moduleURL(m,v,r)}">${esc(r.score)}</a>`).join('')}</nav><div class="score-list">${v.rows.map(r=>scoreCard(m,v,r)).join('')}</div>
    <div class="section-heading mt-8"><h2>Repères de lecture</h2></div>${v.sections.map(s=>`<details class="knowledge" open><summary>${esc(s.title)}</summary><ul>${s.items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`).join('')}</div>
    <aside class="detail-aside" aria-label="Conseils et références">${m.id==='pi'?psaBox():''}<section class="aside-box"><h2>${icon('lightbulb')} Perles & Pièges</h2><ul>${v.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>${sourcesHTML(v)}<section class="aside-box"><h2>${icon('file-lines')} Une conclusion utile</h2><p class="muted small">Sélectionnez « Conclusion » sur une catégorie, puis adaptez le texte avant de le copier dans votre RIS.</p></section></aside></div>`;
    if(m.id==='pi') updatePSA();
    if(selectedRow && v.rows.some(r=>r.id===selectedRow)) {
      const element=document.getElementById(selectedRow); element.classList.add('highlighted');
      requestAnimationFrame(()=>element.scrollIntoView({block:'start',behavior:'instant'}));
    }
  }
  function renderSearch() {
    const results=RADSCore.search(modules,state.query);
    main.innerHTML=`<div class="page-heading"><div><span class="eyebrow">RECHERCHE TRANSVERSALE</span><h1>Retrouvez l’essentiel.</h1></div><button class="button" id="clear-search">Effacer la recherche</button></div><p class="search-summary" role="status">${results.length} résultat${results.length>1?'s':''} pour « ${esc(state.query)} »</p>`+
      (results.length?results.map(result=>`<a class="result-card" href="${moduleURL(result.module,result.variant,result.row)}"><div class="result-path">${result.module.organ} / ${result.module.name} / ${result.variant.label} · ${result.variant.version}</div><h2>${esc(result.title)}${result.row?' — '+esc(result.row.title):''}</h2><p>${esc(result.row ? result.row.action : result.section.items.join(' '))}</p></a>`).join(''):`<div class="empty-state">${icon('magnifying-glass')}<h2>Aucun résultat</h2><p>Essayez « PI-RADS 4 », « biopsie », « verre dépoli » ou le nom d’un organe.</p></div>`);
  }
  function renderAbout() {
    main.innerHTML=`<div class="page-heading"><div><span class="eyebrow">TRANSPARENCE & RÉFÉRENCES</span><h1>Un guide, des sources explicites.</h1></div></div>
    <section class="about-panel"><h2>Ce que fait RadioRADS Companion</h2><p>Un guide français indépendant pour radiologues, cliniciens et internes. Les fiches synthétisent des documents officiels ; elles ne constituent ni une traduction officielle, ni un atlas complet. L’application n’est pas affiliée à l’ACR, l’ESUR ou la SCCT.</p><p>La catégorie est sélectionnée par le médecin. Les risques sont ceux du référentiel lorsqu’ils sont disponibles ; aucun risque chiffré n’est déduit d’une catégorie qualitative. Les exemples de critères ne remplacent pas les matrices intégrales.</p><p><strong>Revue documentaire : 23 septembre 2026.</strong> Les tests logiciels ne constituent pas une validation clinique indépendante. Une revue médicale locale est nécessaire avant intégration à une pratique de service.</p></section>
    <section class="about-panel"><h2>Limites documentaires identifiées</h2><p>BI-RADS v2025 : synthèse des résumés publics et des nouveautés officielles, sans reproduction du manuel complet payant. Les sous-catégories mammaires 4A–4C ne sont pas proposées comme lexique IRM/CEM.</p><p>O-RADS IRM : la grille ACR fournit une stratification du risque, sans calendrier universel de surveillance. Les orientations cliniques sont signalées comme des repères à individualiser. PI-RADS et densité du PSA : les décisions de biopsie sont attribuées séparément à l’EAU.</p></section>
    <section class="about-panel"><h2>Installation & confidentialité</h2><p>Sur HTTPS ou localhost, ouvrez une première fois l’application en ligne et attendez « Disponible hors ligne ». Installez-la via le bouton proposé par votre navigateur ; sur iPhone/iPad, utilisez Partager → Sur l’écran d’accueil. Une ouverture directe du fichier HTML donne accès au guide mais n’installe pas la PWA.</p><p>Le thème et les favoris sont mémorisés sur cet appareil. PSA, volume et conclusion restent en mémoire dans cet onglet ; aucun envoi serveur, compte ou suivi d’usage. Les textes copiés ou exportés relèvent ensuite de votre logiciel destinataire.</p><p>Une nouvelle version n’est activée depuis ce panneau qu’après effacement volontaire du brouillon. Copiez ou exportez votre texte avant de l’effacer. Le navigateur peut évincer le cache : l’état hors ligne est revérifié au chargement.</p></section>
    <section class="about-panel"><h2>Bibliothèque des références</h2>${modules.map(m=>`<div class="source-group"><h3>${m.name} · ${m.organ}</h3>${m.variants.map(v=>`<p>${v.label} — ${v.version}</p>${v.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ${icon('arrow-up-right-from-square')}</a>`).join('')}`).join('')}</div>`).join('')}</section>`;
  }
  function render() {
    nav();
    if(state.query.trim()) {renderSearch(); return;}
    const r=route();
    if(r.page==='module' && r.m) {renderModule(r.m,r.v,r.row);document.title=r.m.name+' · '+r.v.label+' — RadioRADS Companion';}
    else if(r.page==='about') {renderAbout();document.title='Sources & méthode — RadioRADS Companion';}
    else {renderHome(r.page==='favorites');document.title=(r.page==='favorites'?'Mes favoris':'Accueil')+' — RadioRADS Companion';}
  }
  function menu(open) {
    $('#sidebar').classList.toggle('open',open);$('#nav-scrim').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open));
    $('#menu-toggle').setAttribute('aria-label',open?'Fermer la navigation':'Ouvrir la navigation');
    if(open) $('#navigation a').focus();
  }
  function updatePSA() {
    if(!$('#psa-result'))return;
    const result=RADSCore.psaDensity(state.psa,state.volume), box=$('#psa-result');
    box.classList.toggle('error',!result.ok&&!result.empty);
    box.replaceChildren();
    if(result.ok) {
      const strong=document.createElement('strong');
      strong.textContent=result.value>0&&result.value<.001?'< 0,001':result.value.toLocaleString('fr-FR',{minimumFractionDigits:3,maximumFractionDigits:3});
      box.append(strong,document.createTextNode('ng/mL/cm³'));
    } else box.textContent=result.message;
    $('#add-density').disabled=!result.ok;
    for(const field of ['#psa','#volume']) $(field).setAttribute('aria-invalid',String(!result.ok&&!result.empty));
  }
  function showReport(focus=true) {
    $('#report-panel').hidden=false;$('#report-reopen').hidden=true;
    if(focus) report.focus();
  }
  function closeReport() {
    $('#report-panel').hidden=true;$('#report-reopen').hidden=!report.value;
    if(report.value) $('#report-reopen').focus(); else state.selectionFocus?.focus();
  }
  function downloadReport() {
    if(!report.value.trim())return;
    const url=URL.createObjectURL(new Blob(['\ufeff'+report.value],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='RadioRADS-conclusion.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function copyReport() {
    if(!report.value.trim()){ $('#copy-status').textContent='La conclusion est vide.';return; }
    try {
      if(!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(report.value);
      $('#copy-status').textContent='Conclusion copiée. Vous pouvez la coller dans votre RIS.';
    } catch (_) {
      report.focus();report.select();$('#copy-status').textContent='Copie automatique indisponible. Texte sélectionné : utilisez Ctrl+C, ⌘C ou le menu Copier.';
    }
  }
  document.addEventListener('click',event=>{
    const fav=event.target.closest('[data-favorite]');
    if(fav) {
      const id=fav.dataset.favorite;state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);
      persist('favorites',JSON.stringify([...state.favorites]));render();
      document.querySelector(`[data-favorite="${id}"]`)?.focus();return;
    }
    const select=event.target.closest('[data-select]');
    if(select) {
      if(report.value.trim()&&!confirm('Remplacer la conclusion en cours ? Copiez ou exportez-la d’abord si vous souhaitez la conserver.'))return;
      for(const m of modules)for(const v of m.variants){const r=v.rows.find(r=>r.id===select.dataset.select);if(r){report.value=RADSCore.conclusion(m,v,r);state.selectionFocus=select;$('#copy-status').textContent='';showReport();}}
      return;
    }
    const link=event.target.closest('a[href^="#"]');
    if(link && link.getAttribute('href')!=='#main') {
      state.query='';searchInput.value='';menu(false);
      // Cliquer le même résultat doit aussi quitter la recherche.
      if(link.getAttribute('href')===location.hash) {render();main.focus({preventScroll:true});}
    }
    if(event.target.closest('#clear-search')) {state.query='';searchInput.value='';render();searchInput.focus();}
    if(event.target.closest('#add-density')) {
      const result=RADSCore.psaDensity(state.psa,state.volume);if(!result.ok)return;
      const value=result.value.toLocaleString('fr-FR',{maximumFractionDigits:6});
      const line=`Densité du PSA : ${value} ng/mL/cm³ (PSA ${result.psa.toLocaleString('fr-FR')} ng/mL ; volume ${result.volume.toLocaleString('fr-FR')} cm³).`;
      // Remplacer la ligne antérieure pour éviter deux densités contradictoires.
      report.value=report.value.split('\n').filter(l=>!l.startsWith('Densité du PSA :')).join('\n').trim();
      report.value+=(report.value?'\n':'')+line;showReport();
    }
  });
  document.addEventListener('input',event=>{
    if(event.target===searchInput){state.query=searchInput.value;render();}
    if(event.target.id==='psa'||event.target.id==='volume'){state[event.target.id]=event.target.value;updatePSA();}
    if(event.target===report) $('#copy-status').textContent='';
  });
  window.addEventListener('hashchange',()=>{
    state.query='';searchInput.value='';render();menu(false);
    if(!route().row)window.scrollTo(0,0);
    main.focus({preventScroll:true});
  });
  $('#menu-toggle').onclick=()=>menu(!$('#sidebar').classList.contains('open'));
  $('#nav-scrim').onclick=()=>{menu(false);$('#menu-toggle').focus();};
  document.addEventListener('keydown',event=>{
    const editing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if(event.key==='/'&&!editing){event.preventDefault();searchInput.focus();}
    if(event.key==='Escape') {
      if(!$('#report-panel').hidden)closeReport();
      else if($('#sidebar').classList.contains('open')){menu(false);$('#menu-toggle').focus();}
      else if(state.query){state.query='';searchInput.value='';render();searchInput.focus();}
    }
  });
  function updateThemeButton() {
    const dark=document.documentElement.dataset.theme==='dark';
    $('#theme-toggle').setAttribute('aria-label',dark?'Activer le mode clair':'Activer le mode sombre');$('#theme-toggle').setAttribute('aria-pressed',String(dark));
    $('#theme-toggle').innerHTML=icon(dark?'sun':'moon');
  }
  $('#theme-toggle').onclick=()=>{const value=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=value;persist('theme',value);updateThemeButton();};
  $('#report-close').onclick=closeReport;$('#report-reopen').onclick=()=>showReport();
  $('#copy-report').onclick=copyReport;$('#download-report').onclick=downloadReport;
  $('#clear-report').onclick=()=>{if(report.value && !confirm('Effacer cette conclusion ? Cette action ne peut pas être annulée.'))return;report.value='';$('#copy-status').textContent='';closeReport();$('#update-help').textContent='';};
  window.addEventListener('beforeunload',event=>{if(report.value.trim()&&!state.reloadApproved){event.preventDefault();event.returnValue='';}});

  // L'installation reste un choix explicite du navigateur et de l'utilisateur.
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.installPrompt=event;$('#install').hidden=false;});
  $('#install').onclick=async()=>{if(state.installPrompt){await state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$('#install').hidden=true;}};
  window.addEventListener('appinstalled',()=>{$('#install').hidden=true;toast('RadioRADS Companion est installé.');});
  function offlineStatus(text,ready=false){const el=$('#offline-status');el.classList.toggle('ready',ready);el.replaceChildren();const dot=document.createElement('span');dot.className='status-dot';el.append(dot,document.createTextNode(text));el.title=text;}
  function workerMessage(worker,type) {
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();reject(new Error('timeout'));},5000);
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
      worker.postMessage({type},[channel.port2]);
    });
  }
  async function verifyOffline() {
    const worker=state.registration?.active;
    if(!worker){offlineStatus('Préparation hors ligne…');return;}
    try {const result=await workerMessage(worker,'CACHE_STATUS');
      const ready=result.complete && result.version===globalThis.RADS_BUILD;
      offlineStatus(ready?(navigator.onLine?'Disponible hors ligne':'Hors ligne · guide disponible'):'Cache incomplet ou version à actualiser',ready);
    } catch (_) {offlineStatus('Hors ligne non confirmé');}
  }
  function offerUpdate(){if(state.registration?.waiting)$('#update-banner').hidden=false;}
  $('#update-now').onclick=async()=>{
    if(report.value.trim() || state.psa || state.volume){
      $('#update-help').textContent='Pour actualiser sans perte, copiez/exportez puis effacez la conclusion et videz les champs PSA/volume.';return;
    }
    if(!state.registration?.waiting){$('#update-banner').hidden=true;return;}
    state.reloadApproved=true;state.registration.waiting.postMessage({type:'SKIP_WAITING'});
  };
  async function registerPWA(){
    if(!('serviceWorker' in navigator)||!window.isSecureContext||location.protocol==='file:'){offlineStatus('PWA : ouvrir via HTTPS ou localhost');return;}
    try {
      state.registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      offerUpdate();
      state.registration.addEventListener('updatefound',()=>{
        const installing=state.registration.installing;
        installing?.addEventListener('statechange',()=>{if(installing.state==='installed'){offerUpdate();verifyOffline();}});
      });
      await navigator.serviceWorker.ready;
      await verifyOffline();
    } catch (_) {offlineStatus('Cache hors ligne indisponible');}
  }
  navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(state.reloadApproved)location.reload();else{verifyOffline();if(report.value.trim())toast('Version installée. Votre conclusion reste disponible dans cet onglet.');}});
  window.addEventListener('online',verifyOffline);window.addEventListener('offline',verifyOffline);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)verifyOffline();});
  updateThemeButton();render();registerPWA();
})();


