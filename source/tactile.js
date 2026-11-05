import {createTactileSound} from './tactile-sound.js?v=bell-2';
import * as THREE from 'three';
export function setupTactile({renderer,camera,getRoot,getLandmarks=()=>[],freeze,restore,renderScene,speak}){
 const entry=document.querySelector('#feel-artifact'),exit=document.querySelector('#feel-exit');
 const status=document.querySelector('#feel-status'),support=document.querySelector('#feel-support');
 const canvas=document.querySelector('#feel-canvas'),ctx=canvas.getContext('2d');
 let active=false,mask=null,width=0,height=0,pointer=null,inside=false,timer=null,generation=0;
 const loading=document.querySelector('#feel-loading');
 let hotspots=[],baseImage=null,nearest=null,arrived=null,selected=null,gesture=0,namedGesture=-1,cueTimer=null,speechTimer=null,lastContact=null;
 const ray=new THREE.Raycaster();
 function clearCue(){clearTimeout(cueTimer);cueTimer=null;}
 function clearSpeech(){clearTimeout(speechTimer);speechTimer=null;}
 function draw(){
  if(!baseImage)return;ctx.putImageData(baseImage,0,0);
  hotspots.forEach((h,i)=>{
   const current=h===nearest,found=h===arrived;
   ctx.beginPath();ctx.arc(h.x,h.y,h.radius,0,Math.PI*2);
   ctx.fillStyle=found?'#f5d894bb':current?'#cbb47766':'#cbb47722';ctx.fill();
   ctx.strokeStyle=found?'#fff1c6':current?'#f1d18b':'#cdb57d';ctx.lineWidth=current?2.5:1.5;ctx.stroke();
   ctx.fillStyle='#fff1cf';ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),h.x,h.y);
  });
 }
 function projectHotspots(root){
  root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const result=[];
  for(const group of getLandmarks())for(const [i,part] of group.items.entries()){
   // Fit each anatomical landmark to the original front/back surface, then
   // reject landmarks hidden by another surface from the actual camera.
   ray.set(new THREE.Vector3(part.p[0],part.p[1],group.sign*4),new THREE.Vector3(0,0,-group.sign));
   const surface=ray.intersectObject(root,true)[0];if(!surface)continue;
   const point=surface.point,delta=point.clone().sub(camera.position),distance=delta.length();
   ray.set(camera.position,delta.normalize());
   const visible=ray.intersectObject(root,true)[0];
   if(!visible||distance-visible.distance>.035)continue;
   const q=point.clone().project(camera);if(q.z<=-1||q.z>=1||Math.abs(q.x)>=1||Math.abs(q.y)>=1)continue;
   const x=(q.x+1)*width/2,y=(1-q.y)*height/2;
   if(!mask[(height-1-Math.floor(y))*width+Math.floor(x)])continue;
   if(result.some(h=>Math.hypot(h.x-x,h.y-y)<28))continue;
   result.push({...part,id:group.side+'-'+i,x,y,radius:18});
  }
  return result.sort((a,b)=>a.y-b.y);
 }
 function proximityCue(){
  clearCue();if(!active||pointer===null||!inside||!nearest||arrived||document.hidden)return;
  const d=Math.hypot(lastContact.x-nearest.x,lastContact.y-nearest.y),near=1-Math.min(1,Math.max(0,(d-nearest.radius)/75));
  if(!globalThis.speechSynthesis?.speaking)entrySound.cue(near);
  cueTimer=setTimeout(proximityCue,850-near*570);
 }
 function announce(h,explain){
  clearCue();clearSpeech();entrySound.stop();entrySound.cue(1,true);
  const message=explain?h.text:h.name+'. 손을 뗀 뒤 같은 지점을 다시 터치하면 상세 해설이 재생됩니다.';
  status.textContent=message;
  // Start TTS in the trusted pointer event; mobile browsers may reject delayed speech.
  if(active&&!document.hidden)speak(message);
 }
 function explore(x,y){
  lastContact={x,y};let best=null,distance=Infinity;
  if(inside)for(const h of hotspots){const d=Math.hypot(h.x-x,h.y-y);if(d<distance){best=h;distance=d;}}
  const oldNearest=nearest;nearest=distance<93?best:null;
  // A small exit margin prevents repeated announcements at the hit boundary.
  const hit=nearest&&(distance<=nearest.radius||(arrived===nearest&&distance<=nearest.radius+8))?nearest:null;
  if(hit&&arrived!==hit){
   arrived=hit;const explain=selected===hit.id&&namedGesture!==gesture;
   if(selected!==hit.id||namedGesture!==gesture)announce(hit,explain);
   selected=hit.id;namedGesture=gesture;
  }else if(!hit){
   arrived=null;
   if(oldNearest!==nearest){clearCue();entrySound.stop();if(nearest)proximityCue();}
   else if(nearest&&!cueTimer)proximityCue();
   if(!nearest)clearCue();
   status.textContent=nearest?'해설 지점에 접근 중 · 거리 안내음을 따라 탐색하세요':inside?'작품 내부 · 해설 지점을 탐색하세요':'작품 밖';
  }
  draw();
 }
 function release(){clearCue();if(!arrived)entrySound.stop();nearest=null;arrived=null;lastContact=null;draw();}

 const entrySound=createTactileSound();
 const vibrate=pattern=>{try{return navigator.vibrate?.(pattern)??false}catch{return false}};
 // Send complete patterns, as in the earlier haptic experiment, rather than
 // repeatedly replacing individual short pulses from a JS interval.
 const touchPattern=[80,60,80,60,80,60,80,60,80];
 function requestVibration(pattern){
  if(typeof navigator.vibrate!=='function'){support.textContent='이 브라우저에서는 진동 API를 사용할 수 없습니다';return false;}
  const accepted=vibrate(pattern);
  support.textContent=accepted?'':'진동을 시작하지 못했습니다 · 손을 떼고 다시 짚어 주세요';
  return accepted;
 }
 function pulse(){
  if(!active||!inside||pointer===null||document.hidden)return;
  if(requestVibration(touchPattern))timer=setTimeout(pulse,700);
 }
 function stop(){clearTimeout(timer);timer=null;inside=false;vibrate(0);canvas.classList.remove('touch-inside');}
 function end(){if(!active)return;clearSpeech();release();selected=null;hotspots=[];baseImage=null;entrySound.reset();generation++;if('speechSynthesis' in window)speechSynthesis.cancel();stop();pointer=null;active=false;mask=null;loading.hidden=true;document.body.classList.remove('feeling');restore();entry.focus();}
 function contact(e){
  const rect=canvas.getBoundingClientRect();const x=Math.floor((e.clientX-rect.left)/rect.width*width),y=Math.floor((e.clientY-rect.top)/rect.height*height);
  const hit=x>=0&&y>=0&&x<width&&y<height&&mask[(height-1-y)*width+x]>0;
  if(hit!==inside){stop();inside=hit;if(hit){canvas.classList.add('touch-inside');entrySound.play();pulse();}}
  explore(x,y);
 };
 entry.onclick=async()=>{
  const root=getRoot();if(!root||active)return;
  entrySound.unlock();entrySound.reset();freeze();active=true;const token=++generation;loading.hidden=false;
  speak('잠시, 시선을 멈추고 손끝으로 사유를 이어갑니다. 작품의 윤곽을 준비하고 있어요.');
  // Let the loading message paint before the synchronous GPU readback.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await new Promise(resolve=>setTimeout(resolve,350));
  if(token!==generation)return;
  try{
  const rect=renderer.domElement.getBoundingClientRect();width=Math.max(1,Math.round(rect.width));height=Math.max(1,Math.round(rect.height));
  const target=new THREE.WebGLRenderTarget(width,height,{depthBuffer:true});
  const scene=new THREE.Scene();scene.background=new THREE.Color(0);
  const material=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
  const copy=root.clone(true);copy.traverse(o=>{if(o.isMesh)o.material=material});scene.add(copy);
  const pixels=new Uint8Array(width*height*4),previous=renderer.getRenderTarget();
  try{renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);}
  finally{renderer.setRenderTarget(previous);target.dispose();material.dispose();renderScene();}
  mask=new Uint8Array(width*height);for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4]>127?1:0;
  canvas.width=width;canvas.height=height;
  const output=ctx.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const index=(height-1-y)*width+x,hit=mask[index];let edge=false;
   for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2]]){const nx=x+dx,ny=height-1-y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height&&mask[ny*width+nx]!==hit)edge=true;}
   const i=(y*width+x)*4;output.data[i]=edge?245:hit?27:12;output.data[i+1]=edge?220:hit?25:12;output.data[i+2]=edge?164:hit?20:12;output.data[i+3]=edge?255:hit?80:255;
  }
  baseImage=output;hotspots=projectHotspots(root);selected=null;nearest=null;arrived=null;draw();loading.hidden=true;document.body.classList.add('feeling');
  status.textContent=`탐색 준비 완료 · 현재 시점의 해설 지점 ${hotspots.length}개`;
  support.textContent=typeof navigator.vibrate==='function'?'':'이 브라우저는 진동을 지원하지 않습니다 · 윤곽 탐색만 가능합니다';
  canvas.tabIndex=-1;canvas.focus({preventScroll:true});
  speak('탐색 준비가 완료되었습니다. 손가락을 화면에 댄 채 작품의 윤곽과 내부를 천천히 탐색하세요. 작품 내부에서는 진동이 이어지며, 윤곽 밖으로 벗어나면 멈춥니다. 해설 지점에 가까워질수록 거리 안내음의 간격이 짧아집니다. 지점에 도달하면 신호음과 함께 부위 명칭을 안내합니다. 손을 뗀 뒤 같은 지점을 다시 터치하면 상세 해설이 재생됩니다. 탐색을 마치려면 탐색 종료 버튼을 한 번 눌러 안내를 듣고, 다시 한 번 눌러 실행하세요.',{interrupt:false});
  }catch(error){
   end();console.error(error);
   entry.textContent='윤곽을 준비하지 못했습니다 · 다시 시도';
  }
 };
 canvas.addEventListener('pointerdown',e=>{if(!active||!mask||pointer!==null)return;e.preventDefault();entrySound.unlock();if(!selected){clearSpeech();globalThis.speechSynthesis?.cancel();}pointer=e.pointerId;gesture++;canvas.setPointerCapture(pointer);contact(e)});
 canvas.addEventListener('pointermove',e=>{if(active&&e.pointerId===pointer){e.preventDefault();contact(e)}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId!==pointer)return;pointer=null;stop();release();if(type!=='pointerup'){clearSpeech();entrySound.stop();globalThis.speechSynthesis?.cancel();selected=null;}if(!selected)status.textContent='손가락을 떼었습니다';});
 exit.onclick=end;
 addEventListener('keydown',e=>{if(active&&e.key==='Escape')end()});
 addEventListener('resize',()=>{if(active)end()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearSpeech();release();entrySound.stop();globalThis.speechSynthesis?.cancel();stop();pointer=null;selected=null}});
 addEventListener('pagehide',()=>{clearSpeech();release();entrySound.stop();globalThis.speechSynthesis?.cancel();stop();pointer=null});
 return {isActive:()=>active};
}
