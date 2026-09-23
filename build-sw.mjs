// Reconstruire le cache après TOUTE modification d'un fichier livré.
// L'empreinte des octets donne une nouvelle version sans changement manuel de numéro.
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const base=path.dirname(fileURLToPath(import.meta.url));
async function walk(dir){let out=[];for(const ent of await readdir(path.join(base,dir),{withFileTypes:true})){const p=dir+'/'+ent.name;out.push(...(ent.isDirectory()?await walk(p):[p]));}return out;}
const files=['index.html','styles.css','theme.js','data.js','core.js','app.js','manifest.webmanifest',...await walk('assets')].filter(f=>!f.endsWith('.md')&&!f.endsWith('.txt')).sort();
const template=await readFile(path.join(base,'sw.template.js'),'utf8');
const hash=createHash('sha256');hash.update(template);
for(const file of files)hash.update(file).update(await readFile(path.join(base,file)));
const version=hash.digest('hex').slice(0,16);
await writeFile(path.join(base,'build-info.js'),`/* Généré par build-sw.mjs. */\nglobalThis.RADS_BUILD = '${version}';\n`);
await writeFile(path.join(base,'sw.js'),template.replace('__VERSION__',version).replace('__FILES__',JSON.stringify([...files,'build-info.js'])));
console.log(`Cache ${version} : ${files.length+1} ressources.`);
