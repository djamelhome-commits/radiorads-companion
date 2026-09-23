const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
require('../data.js');
const modules=globalThis.RADS.modules;
test('les sept modules et les dix parcours ont des références et des identifiants uniques',()=>{
  assert.equal(modules.length,7);assert.equal(modules.flatMap(m=>m.variants).length,10);
  const ids=new Set();
  for(const m of modules)for(const v of m.variants){
    assert.ok(v.sources.length && v.population && v.version && v.reviewed);
    for(const s of v.sources)assert.equal(new URL(s.url).protocol,'https:');
    for(const r of v.rows){assert.ok(r.score&&r.criteria&&r.action&&r.risk);assert.ok(!ids.has(r.id));ids.add(r.id);}
  }
});
test('recherche des scores exacte, variantes orthographiques et accents',()=>{
  for(const q of ['PI-RADS 4','pirads4','PI RADS 4']){
    const hits=C.search(modules,q);assert.equal(hits.length,1);assert.equal(hits[0].row.score,'4');assert.equal(hits[0].module.id,'pi');
  }
  assert.equal(C.search(modules,'BI-RADS 5')[0].row.score,'5');
  assert.ok(C.search(modules,'biopsie').some(r=>r.module.id==='bi'));
  assert.ok(C.search(modules,'verre depoli').some(r=>r.module.id==='lung'));
  assert.deepEqual(C.search(modules,'motinexistantxyz'),[]);
});
test('densité du PSA indépendante : virgule, zéro et valeurs invalides',()=>{
  assert.equal(C.psaDensity('6,5','50').value,.13);
  assert.equal(C.psaDensity('6','40').value,.15);
  assert.equal(C.psaDensity('0','50').value,0);
  assert.equal(C.psaDensity(' 3.2 ','32').value,.1);
  for(const pair of [['','50'],['6',''],['6','0'],['-2','40'],['3foo','20'],['Infinity','30'],['1e3','10'],['1,2.3','30']])assert.equal(C.psaDensity(...pair).ok,false);
});
test('conclusions sans mesures ni constatations imaginées',()=>{
  const m=modules.find(m=>m.id==='pi'),v=m.variants[0],r=v.rows[3];
  const text=C.conclusion(m,v,r);
  assert.match(text,/Catégorie retenue : 4/);
  assert.doesNotMatch(text,/PSA :|Volume :|localisation :|absence d’extension|15 mm/);
});
test('distinction des référentiels et seuils critiques',()=>{
  const get=(m,v=0)=>modules.find(x=>x.id===m).variants[v];
  assert.equal(get('bi').rows.filter(r=>r.score==='0').length,2);
  assert.ok(get('li',1).rows.some(r=>r.score==='LR-TR Equivocal'));
  assert.ok(!get('li',1).rows.some(r=>r.score==='LR-TR Nonprogressing'));
  assert.ok(get('li',2).rows.some(r=>r.score==='LR-TR Nonprogressing'));
  assert.ok(!get('li',2).rows.some(r=>r.score==='LR-TR Equivocal'));
  assert.match(get('ti').rows.find(r=>r.score==='TR3').action,/≥ 25 mm/);
  assert.match(get('ti').rows.find(r=>r.score==='TR4').action,/≥ 15 mm/);
  assert.match(get('ti').rows.find(r=>r.score==='TR5').action,/≥ 10 mm/);
  assert.notEqual(get('o',0).rows[4].risk,get('o',1).rows[4].risk);
  assert.match(get('cad').rows.find(r=>r.score==='4B').criteria,/≥ 50 %/);
});
