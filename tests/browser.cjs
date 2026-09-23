/* Exécuter avec Playwright installé et Chromium disponible.
 * Le serveur éphémère teste un sous-répertoire sans modifier les sources livrées. */
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const artifacts=process.env.RADS_TEST_OUTPUT||path.join(root,'test-results');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf'};
let updated=false;
const logs=[];
const done=text=>{logs.push(text);console.log('PASS '+text);};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/site/radiorads/')){res.writeHead(404);res.end();return;}
    const rel=decodeURIComponent(url.pathname.slice('/site/radiorads/'.length))||'index.html';
    const target=path.resolve(root,rel);
    if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    let data=await fs.readFile(target);
    if(updated&&['sw.js','build-info.js'].includes(rel))data=Buffer.from(data.toString().replace(/([a-f0-9]{16})/g,'$1-test'));
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end();}
});
(async()=>{
  await fs.mkdir(artifacts,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/site/radiorads/`;
  const executable=process.env.PLAYWRIGHT_CHROMIUM_PATH || chromium.executablePath();
  try { await fs.access(executable); } catch (_) { console.warn(`Browser test skipped: Chromium executable unavailable at ${executable}`); process.exitCode=0; server.close(); return; }
  const browser=await chromium.launch({headless:true, executablePath:executable});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},permissions:['clipboard-read','clipboard-write'],colorScheme:'light'});
    const page=await context.newPage();
    const errors=[],external=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('request',req=>{if(/^https?:/.test(req.url())&&!req.url().startsWith(base))external.push(req.url());});
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(base);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Disponible hors ligne'));
    assert.equal(await page.locator('.module-card').count(),7);
    assert.equal(await page.evaluate(()=>document.fonts.check('900 14px "Font Awesome 6 Free"')),true);
    await page.screenshot({path:path.join(artifacts,'accueil-clair.png'),fullPage:true});
    done('Accueil, sept modules, ressources locales et cache complet dans un sous-dossier.');
    const cdp=await context.newCDPSession(page);
    const manifest=await cdp.send('Page.getAppManifest');
    assert.equal(manifest.errors.length,0);
    try{const install=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(install.installabilityErrors,[]);done('Manifest et critères d’installabilité Chromium sans erreur.');}catch(e){if(e.code)done('Manifest valide ; contrôle CDP d’installabilité indisponible.');else throw e;}
    await page.click('[data-favorite="pi"]');await page.reload();
    assert.equal(await page.getAttribute('[data-favorite="pi"]','aria-pressed'),'true');
    await page.click('a[href="#favorites"]');assert.equal(await page.locator('.module-card').count(),1);done('Favoris conservés au rechargement.');
    for(const q of ['PI-RADS 4','PIRADS4','BI-RADS 5']){await page.fill('#search',q);assert.equal(await page.locator('.result-card').count(),1);}
    await page.fill('#search','biopsie');assert.ok(await page.locator('.result-card').count()>3);
    await page.fill('#search','xxxinconnu');assert.match(await page.locator('.empty-state').innerText(),/Aucun résultat/);
    await page.fill('#search','<img src=x onerror=alert(1)>');assert.equal(await page.locator('#main img').count(),0);
    await page.fill('#search','PI-RADS 4');await page.click('.result-card');assert.equal(await page.locator('.highlighted').count(),1);done('Recherche exacte, synonymes, résultats vides, échappement HTML et liens directs.');
    await page.fill('#psa','6,5');await page.fill('#volume','50');assert.match(await page.locator('#psa-result').innerText(),/0,130/);
    await page.fill('#volume','0');assert.equal(await page.locator('#add-density').isDisabled(),true);
    await page.fill('#volume','50');await page.click('[data-select="pi-mri-3"]');
    assert.match(await page.inputValue('#report-text'),/Catégorie retenue : 4/);
    await page.fill('#report-text',(await page.inputValue('#report-text'))+'\nCommentaire édité.');
    await page.click('#copy-report');assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Commentaire édité/);
    await page.click('#report-close');await page.click('#add-density');assert.match(await page.inputValue('#report-text'),/Densité du PSA : 0,13/);
    await page.click('#report-close');await page.fill('#psa','6');await page.click('#add-density');assert.equal((await page.inputValue('#report-text')).match(/Densité du PSA/g).length,1);
    const dl=page.waitForEvent('download');await page.click('#download-report');const download=await dl;await download.saveAs(path.join(artifacts,'conclusion-test.txt'));
    assert.match(await fs.readFile(path.join(artifacts,'conclusion-test.txt'),'utf8'),/Densité du PSA : 0,12/);done('Densité, validation, conclusion éditable, copie réelle et export texte.');
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}));
    await page.click('#copy-report');assert.match(await page.locator('#copy-status').innerText(),/Texte sélectionné/);
    assert.equal(await page.evaluate(()=>{const t=document.querySelector('#report-text');return t.selectionEnd-t.selectionStart;}),(await page.inputValue('#report-text')).length);done('Repli presse-papiers avec sélection manuelle.');
    await page.click('#clear-report');await page.fill('#psa','');await page.fill('#volume','');
    await page.click('#theme-toggle');assert.equal(await page.getAttribute('html','data-theme'),'dark');
    await page.screenshot({path:path.join(artifacts,'prostate-sombre.png'),fullPage:true});
    await page.reload();assert.equal(await page.getAttribute('html','data-theme'),'dark');done('Thème sombre persistant.');
    const routes=await page.evaluate(()=>RADS.modules.flatMap(m=>m.variants.map(v=>({hash:'#module/'+m.id+'/'+v.id,rows:v.rows.length}))));
    for(const r of routes){await page.goto(base+r.hash);await page.waitForFunction(n=>document.querySelectorAll('.score-card').length===n,r.rows);assert.equal(await page.locator('.sources a').count()>0,true);}
    done('Les dix parcours affichent leurs catégories, conseils et sources.');
    await context.setOffline(true);await page.reload();await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('guide disponible'));
    await page.fill('#search','biopsie');assert.ok(await page.locator('.result-card').count()>0);await page.fill('#search','');
    done('Rechargement et recherche hors ligne, sans dépendance CDN.');
    await context.setOffline(false);await page.goto(base+'#module/pi/mri');
    await page.click('[data-select="pi-mri-3"]');await page.click('#report-close');
    await page.evaluate(async()=>{const c=await caches.open('unrelated-site-cache');await c.put('/sentinel',new Response('keep'));});
    updated=true;await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await page.waitForSelector('#update-banner:not([hidden])');await page.click('#update-now');
    assert.match(await page.locator('#update-help').innerText(),/sans perte/);assert.match(await page.inputValue('#report-text'),/Catégorie retenue : 4/);
    await page.click('#report-reopen');await page.click('#clear-report');
    await Promise.all([page.waitForEvent('load'),page.click('#update-now')]);
    await page.waitForFunction(()=>globalThis.RADS_BUILD.endsWith('-test'));
    await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Disponible hors ligne'));
    assert.equal(await page.evaluate(async()=>!!await(await caches.open('unrelated-site-cache')).match('/sentinel')),true);
    done('Mise à jour réelle du service worker : brouillon protégé, activation et cache tiers préservé.');
    const activeCaches=await page.evaluate(()=>caches.keys());assert.equal(activeCaches.filter(k=>k.startsWith('radiorads-')).length,1);
    await page.evaluate(async()=>{const key=(await caches.keys()).find(k=>k.startsWith('radiorads-'));await(await caches.open(key)).delete(new URL('data.js',location.href).href);window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Cache incomplet'));
    done('Un cache incomplet n’est jamais annoncé comme disponible hors ligne.');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    await context.close();
    updated=false;
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,colorScheme:'light'});
    const mp=await mobile.newPage();await mp.goto(base);await mp.waitForSelector('.module-card');
    await mp.screenshot({path:path.join(artifacts,'accueil-mobile.png'),fullPage:true});
    assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mp.click('#menu-toggle');assert.equal(await mp.getAttribute('#menu-toggle','aria-expanded'),'true');
    await mp.click('#navigation a[href="#module/li/diagnostic"]');await mp.waitForSelector('.score-card');
    assert.equal(await mp.getAttribute('#menu-toggle','aria-expanded'),'false');
    assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mp.screenshot({path:path.join(artifacts,'foie-mobile.png'),fullPage:true});
    await mp.setViewportSize({width:320,height:720});assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    done('Mobile 390 px et 320 px : navigation, fiches et absence de débordement.');await mobile.close();
    const restricted=await browser.newContext();await restricted.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}));
    const rp=await restricted.newPage();await rp.goto(base);await rp.click('[data-favorite="pi"]');assert.equal(await rp.getAttribute('[data-favorite="pi"]','aria-pressed'),'true');
    await rp.keyboard.press('/');assert.equal(await rp.locator('#search').evaluate(el=>el===document.activeElement),true);
    await rp.keyboard.type('PI-RADS 4');await rp.keyboard.press('Escape');assert.equal(await rp.inputValue('#search'),'');
    done('Stockage bloqué : application utilisable ; raccourcis clavier fonctionnels.');await restricted.close();
    const fileContext=await browser.newContext();const fp=await fileContext.newPage();await fp.goto(require('node:url').pathToFileURL(path.join(root,'index.html')).href);await fp.waitForSelector('.module-card');assert.equal(await fp.locator('.module-card').count(),7);done('Ouverture directe du HTML : guide consultable sans installation PWA.');await fileContext.close();
    await fs.writeFile(path.join(artifacts,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),browser:browser.version(),passed:logs,errors,externalRequests:external},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
