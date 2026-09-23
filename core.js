/* Fonctions pures, testables sans navigateur. Les données cliniques ne sont pas persistées. */
(function (root) {
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  function matches(query, text) {
    // Une forme compacte unifie PI-RADS, PIRADS et PI RADS, sans imposer les accents.
    const q = normalize(query), target = normalize(text);
    return !q || target.includes(q) || String(query).trim().split(/\s+/).every(token => target.includes(normalize(token)));
  }
  function search(modules, query) {
    const results = [];
    const exact = modules.flatMap(m=>m.variants.flatMap(v=>v.rows.map(r=>({m,v,r})))).filter(({m,r})=>normalize(query)===normalize(m.name+' '+r.score));
    if(exact.length) return exact.map(({m,v,r})=>({kind:'score',module:m,variant:v,row:r,title:m.name+' '+r.score}));
    for (const m of modules) for (const v of m.variants) {
      for (const r of v.rows) {
        const text = [m.name+' '+r.score, m.organ,m.full,v.label,v.version,r.title,r.risk,r.criteria,r.action,/surveillance|suivi|contrôle/i.test(r.action)?'suivi surveillance':'',/cytoponction|tissulaire|prélèvement/i.test(r.action)?'biopsie ponction':''].join(' ');
        if(matches(query,text)) results.push({kind:'score',module:m,variant:v,row:r,title:m.name+' '+r.score});
      }
      for (const s of [...v.sections, {title:'Perles & Pièges',items:v.tips}]) {
        if(matches(query,[m.name,m.organ,v.label,s.title,...s.items].join(' '))) results.push({kind:'note',module:m,variant:v,section:s,title:s.title});
      }
    }
    return results;
  }
  function decimal(value) {
    const text = String(value).trim();
    if(!text) return null;
    if(!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return NaN;
    return Number(text.replace(',','.'));
  }
  function psaDensity(psaValue, volumeValue) {
    const psa=decimal(psaValue), volume=decimal(volumeValue);
    if(psa === null || volume === null) return {ok:false,empty:true,message:'Renseignez le PSA et le volume pour calculer la densité.'};
    if(!Number.isFinite(psa)||!Number.isFinite(volume)||psa<0||volume<=0) return {ok:false,message:'PSA ≥ 0 et volume strictement positif requis. Utilisez une virgule ou un point décimal.'};
    const value=psa/volume;
    if(!Number.isFinite(value)) return {ok:false,message:'Valeurs trop extrêmes pour un calcul fiable.'};
    return {ok:true,value,psa,volume,message:'La densité complète le contexte clinique ; elle ne modifie pas PI-RADS.'};
  }
  function conclusion(m,v,r) {
    return `CONCLUSION — ${m.name} (${v.version}, ${v.label})\nCatégorie retenue : ${r.score} — ${r.title}.\nAppréciation : ${r.risk}.\nOrientation à adapter au contexte : ${r.action}`;
  }
  root.RADSCore = {normalize,matches,search,decimal,psaDensity,conclusion};
  if(typeof module!=='undefined') module.exports = root.RADSCore;
})(globalThis);
