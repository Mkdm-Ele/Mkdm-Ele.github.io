import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import URDFLoader from 'urdf-loader';

export function initRobot(){
 const viewport=document.querySelector('#robot-viewport');
 const consoleEl=document.querySelector('.robot-console');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 viewport.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(31,1,.01,30);
 const defaultPosition=new THREE.Vector3(1.03,.68,1.18);
 const target=new THREE.Vector3(0,.19,0);
 camera.position.copy(defaultPosition);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=.65;controls.maxDistance=3.5;controls.maxPolarAngle=Math.PI*.495;controls.autoRotateSpeed=1.1;
 scene.add(new THREE.HemisphereLight(0xffffff,0xc0cbd4,1.4));
 const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(1,2.5,1.5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-1.6,right:1.6,top:1.6,bottom:-1.6,near:.1,far:6});key.shadow.bias=-.00015;key.shadow.normalBias=.007;scene.add(key);
 const fill=new THREE.DirectionalLight(0xdde9ff,.6);fill.position.set(-2,1,-1);scene.add(fill);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.09}));ground.rotation.x=-Math.PI/2;ground.position.y=-.001;ground.receiveShadow=true;scene.add(ground);
 const grid=new THREE.GridHelper(1.8,30,0xc8d3da,0xd7dfe4);grid.position.y=-.002;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
 const robotRoot=new THREE.Group();robotRoot.rotation.x=-Math.PI/2;scene.add(robotRoot);
 let robot, targetPose='stand', poseMix=0, desiredMix=0, failed=false, visible=true;
 const loading=document.querySelector('#viewer-loading');const label=document.querySelector('#loading-label');
 const manager=new THREE.LoadingManager();
 manager.onProgress=(_,loaded,total)=>{label.textContent=`Assembling Go2 · ${Math.round(loaded/total*100)}%`;};
 manager.onError=url=>{failed=true;label.textContent='A model file could not load. Reload to try again.';document.querySelector('#model-status').textContent='MODEL LOAD FAILED';console.error('Model asset failed:',url);};
 const loader=new URDFLoader(manager);loader.packages={go2_description:'/models/go2'};
 const meshCache=new Map();
 loader.loadMeshCb=(path,mgr,done)=>{
  if(!meshCache.has(path))meshCache.set(path,new Promise((resolve,reject)=>new ColladaLoader(mgr).load(path,result=>resolve(result.scene),undefined,reject)));
  meshCache.get(path).then(mesh=>done(mesh.clone(true))).catch(err=>done(null,err));
 };
 const poseButtons=[...document.querySelectorAll('[data-pose]')];poseButtons.forEach(b=>b.disabled=true);
 function applyPose(mix){if(!robot)return;for(const leg of ['FL','FR','RL','RR']){robot.setJointValue(`${leg}_hip_joint`,0);robot.setJointValue(`${leg}_thigh_joint`,.7+mix*.52);robot.setJointValue(`${leg}_calf_joint`,-1.4-mix*.93);}robot.updateMatrixWorld(true);robotRoot.position.y=0;robotRoot.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(robot);robotRoot.position.y=-box.min.y+.003;}
 manager.onLoad=()=>{Promise.all(meshCache.values()).then(()=>{if(failed||!robot)return;robot.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach(mat=>{if(mat){mat.side=THREE.DoubleSide;}});}});applyPose(0);loading.classList.add('loaded');document.querySelector('#model-dot').classList.add('ready');document.querySelector('#model-status').textContent='READY TO EXPLORE';poseButtons.forEach(b=>b.disabled=false);}).catch(()=>{});};
 loader.load('/models/go2/go2.urdf',result=>{robot=result;robotRoot.add(robot);},undefined,error=>{failed=true;label.textContent='Unable to load Go2. Please reload to try again.';document.querySelector('#model-status').textContent='MODEL LOAD FAILED';console.error(error);});
 poseButtons.forEach(b=>b.addEventListener('click',()=>{targetPose=b.dataset.pose;desiredMix=targetPose==='crouch'?1:0;poseButtons.forEach(button=>{const active=button===b;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});}));
 const reset=()=>{camera.position.copy(defaultPosition);controls.target.copy(target);controls.update();};
 const zoom=factor=>{const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();};
 document.querySelector('#reset-view').addEventListener('click',reset);
 document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.85));document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1.18));
 const rotateButton=document.querySelector('#auto-rotate');rotateButton.addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;rotateButton.setAttribute('aria-pressed',String(controls.autoRotate));rotateButton.querySelector('span').textContent=controls.autoRotate?'Stop rotation':'Auto-rotate';});
 const fullscreen=document.querySelector('#fullscreen');if(!document.fullscreenEnabled)fullscreen.hidden=true;
 fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await consoleEl.requestFullscreen();}catch(error){document.querySelector('#model-status').textContent='FULLSCREEN UNAVAILABLE';}});
 document.addEventListener('fullscreenchange',()=>{fullscreen.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');fullscreen.title=document.fullscreenElement?'Exit fullscreen':'Fullscreen';});
 viewport.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')zoom(.9);else if(e.key==='-')zoom(1.1);else if(e.key.toLowerCase()==='r')reset();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')spherical.theta-=.12;if(e.key==='ArrowRight')spherical.theta+=.12;if(e.key==='ArrowUp')spherical.phi=Math.max(.1,spherical.phi-.1);if(e.key==='ArrowDown')spherical.phi=Math.min(controls.maxPolarAngle,spherical.phi+.1);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();}});
 new ResizeObserver(()=>{const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(viewport);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'100px'}).observe(viewport);
 const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const delta=Math.min(clock.getDelta(),.05);if(!visible||document.hidden)return;if(robot&&Math.abs(poseMix-desiredMix)>.001){poseMix=THREE.MathUtils.damp(poseMix,desiredMix,7,delta);applyPose(poseMix);}controls.update(delta);renderer.render(scene,camera);});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();loading.classList.remove('loaded');label.textContent='3D view interrupted. Reload the page to restore it.';document.querySelector('#model-status').textContent='VIEWER INTERRUPTED';});
}
