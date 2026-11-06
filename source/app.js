import {setupViewerGestures} from './viewer-gestures.js';
import {setupTactile} from './tactile.js?v=bell-2';
import {parts as parts02,parts01,back01,back02,bellFront,bellBack} from './parts.js?v=fitted-2';
let parts=parts01;
function partSets(){const id=models[current].id;return id==='duk002457'?{front:bellFront,back:bellBack}:id==='duk003312'?{front:parts01,back:back01}:{front:parts02,back:back02};}
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {PLYLoader} from 'three/addons/loaders/PLYLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const $=s=>document.querySelector(s), models=await fetch('./models.json',{cache:'no-store'}).then(r=>r.json());
models.forEach((m,i)=>{const option=document.createElement('option');option.value=i;option.textContent=m.number+' · '+m.subtitle;$('#model-select').append(option)});
$('#model-select').onchange=e=>load(+e.target.value);
const originalMode=new URLSearchParams(location.search).get('quality')==='original';
const scene=new THREE.Scene();scene.background=new THREE.Color('#100f0d');scene.fog=new THREE.Fog('#100f0d',10,25);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=2;$('#stage').append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.01,100);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enableRotate=false;controls.enablePan=false;controls.dampingFactor=.065;controls.minDistance=.55;controls.maxDistance=9;controls.maxPolarAngle=Math.PI*.91;controls.autoRotateSpeed=.45;
const env=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();scene.environmentIntensity=.5;
const ambient=new THREE.HemisphereLight('#ded7ca','#29211a',.65);scene.add(ambient);
function spot(color,intensity,pos,size){const l=new THREE.SpotLight(color,intensity,0,.65,.65,2);l.position.set(...pos);l.target.position.set(0,1.1,0);l.castShadow=true;l.shadow.mapSize.set(size,size);l.shadow.bias=-.0002;l.shadow.normalBias=.012;scene.add(l,l.target);return l;}
const key=spot('#ffe6bc',65,[-3,5,4],2048),fill=spot('#cedcf3',28,[3,3,2],1024),rim=spot('#ffe1b0',42,[1.5,4,-3],1024);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#191713',roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-.12;floor.receiveShadow=true;scene.add(floor);
const plinth=new THREE.Mesh(new THREE.CylinderGeometry(.83,.86,.16,96),new THREE.MeshStandardMaterial({color:'#292722',roughness:.72,metalness:.15}));plinth.position.y=-.04;plinth.receiveShadow=true;plinth.castShadow=true;scene.add(plinth);
let root=null,token=0,current=0,transition=null,tactile=null;
let renderFrame=0,lastRenderTime=0,hiddenAt=0;
const mobileRendering=matchMedia('(pointer:coarse), (max-width:700px)');
function requestRender(){
 if(!renderFrame&&!document.hidden&&!tactile?.isActive())renderFrame=requestAnimationFrame(drawFrame);
}
function stopRendering(){cancelAnimationFrame(renderFrame);renderFrame=0;lastRenderTime=0;}
controls.addEventListener('change',requestRender);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){hiddenAt=performance.now();stopRendering();}
 else{if(transition&&hiddenAt)transition.start+=performance.now()-hiddenAt;hiddenAt=0;requestRender();}
});
addEventListener('pagehide',stopRendering);
addEventListener('pageshow',requestRender);
const texLoader=new THREE.TextureLoader();
function resize(){const {width,height}=$('#stage').getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender()}addEventListener('resize',resize);new ResizeObserver(resize).observe($('#stage'));resize();
function view(type,instant=false){requestRender();stopAutoRotation();const scale=matchMedia('(max-width: 700px) and (orientation: portrait)').matches?.85:1;const target=new THREE.Vector3(0,type==='face'?1.98:type==='detail'?.65:1.05,0);const positions={front:[0,1.3,6.1*scale],side:[6.1*scale,1.4,0],back:[0,1.35,-6.1*scale],detail:[.3,.95,2.2],face:[.05,2.03,1.35]};const p=new THREE.Vector3(...positions[type]);if(instant){camera.position.copy(p);controls.target.copy(target);controls.update()}else {const center=new THREE.Vector3(0,1.05,0);const orbitFrom=new THREE.Spherical().setFromVector3(camera.position.clone().sub(center));const orbitTo=new THREE.Spherical().setFromVector3(p.clone().sub(center));let angle=THREE.MathUtils.euclideanModulo(orbitTo.theta-orbitFrom.theta+Math.PI,Math.PI*2)-Math.PI;if(Math.abs(angle+Math.PI)<1e-6)angle=Math.PI;orbitTo.theta=orbitFrom.theta+angle;transition={from:camera.position.clone(),to:p,start:performance.now(),targetFrom:controls.target.clone(),targetTo:target,center,orbitFrom,orbitTo,duration:Math.max(850,Math.abs(angle)/Math.PI*1600)};}}
controls.addEventListener('start',()=>transition=null);
function surface(){const mode='original';root?.traverse(o=>{if(o.isMesh){const m=o.material;m.map=mode==='original'?o.userData.map:null;m.normalMap=mode==='original'?o.userData.normal:null;m.vertexColors=mode==='original'&&o.userData.vertexColors;m.color.set(mode==='original'?(o.userData.map||o.userData.vertexColors?'#ffffff':'#9c8563'):'#a8a5a0');m.metalness=mode==='original'?.55:0;m.roughness=mode==='original'?.54:.85;m.wireframe=mode==='wire';m.needsUpdate=true}})}
async function load(i){const seq=++token;transition=null;if('speechSynthesis' in window)speechSynthesis.cancel();const data={...models[i]};if(!originalMode&&data.optimized){Object.assign(data,data.optimized);}$('#status').hidden=false;$('#status').textContent='잠시, 천년의 사유를 마주할 준비를 합니다…';document.querySelectorAll('#collection button').forEach((b,j)=>b.classList.toggle('active',i===j));try{
 const [obj,map,normal]=await Promise.all([data.type==='glb'?new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(data.src).then(g=>g.scene):data.type==='obj'?new OBJLoader().loadAsync(data.src):new PLYLoader().loadAsync(data.src).then(g=>{g.computeVertexNormals();return new THREE.Mesh(g)}),data.texture?texLoader.loadAsync(data.texture):null,data.normal?texLoader.loadAsync(data.normal):null]);if(seq!==token)return;
 if(map){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=renderer.capabilities.getMaxAnisotropy()}if(normal)normal.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const group=new THREE.Group();group.add(obj);obj.rotation.x=data.rotationX??-Math.PI/2;group.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());group.scale.setScalar(2.25/size.y);group.updateMatrixWorld(true);box.setFromObject(group);const c=box.getCenter(new THREE.Vector3());group.position.set(-c.x,.045-box.min.y,-c.z);
 let triangles=0;obj.traverse(o=>{if(!o.isMesh)return;const hasColors=!!o.geometry.attributes.color;o.material=new THREE.MeshStandardMaterial({map,normalMap:normal,normalScale:new THREE.Vector2(1,1),color:map||hasColors?'#ffffff':'#9c8563',metalness:.55,roughness:.54,vertexColors:hasColors,side:THREE.DoubleSide});o.userData={map,normal,vertexColors:hasColors};o.castShadow=true;o.receiveShadow=true;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
 if(root){scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();o.userData.map?.dispose();o.userData.normal?.dispose()}})}root=group;current=i;partSide='front';parts=partSets().front;selectedPart=-1;partButtons.forEach(({b,list,backList})=>{b.classList.remove('selected');[list,backList].forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','false')});scene.add(root);surface();view('front',true);setupParts();
 $('#object-number').textContent='COLLECTION '+(data.number||String(i+1).padStart(2,'0'));$('#object-title').textContent=data.name;$('#object-subtitle').textContent=data.subtitle;$('#surface-note').textContent=data.texture?(!originalMode&&data.optimized?'국립중앙박물관 · 색상·노멀맵 최적화':'국립중앙박물관 원본 색상·노멀맵'):'국립중앙박물관 스캔 형상 · 전시용 재질';$('#model-info').textContent=Math.round(triangles).toLocaleString()+' triangles · '+data.sizeLabel;$('#source').href=data.source;$('#download').href=data.zip;document.querySelector('.intro h1').innerHTML=data.id==='duk002457'?'천년의 울림,<br>빛으로 마주하다.':'천년의 미소,<br>빛으로 마주하다.';document.querySelector('.description').innerHTML=data.id==='duk002457'?'천천히 돌려보고, 가까이 다가가세요.<br>갈고리의 곡선부터 방울의 부조까지.':'천천히 돌려보고, 가까이 다가가세요.<br>옷자락의 굴곡부터 손끝의 고요까지.';document.querySelector('[data-view=face]').textContent=data.id==='duk002457'?'오고 확대':'얼굴 확대';document.querySelector('[data-view=detail]').textContent=data.id==='duk002457'?'부조 확대':'주름 확대';$('#status').hidden=true;
 }catch(e){$('#status').textContent='불러오지 못했습니다. 다른 유물을 선택하거나 새로고침해 주세요.';console.error(e)}}
