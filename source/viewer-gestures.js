import * as THREE from 'three';

// Screen-space pan, pinch distance, and two-finger midpoint rotation.
export function applyGesture(camera,controls,before,after,height){
 const offset=camera.position.clone().sub(controls.target);
 if(after.length===1){
  const scale=2*offset.length()*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/height;
  camera.updateMatrix();
  const delta=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(-(after[0].x-before[0].x)*scale);
  delta.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrix,1),(after[0].y-before[0].y)*scale);
  camera.position.add(delta);controls.target.add(delta);
 }else{
  const center=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
  const gap=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
  const a=center(before),b=center(after),s=new THREE.Spherical().setFromVector3(offset);
  if(gap(before)>10&&gap(after)>10)s.radius=THREE.MathUtils.clamp(s.radius*gap(before)/gap(after),controls.minDistance,controls.maxDistance);
  s.theta-=(b.x-a.x)*2*Math.PI/height;
  s.phi=THREE.MathUtils.clamp(s.phi-(b.y-a.y)*2*Math.PI/height,Math.max(.01,controls.minPolarAngle),Math.min(Math.PI-.01,controls.maxPolarAngle));
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
 }
 controls.update();
}

export function setupViewerGestures({stage,camera,controls,onStart,onChange}){
 const fingers=new Map();let moved=false,suppressClickUntil=0;
 const points=()=>[...fingers.values()].slice(0,2).map(p=>({x:p.x,y:p.y}));
 stage.style.touchAction='none';
 stage.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!controls.enabled)return;
  e.stopPropagation();
  if(!fingers.size){moved=false;onStart();const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;}
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
  if(fingers.size>1)moved=true;
 },true);
 stage.addEventListener('pointermove',e=>{
  const p=fingers.get(e.pointerId);if(!p)return;
  e.stopPropagation();
  if(!controls.enabled){fingers.clear();return;}
  if(!moved&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<6)return;
  moved=true;e.preventDefault();
  const before=points();p.x=e.clientX;p.y=e.clientY;
  if(fingers.size<=2)applyGesture(camera,controls,before,points(),Math.max(1,stage.clientHeight));
  onChange();
 },{capture:true,passive:false});
 const end=e=>{
  if(!fingers.has(e.pointerId))return;
  e.stopPropagation();if(moved)suppressClickUntil=performance.now()+700;
  fingers.delete(e.pointerId);
  for(const p of fingers.values()){p.startX=p.x;p.startY=p.y;}
 };
 // Window listeners finish gestures even if a finger is released outside the stage.
 window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
 window.addEventListener('blur',()=>fingers.clear());
 document.addEventListener('click',e=>{
  if(e.detail!==0&&stage.contains(e.target)&&performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}
 },true);
}
