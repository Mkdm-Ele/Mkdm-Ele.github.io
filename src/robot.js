import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import URDFLoader from 'urdf-loader';
import { parseEpisode, sampleEpisode, createEpisodeSample } from './vop-episode.js';
import { createEpisodeScene } from './vop-scene.js';
import { createPerceptionMap } from './vop-perception.js';
import { GO2_JOINTS, parseJointMotion, sampleJointMotion, poseAngles, smoothStep } from './go2-motion.js';

export function initRobot() {
 const viewport = document.querySelector('#robot-viewport');
 const consoleEl = document.querySelector('.robot-console');
 const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
 viewport.append(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(31, 1, .01, 30);
 const defaultPosition = new THREE.Vector3(1.03, .68, 1.18);
 const target = new THREE.Vector3(0, .19, 0);
 camera.position.copy(defaultPosition);
 const controls = new OrbitControls(camera, renderer.domElement);
 controls.target.copy(target); controls.enableDamping = true; controls.dampingFactor = .07;
 controls.minDistance = .65; controls.maxDistance = 3.5; controls.maxPolarAngle = Math.PI * .495; controls.autoRotateSpeed = 1.1;
 scene.add(new THREE.HemisphereLight(0xffffff, 0xc0cbd4, 1.4));
 const key = new THREE.DirectionalLight(0xffffff, 2);
 key.position.set(1, 2.5, 1.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
 Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: .1, far: 6 });
 key.shadow.bias = -.00015; key.shadow.normalBias = .007; scene.add(key);
 const fill = new THREE.DirectionalLight(0xdde9ff, .6); fill.position.set(-2, 1, -1); scene.add(fill);
 const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .09 }));
 ground.rotation.x = -Math.PI / 2; ground.position.y = -.001; ground.receiveShadow = true; scene.add(ground);
 const grid = new THREE.GridHelper(1.8, 30, 0xc8d3da, 0xd7dfe4);
 grid.position.y = -.002; grid.material.transparent = true; grid.material.opacity = .3; scene.add(grid);
 const robotRoot = new THREE.Group(); robotRoot.rotation.x = -Math.PI / 2; scene.add(robotRoot);

 let robot, ready = false, failed = false, visible = true, mode = 'stand';
 let runClip, runPromise, modeRequest = 0, playbackTime = 0, paused = false, speed = 1;
 let transition = null, lastFrameTime, viewFit = 1;
 let vopClip, vopPromise, vopScene, vopSample, perception;
 const currentAngles = poseAngles('stand');
 const sampledAngles = new Float64Array(GO2_JOINTS.length);
 let staticAngles = poseAngles('stand');
 const footPosition = new THREE.Vector3();
 let feet = [];
 const loading = document.querySelector('#viewer-loading');
 const label = document.querySelector('#loading-label');
 const status = document.querySelector('#model-status');
 const poseButtons = [...document.querySelectorAll('[data-pose]')];
 const vopViewbar = document.querySelector('#vop-viewbar');
 const vopReadout = document.querySelector('#vop-readout');
 const vopPerception = document.querySelector('#vop-perception');
 const originalHeading = document.querySelector('.console-heading').innerHTML;
 const timelineLabel = document.querySelector('label[for="run-progress"]');
 const runControls = document.querySelector('#run-controls');
 const pauseButton = document.querySelector('#pause-run');
 const progress = document.querySelector('#run-progress');
 const timeLabel = document.querySelector('#run-time');
 const speedSelect = document.querySelector('#run-speed');
 poseButtons.forEach(button => button.disabled = true);

 function applyAngles(angles) {
  GO2_JOINTS.forEach((name, index) => robot.setJointValue(name, angles[index]));
  // The recording has no base pose. Keep the model in place and place the lowest
  // foot on the display floor using the URDF's 0.022 m foot radius.
  robotRoot.position.y = 0;
  robotRoot.updateMatrixWorld(true);
  let lowest = Infinity;
  for (const foot of feet) {
   footPosition.setFromMatrixPosition(foot.matrixWorld);
   lowest = Math.min(lowest, footPosition.y - .022);
  }
  robotRoot.position.y = -lowest + .003;
 }

 function updatePlaybackUI() {
  const clip = mode === 'vop' ? vopClip : runClip;
  if (!clip) return;
  const time = Math.min(playbackTime, clip.duration), digits = mode === 'vop' ? 2 : 1;
  progress.value = String(time);
  const formatted = time.toFixed(digits) + ' / ' + clip.duration.toFixed(digits) + ' s';
  if (timeLabel.textContent !== formatted) timeLabel.textContent = formatted;
  progress.setAttribute('aria-valuetext', time.toFixed(digits) + ' of ' + clip.duration.toFixed(digits) + ' seconds');
 }
 function updateRunStatus() {
  const nav = mode === 'vop', ended = nav && playbackTime >= vopClip.duration;
  pauseButton.textContent = ended ? 'Replay' : paused ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-label', (ended ? 'Replay' : paused ? 'Resume' : 'Pause') + (nav ? ' VOP-Nav' : ' running'));
  status.textContent = nav ? (ended ? (vopClip.success ? 'GOAL REACHED · RECORDED RESULT' : 'EPISODE COMPLETE') : paused ? 'VOP-NAV PAUSED' : 'VOP-NAV · RECORDED EPISODE') : paused ? 'RUN PAUSED' : 'RUNNING · RECORDED MOTION';
 }
 function updateEpisodeFrame() {
  sampleEpisode(vopClip, playbackTime, vopSample);
  currentAngles.set(vopSample.joints);
  GO2_JOINTS.forEach((name, i) => robot.setJointValue(name, currentAngles[i]));
  // Unlike Run, this recording includes the measured base pose: never floor-fit it.
  vopScene.update(vopSample);
  const distance = Math.hypot(vopSample.robot[0]-vopClip.goal[0],vopSample.robot[1]-vopClip.goal[1]);
  document.querySelector('#vop-distance').textContent = distance.toFixed(2) + ' m';
  document.querySelector('#vop-velocity').textContent = Math.hypot(...vopSample.velocity.slice(0,2)).toFixed(2) + ' m/s';
  document.querySelector('#vop-travelled').textContent = vopSample.distance.toFixed(2) + ' m';
  perception.update(vopSample.frameIndex);
  updatePlaybackUI();
 }
 function setMode(next) {
  const wasNav = mode === 'vop';
  mode = next;
  const nav = mode === 'vop', playing = nav || mode === 'run';
  transition = nav ? null : { from: currentAngles.slice(), elapsed: 0 };
  runControls.hidden = !playing;
  vopViewbar.hidden = vopReadout.hidden = vopPerception.hidden = !nav;
  consoleEl.classList.toggle('vop-mode', nav);
  vopScene?.setVisible(nav); grid.visible = !nav;
  // Preserve recorded angles exactly; the simulator has sub-milliradian limit overshoot.
  GO2_JOINTS.forEach(name => { robot.joints[name].ignoreLimits = nav; });
  document.querySelector('.console-heading').innerHTML = nav ? '<div><p class="eyebrow">A RECORDED EXPERIMENT</p><h2 id="playground-title">VOP-Nav<span class="accent-dot">.</span></h2></div><span class="model-badge">EPISODE REPLAY</span>' : originalHeading;
  poseButtons.forEach(button => {
   const active = button.dataset.pose === mode;
   button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  if (nav || wasNav) {
   controls.autoRotate = false; rotateButton.setAttribute('aria-pressed','false');rotateButton.querySelector('span').textContent='Auto-rotate';
   controls.minDistance = nav ? 1.5 : .65; controls.maxDistance = nav ? 60 : 3.5;
   camera.fov = nav ? 40 : 31; camera.far = nav ? 120 : 30; camera.updateProjectionMatrix();
   key.position.set(...(nav ? [3,9,6] : [1,2.5,1.5]));
   const extent = nav ? 9 : 1.6;
   Object.assign(key.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:nav?30:6});key.shadow.camera.updateProjectionMatrix();
  }
  if (playing) {
   playbackTime = 0; paused = false;
   progress.max = String(Number((nav ? vopClip : runClip).duration.toFixed(6)));
   runControls.setAttribute('aria-label', nav ? 'VOP-Nav playback' : 'Running playback');
   progress.setAttribute('aria-label', nav ? 'VOP-Nav playback position' : 'Running playback position');
   speedSelect.setAttribute('aria-label', nav ? 'VOP-Nav playback speed' : 'Running playback speed');
   timelineLabel.textContent = nav ? 'Recorded navigation · '+Math.round(1/vopClip.dt)+' Hz' : 'Recorded motion';
   updateRunStatus();updatePlaybackUI();
  } else { staticAngles = poseAngles(mode); status.textContent = 'READY TO EXPLORE'; }
  if (nav) {
   updateEpisodeFrame();setVopView('follow');perception.show();
  } else if (wasNav) {
   robotRoot.position.set(0,0,0);robotRoot.rotation.set(-Math.PI/2,0,0);applyAngles(currentAngles);reset();
  }
 }
 function setVopView(view) {
  if (!vopScene || mode !== 'vop') return;
  if(view==='follow'){controls.autoRotate=false;rotateButton.setAttribute('aria-pressed','false');rotateButton.querySelector('span').textContent='Auto-rotate';}
  vopScene.setView(view);
  document.querySelectorAll('[data-vop-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.vopView===view)));
 }
 document.querySelectorAll('[data-vop-view]').forEach(button=>button.addEventListener('click',()=>setVopView(button.dataset.vopView)));
 document.querySelector('#vop-trail').addEventListener('change',event=>vopScene?.setPathVisible(event.target.checked));

 async function loadRun() {
  if (runClip) return runClip;
  if (!runPromise) {
   runPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
     const response = await fetch('/models/go2/motions/run.csv', { signal: controller.signal });
     if (!response.ok) throw new Error('Motion file could not load.');
     const clip = parseJointMotion(await response.text());
     GO2_JOINTS.forEach((name, index) => {
      const joint = robot.joints[name];
      if (!joint) throw new Error('Model is missing joint: ' + name);
      if (clip.frames.some(frame => frame[index] < joint.limit.lower || frame[index] > joint.limit.upper))
       throw new Error('Motion exceeds joint limits: ' + name);
     });
     runClip = clip;
     return clip;
    } finally { clearTimeout(timeout); }
   })();
  }
  try { return await runPromise; }
  finally { runPromise = null; }
 }

 async function loadVop() {
  if (vopClip) return vopClip;
  if (!vopPromise) vopPromise = (async () => {
   const controller = new AbortController(),timeout = setTimeout(()=>controller.abort(),20000);
   try {
    const response = await fetch('/models/go2/motions/vop-nav/episode.json',{signal:controller.signal});
    if (!response.ok) throw new Error('Episode unavailable');
    const clip = parseEpisode(await response.json());
    GO2_JOINTS.forEach((name,i)=>{
     const joint=robot.joints[name];
     if (!joint || clip.frames.some(frame=>frame.joints[i]<joint.limit.lower-.001 || frame.joints[i]>joint.limit.upper+.001)) throw new Error('Episode joint outside model limits: '+name);
    });
    vopScene = createEpisodeScene(clip,{scene,camera,controls,robotRoot});vopScene.setVisible(false);
    vopScene.setPathVisible(document.querySelector('#vop-trail').checked);
    vopSample = createEpisodeSample(clip);perception = createPerceptionMap(clip);vopClip=clip;
    document.querySelector('#vop-dynamic-count').textContent=clip.obstacles.filter(o=>o.kind==='dynamic').length;
    document.querySelector('#vop-static-count').textContent=clip.obstacles.filter(o=>!['dynamic','wall'].includes(o.kind)).length;
    return clip;
   } finally { clearTimeout(timeout); }
  })();
  try { return await vopPromise; } finally {vopPromise=null;}
 }
 poseButtons.forEach(button => button.addEventListener('click', async () => {
  const next=button.dataset.pose,request=++modeRequest;
  if (next !== 'run' && next !== 'vop') { setMode(next); return; }
  if (mode === next) return;
  const name=next==='vop'?'VOP-Nav':'Run';
  button.disabled = true;button.textContent='Loading…';status.textContent='LOADING '+name.toUpperCase();
  try {
   await (next==='vop'?loadVop():loadRun());
   if(request===modeRequest)setMode(next);
  } catch(error){
   if(request===modeRequest)status.textContent=name.toUpperCase()+' UNAVAILABLE · CLICK '+name.toUpperCase()+' TO RETRY';
   console.warn('Go2 motion:',error.message);
  } finally {button.disabled=!ready;button.textContent=name;}
 }));
 pauseButton.addEventListener('click', () => {
  if(mode==='vop' && playbackTime>=vopClip.duration){playbackTime=0;paused=false;updateEpisodeFrame();}
  else paused=!paused;
  updateRunStatus();
 });
 speedSelect.addEventListener('change', () => { speed = Number(speedSelect.value); });
 progress.addEventListener('input', () => {
  if(mode==='vop' && vopClip){
   playbackTime=Math.min(Number(progress.value),vopClip.duration);
   if(playbackTime>=vopClip.duration)paused=true;
   updateEpisodeFrame();updateRunStatus();return;
  }
  if (!runClip || mode !== 'run') return;
  playbackTime=Number(progress.value);transition=null;
  sampleJointMotion(runClip,playbackTime,currentAngles);applyAngles(currentAngles);updatePlaybackUI();
 });

 const manager = new THREE.LoadingManager();
 manager.onProgress = (_, loaded, total) => { label.textContent = `Assembling Go2 · ${Math.round(loaded / total * 100)}%`; };
 manager.onError = url => {
  failed = true; label.textContent = 'A model file could not load. Reload to try again.';
  status.textContent = 'MODEL LOAD FAILED'; console.error('Model asset failed:', url);
 };
 const loader = new URDFLoader(manager); loader.packages = { go2_description: '/models/go2' };
 const meshCache = new Map();
 loader.loadMeshCb = (path, mgr, done) => {
  if (!meshCache.has(path)) meshCache.set(path, new Promise((resolve, reject) =>
   new ColladaLoader(mgr).load(path, result => resolve(result.scene), undefined, reject)));
  meshCache.get(path).then(mesh => done(mesh.clone(true))).catch(error => done(null, error));
 };
 manager.onLoad = () => {
  Promise.all(meshCache.values()).then(() => {
   if (failed || !robot) return;
   robot.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = true; child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => { if (material) material.side = THREE.DoubleSide; });
   });
   feet = ['FL', 'FR', 'RL', 'RR'].map(leg => robot.links[leg + '_foot']);
   applyAngles(currentAngles); ready = true;
   loading.classList.add('loaded'); document.querySelector('#model-dot').classList.add('ready');
   status.textContent = 'READY TO EXPLORE';
   poseButtons.forEach(button => button.disabled = false);
  }).catch(error => {
   failed = true; label.textContent = 'Unable to prepare Go2. Please reload to try again.';
   status.textContent = 'MODEL LOAD FAILED'; console.error(error);
  });
 };
 loader.load('/models/go2/go2.urdf', result => { robot = result; robotRoot.add(robot); }, undefined, error => {
  failed = true; label.textContent = 'Unable to load Go2. Please reload to try again.';
  status.textContent = 'MODEL LOAD FAILED'; console.error(error);
 });

 const reset = () => { if(mode==='vop'){vopScene.fit();return;} camera.up.set(0,1,0);camera.position.copy(defaultPosition).sub(target).multiplyScalar(viewFit).add(target); controls.target.copy(target); controls.update(); };
 const zoom = factor => {
  const offset = camera.position.clone().sub(controls.target);
  offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
  camera.position.copy(controls.target).add(offset); controls.update();
 };
 document.querySelector('#reset-view').addEventListener('click', reset);
 document.querySelector('#zoom-in').addEventListener('click', () => zoom(.85));
 document.querySelector('#zoom-out').addEventListener('click', () => zoom(1.18));
 const rotateButton = document.querySelector('#auto-rotate');
 rotateButton.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateButton.setAttribute('aria-pressed', String(controls.autoRotate));
  rotateButton.querySelector('span').textContent = controls.autoRotate ? 'Stop rotation' : 'Auto-rotate';
 });
 const fullscreen = document.querySelector('#fullscreen');
 if (!document.fullscreenEnabled) fullscreen.hidden = true;
 fullscreen.addEventListener('click', async () => {
  try {
   if (document.fullscreenElement) await document.exitFullscreen();
   else await consoleEl.requestFullscreen();
  } catch { status.textContent = 'FULLSCREEN UNAVAILABLE'; }
 });
 document.addEventListener('fullscreenchange', () => {
  fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreen.title = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
 });
 viewport.addEventListener('keydown', event => {
  if (event.key === '+' || event.key === '=') zoom(.9);
  else if (event.key === '-') zoom(1.1);
  else if (event.key.toLowerCase() === 'r') reset();
  else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
   event.preventDefault();
   const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
   if (event.key === 'ArrowLeft') spherical.theta -= .12;
   if (event.key === 'ArrowRight') spherical.theta += .12;
   if (event.key === 'ArrowUp') spherical.phi = Math.max(.1, spherical.phi - .1);
   if (event.key === 'ArrowDown') spherical.phi = Math.min(controls.maxPolarAngle, spherical.phi + .1);
   camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update();
  }
 });
 new ResizeObserver(() => {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  if (!width || !height) return;
  const aspect = width / height;
  const nextFit = Math.max(1, Math.min(1.65, 1.25 / aspect));
  if(mode!=='vop')camera.position.sub(controls.target).multiplyScalar(nextFit / viewFit).add(controls.target);
  viewFit = nextFit;
  renderer.setSize(width, height); camera.aspect = aspect; camera.updateProjectionMatrix();
  if(mode==='vop')vopScene.fit();
  controls.update();
 }).observe(viewport);
 new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting; lastFrameTime = undefined;
 }, { rootMargin: '100px' }).observe(consoleEl);
 document.addEventListener('visibilitychange', () => { lastFrameTime = undefined; });

 renderer.setAnimationLoop(now => {
  const elapsed = lastFrameTime === undefined ? 0 : Math.max(0, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  if (!visible || document.hidden) return;
  if(ready && mode==='vop' && !paused){
   playbackTime=Math.min(vopClip.duration,playbackTime+elapsed*speed);updateEpisodeFrame();
   if(playbackTime>=vopClip.duration){paused=true;updateRunStatus();}
  }
  if (ready && mode!=='vop' && (transition || (mode === 'run' && !paused))) {
   let destination = staticAngles;
   if (mode === 'run') {
    if (!paused) playbackTime = (playbackTime + elapsed * speed) % runClip.loopDuration;
    destination = sampleJointMotion(runClip, playbackTime, sampledAngles);
    updatePlaybackUI();
   }
   if (transition) {
    transition.elapsed += elapsed;
    const mix = smoothStep(transition.elapsed / .35);
    for (let i = 0; i < currentAngles.length; i++)
     currentAngles[i] = THREE.MathUtils.lerp(transition.from[i], destination[i], mix);
    if (mix === 1) transition = null;
   } else currentAngles.set(destination);
   applyAngles(currentAngles);
  }
  controls.update(Math.min(elapsed, .1));
  if(mode==='vop')vopScene.updateOcclusion();
  renderer.render(scene, camera);
 });
 renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault(); loading.classList.remove('loaded');
  label.textContent = '3D view interrupted. Reload the page to restore it.'; status.textContent = 'VIEWER INTERRUPTED';
 });
}