function stopAutoRotation(){controls.autoRotate=false;$('#rotate').classList.remove('active');$('#rotate').setAttribute('aria-pressed','false');}
function rotationText(angle){return angle===0?'정면 0도':`${angle<0?'왼쪽':'오른쪽'} ${Math.abs(angle)}도${Math.abs(angle)===180?' 후면':''}`;}
function showRotation(angle){const text=rotationText(angle);$('#rotation').value=angle;$('#rotation').setAttribute('aria-valuetext',text);$('#rotation-value').value=text.replace('도','°');}
$('#rotation').onfocus=stopAutoRotation;
$('#rotation').oninput=e=>{transition=null;stopAutoRotation();const angle=+e.target.value;const offset=camera.position.clone().sub(controls.target);const radius=Math.hypot(offset.x,offset.z);const radians=THREE.MathUtils.degToRad(angle);camera.position.set(controls.target.x+radius*Math.sin(radians),camera.position.y,controls.target.z+radius*Math.cos(radians));controls.update();showRotation(angle);};
$('#rotation').onkeydown=e=>{if(e.key==='Home'||e.key==='End'){e.preventDefault();e.currentTarget.value=e.key==='Home'?-180:180;e.currentTarget.dispatchEvent(new Event('input',{bubbles:true}));}};
function syncRotation(){const offset=camera.position.clone().sub(controls.target);const angle=Math.round(THREE.MathUtils.radToDeg(Math.atan2(offset.x,offset.z))/5)*5;if(+$('#rotation').value!==angle)showRotation(angle);}

