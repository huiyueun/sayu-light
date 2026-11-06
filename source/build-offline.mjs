import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const source=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(source);
const out=path.resolve(process.argv[2]||path.join(root,'delivery/sayu-light-offline'));
const models=JSON.parse(await fs.readFile(path.join(root,'models.json'),'utf8'));
for(const m of models)for(const k of ['src','texture','normal']){
 const bytes=await fs.readFile(path.join(root,m[k]));
 m[k]='data:'+(k==='src'?'model/gltf-binary':'image/webp')+';base64,'+bytes.toString('base64');
}
const entry=(await fs.readFile(path.join(source,'app.js'),'utf8')).replace("await fetch('./models.json',{cache:'no-store'}).then(r=>r.json())","window.__embeddedModels");
if(entry.includes("fetch('./models.json'"))throw new Error('Offline entry replacement failed');
const result=await build({stdin:{contents:entry,resolveDir:source,sourcefile:'offline-entry.js'},bundle:true,write:false,format:'esm',target:'es2022',minify:true});
const css=(await fs.readFile(path.join(root,'style.css'),'utf8')).replace(/@import[^;]+;/g,'');
let html=await fs.readFile(path.join(root,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="style\.css[^\"]*">/,()=>'<style>'+css+'</style>')
 .replace(/<script type="module" src="viewer\.js[^\"]*"><\/script>/,()=>'<script>window.__embeddedModels='+JSON.stringify(models)+';</script><script type="module">'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>')
 .replace('class="brand" href="./"','class="brand" href="#"');
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'index.html'),html);
for(const f of ['SOURCES.txt','THIRD_PARTY_LICENSES.txt'])await fs.copyFile(path.join(root,f),path.join(out,f));
await fs.writeFile(path.join(out,'실행 안내.txt'),`사유의 빛 · 교수님 전달용\n\n1. ZIP 압축을 모두 풀어 주세요.\n2. index.html을 Chrome 또는 Edge에서 열어 주세요.\nPython, Node.js, 로컬 서버 설치 없이 실행합니다. 세 작품의 모델과 텍스처가 HTML에 포함되어 있습니다.\n\n한 손가락 드래그: 이동\n두 손가락 벌리기/오므리기: 확대/축소\n두 손가락 드래그: 회전\n오른쪽 원위치 아이콘: 위치·회전·배율 초기화\n손끝으로 느끼기: 현재 시점의 윤곽과 내부 핫스폿을 탐색합니다. 명칭 안내 후 같은 지점을 다시 터치하면 해설이 나옵니다.\n\n음성은 기기의 한국어 TTS를 사용하며, 기기·브라우저에 따라 지원이 다릅니다. 진동도 지원 기기에서만 동작합니다.\n모바일은 파일 미리보기 대신 아래 공개 사이트를 외부 브라우저에서 이용하는 것이 편리합니다.\nhttps://huiyueun.github.io/sayu-light/\n\n작품 출처와 가공 내역: SOURCES.txt\n라이브러리 라이선스: THIRD_PARTY_LICENSES.txt\n댄스·리듬 기능은 포함하지 않습니다.\n`);
console.log(JSON.stringify({out,htmlBytes:Buffer.byteLength(html),artworks:models.length}));
