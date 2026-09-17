import * as THREE from 'three';
import { episodePosition } from './vop-episode.js';

const zUpToView = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI/2);
export function createEpisodeScene(clip, { scene, camera, controls, robotRoot }) {
 const world = new THREE.Group(); world.name = 'VOP-Nav episode'; world.quaternion.copy(zUpToView); scene.add(world);
 const [xmin,xmax,ymin,ymax] = clip.room_bounds;
 const width = xmax-xmin, depth = ymax-ymin;
 const origin = clip.env_origin;
 const surface = new THREE.Mesh(new THREE.PlaneGeometry(width + .8, depth + .8),
  new THREE.MeshStandardMaterial({ color: 0xe5eaed, roughness: .95 }));
 surface.position.set((xmin+xmax)/2, (ymin+ymax)/2, -.01); surface.receiveShadow = true; world.add(surface);
 const points = [];
 for (let x=Math.ceil(xmin); x<=xmax; x+=.5) points.push(x,ymin,0,x,ymax,0);
 for (let y=Math.ceil(ymin); y<=ymax; y+=.5) points.push(xmin,y,0,xmax,y,0);
 const grid = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),
  new THREE.LineBasicMaterial({color:0xcad3da, transparent:true, opacity:.48})); world.add(grid);
 const materials = {
  dynamic: new THREE.MeshStandardMaterial({ color:0xff7b42, roughness:.7, transparent:true, opacity:.74 }),
  static: new THREE.MeshStandardMaterial({ color:0xa6b3c0, roughness:.85 }),
  wall: new THREE.MeshStandardMaterial({ color:0x9eacb8, roughness:.9, transparent:true, opacity:.16, depthWrite:false }),
 };
 const obstacles = clip.obstacles.map(obstacle => {
  const d = obstacle.dimensions_m;
  const geometry = obstacle.shape === 'box' ? new THREE.BoxGeometry(...d) : new THREE.CylinderGeometry(d[0],d[0],d[1],32).rotateX(Math.PI/2);
  const material = materials[obstacle.kind === 'dynamic' ? 'dynamic' : obstacle.kind === 'wall' ? 'wall' : 'static'];
  const mesh = new THREE.Mesh(geometry,material.clone());mesh.material.transparent=true; mesh.name=obstacle.id; mesh.castShadow=obstacle.kind!=='wall'; mesh.receiveShadow=true;
  if (obstacle.kind === 'wall') {
   mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x96a6b4,transparent:true,opacity:.38})));
  }
  world.add(mesh); return mesh;
 });
 function localPosition(position, object) { object.position.set(position[0]-origin[0],position[1]-origin[1],position[2]-origin[2]); }
 function label(text, color) {
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.font='500 40px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=color;ctx.fillText(text,192,48);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,depthWrite:false}));sprite.scale.set(1.15,.2875,1);return sprite;
 }
 function marker(position, radius, color, text) {
  const group=new THREE.Group();localPosition(position,group);group.position.z=.012;
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius-.018,radius+.018,80),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));group.add(ring);
  const center=new THREE.Mesh(new THREE.CircleGeometry(.055,24),new THREE.MeshBasicMaterial({color}));center.position.z=.002;group.add(center);
  const name=label(text,color===0xff4a00?'#b93600':'#536474');name.position.set(0,0,.35);group.add(name);world.add(group);return group;
 }
 marker(clip.start,.28,0x718697,'START'); marker(clip.goal,clip.goal_radius,0xff4a00,'GOAL');
 const pathPoints=clip.frames.map(frame=>new THREE.Vector3(frame.robot[0]-origin[0],frame.robot[1]-origin[1],.023));
 const fullPath=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathPoints),new THREE.LineDashedMaterial({color:0x8798a6,dashSize:.10,gapSize:.08,transparent:true,opacity:.6}));
 fullPath.computeLineDistances();world.add(fullPath);
 // A narrow floor ribbon makes the travelled path readable at overview scale.
 const ribbon=[];
 for(let i=1;i<pathPoints.length;i++){
  const a=pathPoints[i-1],b=pathPoints[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len*.025,ny=dx/len*.025;
  ribbon.push(a.x+nx,a.y+ny,.026,a.x-nx,a.y-ny,.026,b.x+nx,b.y+ny,.026,b.x+nx,b.y+ny,.026,a.x-nx,a.y-ny,.026,b.x-nx,b.y-ny,.026);
 }
 const traveledGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(ribbon,3));
 const traveled=new THREE.Mesh(traveledGeometry,new THREE.MeshBasicMaterial({color:0xff4a00,side:THREE.DoubleSide}));world.add(traveled);
 const halo=new THREE.Mesh(new THREE.RingGeometry(.32,.345,48),new THREE.MeshBasicMaterial({color:0xff4a00,transparent:true,opacity:.65}));world.add(halo);
 const heading=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.8,0xb93600,.16,.10);world.add(heading);
 const raycaster=new THREE.Raycaster(),sight=new THREE.Vector3();
 const position=new THREE.Vector3(), lastFollow=new THREE.Vector3(), direction=new THREE.Vector3();
 const quaternion=new THREE.Quaternion();let view='follow',active=false,latest=null;
 const center=new THREE.Vector3((xmin+xmax)/2,.35,-(ymin+ymax)/2);
 function fit() {
  camera.up.set(0,1,0);
  if(view==='follow' && latest){
   episodePosition(latest.robot,origin,position);controls.target.copy(position);lastFollow.copy(position);
   camera.position.copy(position).add(new THREE.Vector3(2.1,1.9,2.8).multiplyScalar(Math.max(1,Math.min(1.7,1/camera.aspect))));
  }else{
   const offset=view==='top'?new THREE.Vector3(camera.aspect<1?.001:0,1,camera.aspect<1?0:.001):
    camera.aspect<1?new THREE.Vector3(11,12,2):new THREE.Vector3(3,9,11);
   offset.normalize();camera.position.copy(center).add(offset);camera.lookAt(center);camera.updateMatrixWorld();
   const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
   const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=0;
   for(const x of [xmin-.7,xmax+.7]) for(const y of [0,2.3]) for(const z of [-ymax-.7,-ymin+.7]){
    const v=new THREE.Vector3(x,y,z).sub(center),near=v.dot(offset);
    distance=Math.max(distance,Math.abs(v.dot(right))/(tangent*camera.aspect)+near,Math.abs(v.dot(up))/tangent+near);
   }
   camera.position.copy(center).addScaledVector(offset,distance*1.10);controls.target.copy(center);
  }
  controls.update();
 }
 function setView(next){view=next;fit();return view;}
 function update(sample){
  latest=sample;
  episodePosition(sample.robot,origin,robotRoot.position);
  quaternion.fromArray(sample.robot,3);robotRoot.quaternion.copy(zUpToView).multiply(quaternion);
  sample.obstacles.forEach((pose,i)=>{localPosition(pose,obstacles[i]);obstacles[i].quaternion.fromArray(pose,3);});
  traveledGeometry.setDrawRange(0,Math.min(sample.frameIndex*6,ribbon.length/3));
  halo.position.set(sample.robot[0]-origin[0],sample.robot[1]-origin[1],.03);
  direction.set(1,0,0).applyQuaternion(quaternion);direction.z=0;direction.normalize();
  heading.position.copy(halo.position);heading.setDirection(direction);
  if(active && view==='follow'){
   episodePosition(sample.robot,origin,position);direction.copy(position).sub(lastFollow);
   camera.position.add(direction);controls.target.add(direction);lastFollow.copy(position);
  }
 }
 function updateOcclusion(){
  if(!active)return;
  world.updateMatrixWorld(true);
  sight.copy(robotRoot.position).sub(camera.position);raycaster.far=Math.max(0,sight.length()-.2);
  raycaster.set(camera.position,sight.normalize());
  obstacles.forEach((mesh,i)=>{
   const occluded=raycaster.intersectObject(mesh,false).length>0;
   const kind=clip.obstacles[i].kind;
   mesh.material.opacity=occluded?.12:kind==='wall'?.16:kind==='dynamic'?.74:1;
   mesh.material.depthWrite=!occluded&&kind!=='wall';
  });
 }
 return { world, update, fit, setView, updateOcclusion,
  setVisible(value){active=value;world.visible=value;},
  setPathVisible(value){fullPath.visible=value;traveled.visible=value;},
  get view(){return view;},
 };
}