function zoomBaseDistance(){const scale=matchMedia('(max-width:700px) and (orientation:portrait)').matches?.85:1;return Math.hypot(6.1*scale,.25);}
function zoomLimits(){const base=zoomBaseDistance();return {min:Math.ceil(base/controls.maxDistance*100),max:Math.floor(base/controls.minDistance*100)};}
function showZoom(value){$('#zoom-value').value=value+'%';const limits=zoomLimits();$('#zoom-out').disabled=value<=limits.min;$('#zoom-in').disabled=value>=limits.max;}
function syncZoom(){const limits=zoomLimits();const value=Math.max(limits.min,Math.min(limits.max,Math.round(zoomBaseDistance()/camera.position.distanceTo(controls.target)*100)));if($('#zoom-value').value!==value+'%')showZoom(value);}
function changeZoom(factor,announce=false){if(!root)return;transition=null;stopAutoRotation();const limits=zoomLimits();const current=zoomBaseDistance()/camera.position.distanceTo(controls.target)*100;const value=Math.max(limits.min,Math.min(limits.max,Math.round(current*factor)));const offset=camera.position.clone().sub(controls.target).normalize();camera.position.copy(controls.target).addScaledVector(offset,zoomBaseDistance()*100/value);controls.update();showZoom(value);$('#zoom-announcement').textContent=`현재 배율 ${value}퍼센트`;if(announce)sayControl(`현재 배율 ${value}퍼센트`);}
$('#zoom-out').onclick=e=>changeZoom(1/1.1,e.detail>0);
$('#zoom-in').onclick=e=>changeZoom(1.1,e.detail>0);
let moveCount=0;
document.querySelectorAll('[data-move]').forEach(button=>button.onclick=()=>{
 if(!root)return;
 transition=null;stopAutoRotation();
 const direction=button.dataset.move;
 const delta=new THREE.Vector3();
 if(direction==='center'){
  delta.copy(new THREE.Vector3(0,1.05,0)).sub(controls.target);
 }else{
  camera.updateMatrixWorld();
  const distance=camera.position.distanceTo(controls.target);
  const screenHeight=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const horizontal=direction==='left'||direction==='right';
  const amount=screenHeight*(horizontal?camera.aspect:1)*.08;
  // Move camera and target opposite to the requested artwork movement.
  delta.setFromMatrixColumn(camera.matrixWorld,horizontal?0:1).multiplyScalar((direction==='left'||direction==='down'?1:-1)*amount);
 }
 camera.position.add(delta);controls.target.add(delta);controls.update();
 const names={left:'왼쪽',right:'오른쪽',up:'위쪽',down:'아래쪽',center:'가운데'};
 $('#move-status').textContent=`작품을 ${names[direction]}${direction==='center'?'로':'으로'} 이동했습니다. 배율과 방향은 유지됩니다. 이동 ${++moveCount}회.`;
});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('#reset').onclick=()=>view('front');$('#rotate').onclick=()=>{requestRender();controls.autoRotate=!controls.autoRotate;$('#rotate').classList.toggle('active',controls.autoRotate);$('#rotate').setAttribute('aria-pressed',controls.autoRotate)};
$('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
function drawFrame(now){
 renderFrame=0;
 if(document.hidden||tactile?.isActive())return;
 if(mobileRendering.matches&&lastRenderTime&&now-lastRenderTime<1000/30-0.5){requestRender();return;}
 const delta=lastRenderTime?Math.min((now-lastRenderTime)/1000,.1):1/60;lastRenderTime=now;
if(transition){const t=Math.min(1,(performance.now()-transition.start)/(transition.duration||850)),s=t*t*(3-2*t);if(transition.orbitFrom){const a=transition.orbitFrom,b=transition.orbitTo;camera.position.setFromSpherical(new THREE.Spherical(THREE.MathUtils.lerp(a.radius,b.radius,s),THREE.MathUtils.lerp(a.phi,b.phi,s),THREE.MathUtils.lerp(a.theta,b.theta,s))).add(transition.center);}else camera.position.lerpVectors(transition.from,transition.to,s);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,s);if(t===1){const done=transition.onComplete;transition=null;done?.();}}const changed=controls.update(delta);syncRotation();syncZoom();updateParts();renderer.render(scene,camera);
 if(transition||controls.autoRotate||changed)requestRender();
 else if(!renderFrame)lastRenderTime=0;
}
load(0);

