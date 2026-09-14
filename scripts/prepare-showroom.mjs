/** Usage: npm run prepare:showroom -- /path/to/ldraw 42143 [/path/to/source.mpd] */
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
const [library,id,input]=process.argv.slice(2),catalogPath='public/showroom.json';
const catalog=JSON.parse(fs.readFileSync(catalogPath)),car=catalog.find(c=>c.id===id);
if(!library||!car||id==='42096')throw Error('Pass LDraw library directory and additional showroom set ID.');
if(input){if(fs.existsSync(`scripts/source/${id}.mpd`))throw Error('Remove the stale uncompressed source before importing a replacement.');const bytes=fs.readFileSync(input);if(!/^0 FILE /m.test(bytes.toString('utf8')))throw Error('Expected LDraw MPD, not PDF, HTML or a Studio ZIP. Export Studio .io to LDraw first.');fs.writeFileSync(`scripts/source/${id}.mpd.gz`,gzipSync(bytes,{level:9}));}
const run=(script,args=[])=>{const result=spawnSync(process.execPath,['--max-old-space-size=6144','--experimental-strip-types',script,...args],{stdio:'inherit'});if(result.status!==0)throw Error(script+' failed; model not enabled.');};
run('scripts/prepare-model.mjs',[library,id]);run('scripts/prepare-assembly.mjs',[id]);
const previous=fs.readFileSync(catalogPath);car.available=true;fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
try{run('scripts/validate-showroom.mjs')}catch(error){fs.writeFileSync(catalogPath,previous);throw error;}
console.log(`${car.name}: complete geometry and assembly coverage validated.`);