$('#toggle-controls').onclick=()=>{const expanded=$('.panel').classList.toggle('expanded');$('#toggle-controls').setAttribute('aria-expanded',expanded);$('#toggle-controls').setAttribute('aria-label',expanded?'컨트롤 접기':'컨트롤 펼치기');$('#toggle-controls span').textContent=expanded?'⌄':'⌃';};

let selectedPart=-1,showParts=true,partSide='front';
const overlay=document.createElement('div');overlay.className='part-overlay';$('#stage').append(overlay);
const cast=new THREE.Raycaster();
const partButtons=parts.map((part,i)=>{
 const b=document.createElement('button');b.className='part-region';b.setAttribute('aria-label',`${i+1}. ${part.name}`);b.innerHTML=`<span>${i+1}</span><strong class="part-name" aria-hidden="true">${i+1}. ${part.name}</strong>`;b.onclick=()=>selectPart(i);overlay.append(b);
 const list=document.createElement('button');list.textContent=String(i+1);list.setAttribute('aria-label',`${i+1}. ${part.name}`);list.onclick=()=>selectSidePart(i,'front');$('#part-list').append(list);const backList=document.createElement('button');backList.textContent=String(i+1);backList.onclick=()=>selectSidePart(i,'back');$('#back-part-list').append(backList);
 const connector=document.createElement('div');connector.className='part-connector';overlay.append(connector);return {b,list,backList,connector,point:new THREE.Vector3(part.p[0],part.p[1],.2)};
});
function setupParts(){scene.updateMatrixWorld(true);const sign=partSide==='back'?-1:1;$('.part-heading span').textContent='부위 도슨트';$('#part-list').closest('.part-row').hidden=partSide!=='front';$('#back-part-list').closest('.part-row').hidden=partSide!=='back';partButtons.forEach(({point,b,list,backList},i)=>{const part=parts[i];b.setAttribute('aria-label',`${i+1}. ${part.name}`);const sets=partSets();list.setAttribute('aria-label',`정면 ${i+1}. ${sets.front[i].name}`);backList.setAttribute('aria-label',`후면 ${i+1}. ${sets.back[i].name}`);b.querySelector('.part-name').textContent=`${i+1}. ${part.name}`;point.set(part.p[0],part.p[1],sign*.2);cast.set(new THREE.Vector3(part.p[0],part.p[1],sign*4),new THREE.Vector3(0,0,-sign));const hit=cast.intersectObject(root,true)[0];if(hit)point.copy(hit.point).add(new THREE.Vector3(0,0,sign*.012));});}
function updatePartSide(){const direction=camera.position.clone().sub(controls.target).normalize().z;const side=direction<-.25?'back':direction>.25?'front':partSide;if(side===partSide)return;partSide=side;const sets=partSets();parts=sets[side];selectedPart=-1;clearPreview();if('speechSynthesis' in window)speechSynthesis.cancel();partButtons.forEach(({b,list,backList})=>{b.classList.remove('selected');[list,backList].forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','false')});setupParts();}
function updateParts(){
 if(!root)return;updatePartSide();
 const rect=renderer.domElement.getBoundingClientRect();
 const mobile=matchMedia('(max-width:700px) and (orientation:portrait)').matches;
 const bottom=Math.min(rect.height-20,$('.panel').getBoundingClientRect().top-rect.top-20);
 let previousY=8;
 partButtons.forEach(({b,point,connector},i)=>{
  const q=point.clone().project(camera);
  const facing=partSide==='back'?camera.position.z<point.z-.12:camera.position.z>point.z+.12;
  const visible=showParts&&facing&&q.z>-1&&q.z<1&&Math.abs(q.x)<1.2&&Math.abs(q.y)<1.2;
  b.hidden=!visible;connector.hidden=!visible||!mobile;if(!visible)return;
  // Project the complete region, rather than a single diagonal corner.
  // This keeps its center and extents consistent under perspective and orbit.
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let step=0;step<32;step++){
   const angle=step/32*Math.PI*2;
   const edge=point.clone().add(new THREE.Vector3(Math.cos(angle)*parts[i].r[0],Math.sin(angle)*parts[i].r[1],0)).project(camera);
   const px=(edge.x+1)/2*rect.width,py=(1-edge.y)/2*rect.height;
   minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
  }
  const x=(minX+maxX)/2,y=(minY+maxY)/2;
  const w=Math.max(20,maxX-minX),h=Math.max(20,maxY-minY);
  b.style.left=x+'px';b.style.top=y+'px';b.style.width=w+'px';b.style.height=h+'px';
  const label=b.querySelector('.part-name');
  if(mobile){
   const labelY=Math.max(previousY,Math.min(y-12,bottom-(6-i)*30));previousY=labelY+30;
   label.style.left=(10-(x-w/2))+'px';label.style.top=(labelY-(y-h/2))+'px';
   const startX=104,startY=labelY+12,endX=Math.max(startX,x-w/2),endY=y;
   connector.style.left=startX+'px';connector.style.top=startY+'px';
   connector.style.width=Math.hypot(endX-startX,endY-startY)+'px';
   connector.style.transform=`rotate(${Math.atan2(endY-startY,endX-startX)}rad)`;
  }else{label.style.removeProperty('left');label.style.removeProperty('top');}
 });
}
function selectSidePart(i,side){if(!root)return;if(side===partSide){selectPart(i);return;}view(side==='back'?'back':'front');transition.onComplete=()=>{partSide=side;const sets=partSets();parts=sets[side];setupParts();selectPart(i);};}
function selectPart(i){if(!root)return;if(matchMedia('(max-width:700px) and (orientation:portrait)').matches){$('.panel').classList.add('expanded');$('#toggle-controls').setAttribute('aria-expanded','true');$('#toggle-controls').setAttribute('aria-label','컨트롤 접기');$('#toggle-controls span').textContent='⌄';}selectedPart=i;const p=parts[i];if('speechSynthesis' in window)speechSynthesis.cancel();controls.autoRotate=false;$('#rotate').classList.remove('active');$('#rotate').setAttribute('aria-pressed','false');partButtons.forEach(({b,list,backList},j)=>{b.classList.toggle('selected',j===i);b.setAttribute('aria-pressed',j===i);[list,backList].forEach((x,k)=>{const active=j===i&&(k===0?partSide==='front':partSide==='back');x.classList.toggle('active',active);x.setAttribute('aria-pressed',active)})});(partSide==='front'?partButtons[i].list:partButtons[i].backList).scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});speakPart(i);focusPart(i);}
function speakPart(i){
 if(!('speechSynthesis' in window))return;
 const utterance=new SpeechSynthesisUtterance(parts[i].text);
 utterance.lang='ko-KR';utterance.rate=.92;
 const koreanVoice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ko'));
 if(koreanVoice)utterance.voice=koreanVoice;
 speechSynthesis.speak(utterance);
}
addEventListener('pagehide',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();});


function focusPart(i){
 requestRender();
 const point=partButtons[i].point.clone();
 const radius=parts[i].r;
 const distance=Math.max(.8,Math.max(radius[1]*2.8,radius[0]*2.8/camera.aspect)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
 const target=point.clone();
 // Lift the selected region above the floating tools on portrait screens.
 if(matchMedia('(max-width:700px) and (orientation:portrait)').matches){
  const stageRect=renderer.domElement.getBoundingClientRect();
  const panelTop=$('.panel').getBoundingClientRect().top;
  const available=Math.max(120,panelTop-stageRect.top);
  const centerY=Math.min(stageRect.height*.5,available*.5);
  const ndcY=1-2*centerY/stageRect.height;
  target.y-=ndcY*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 }
 transition={from:camera.position.clone(),to:target.clone().add(new THREE.Vector3(0,0,partSide==='back'?-distance:distance)),start:performance.now(),targetFrom:controls.target.clone(),targetTo:target};
}

// Pointer users preview a control before activating it; keyboard and AT retain native activation.
let previewButton=null, pointerAnnouncement=false, rotationVoiceTimer=null;
function sayControl(text,{interrupt=true}={}){
 if(!('speechSynthesis' in window))return;
 if(interrupt)speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=.95;
 const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ko'));
 if(voice)utterance.voice=voice;speechSynthesis.speak(utterance);
}
function clearPreview(){previewButton?.classList.remove('preview-focus');previewButton=null;}
function controlName(button){return button.getAttribute('aria-label')||button.textContent.trim();}
document.addEventListener('pointerdown',e=>{
 pointerAnnouncement=true;
 if(!e.target.closest('button'))clearPreview();
},true);
document.addEventListener('keydown',e=>{pointerAnnouncement=false;if(e.target.id!=='feel-exit'||!['Enter',' '].includes(e.key))clearPreview();},true);
document.addEventListener('focusin',e=>{if(previewButton&&e.target!==previewButton)clearPreview();});
document.addEventListener('click',e=>{
 const button=e.target.closest('.panel button,.part-docent button,.part-region,#fullscreen,#feel-exit');
 if(!button||button.disabled)return;
 // Synthetic activation (keyboard/screen reader) must not require another double tap.
 if(e.detail===0&&button.id!=='feel-exit'){clearPreview();return;}
 if(previewButton!==button){
  clearPreview();previewButton=button;button.classList.add('preview-focus');button.focus({preventScroll:true});
  e.preventDefault();e.stopImmediatePropagation();
  const value=button.id.startsWith('zoom-')?` 현재 배율 ${$('#zoom-value').value.replace('%','퍼센트')}.`:'';
  sayControl(`${controlName(button)}.${value} 한 번 더 누르면 실행합니다.`);
  return;
 }
 clearPreview();
 // Zoom announces its computed value inside its handler, after applying it.
 if(button.id.startsWith('zoom-')||button.id==='feel-artifact')return;
 // A new task runs after all click handlers have completed.
 setTimeout(()=>{
  if(button.closest('.part-number-list')||button.classList.contains('part-region'))return;
  if(button.id==='rotate')sayControl(`자동 회전 ${controls.autoRotate?'시작':'정지'}`);
  else if(button.dataset.move)sayControl($('#move-status').textContent);
  else sayControl(`${controlName(button)} 실행`);
 });
},true);
$('#rotation').addEventListener('input',()=>{
 clearTimeout(rotationVoiceTimer);
 if(pointerAnnouncement)rotationVoiceTimer=setTimeout(()=>sayControl(rotationText(+$('#rotation').value)),350);
});
$('#rotation').addEventListener('pointerdown',()=>{
 clearTimeout(rotationVoiceTimer);sayControl(`좌우 회전. ${rotationText(+$('#rotation').value)}`);
});
addEventListener('pagehide',()=>clearTimeout(rotationVoiceTimer));

// Fit the complete artifact while preserving the viewing direction.
function fitTactileView(){
 if(!root)return;
 const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3());
 const direction=camera.position.clone().sub(controls.target).normalize();
 camera.updateMatrixWorld();
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
 const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
 let distance=0;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const offset=new THREE.Vector3(x,y,z).sub(center),depth=offset.dot(direction);
  distance=Math.max(distance,depth+Math.abs(offset.dot(right))*1.12/tanH,depth+Math.abs(offset.dot(up))*1.12/tanV);
 }
 controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance*1.28);
 controls.update();syncZoom();syncRotation();renderer.render(scene,camera);
}

tactile=setupTactile({renderer,camera,speak:sayControl,renderScene:()=>renderer.render(scene,camera),getRoot:()=>root,getLandmarks:()=>{const sets=partSets();return [{side:'front',sign:1,items:sets.front},{side:'back',sign:-1,items:sets.back}];},freeze:()=>{stopRendering();transition=null;stopAutoRotation();fitTactileView();controls.enabled=false;clearTimeout(rotationVoiceTimer);if('speechSynthesis' in window)speechSynthesis.cancel();},restore:()=>{controls.enabled=true;requestRender();}});

setupViewerGestures({stage:$('#stage'),camera,controls,onStart:()=>{transition=null;stopAutoRotation();},onChange:()=>{clearPreview();syncZoom();syncRotation();requestRender();}});
$('#viewer-home').onclick=()=>{transition=null;view('front',true);syncZoom();syncRotation();sayControl('작품을 원위치로 복원했습니다.');};
