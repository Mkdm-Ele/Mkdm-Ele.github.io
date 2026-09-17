export function createPerceptionMap(clip) {
 const details=document.querySelector('#vop-perception'),canvas=document.querySelector('#vop-map');
 const status=document.querySelector('#vop-map-status'),retry=document.querySelector('#vop-map-retry');
 const ctx=canvas.getContext('2d'),meta=clip.perception;let data=null,pending=null,lastFrame=0,drawn=-1;
 canvas.width=660;canvas.height=660;
 function draw(frameIndex,force=false){
  lastFrame=frameIndex;
  if(!details.open||details.hidden||!data||(!force&&drawn===frameIndex))return;
  drawn=frameIndex;const size=660,c=size/2,r=size*.38,max=meta.max_speed,scale=r/max;
  ctx.clearRect(0,0,size,size);ctx.strokeStyle='#cbd5dc';ctx.lineWidth=1.5;ctx.setLineDash([]);
  for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(c,c,r*i/3,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(c-r-12,c);ctx.lineTo(c+r+12,c);ctx.moveTo(c,c-r-12);ctx.lineTo(c,c+r+12);ctx.stroke();
  const n=meta.angles.length,offset=frameIndex*n*4;
  function point(ray,channel){const speed=data[offset+ray*4+channel],angle=meta.angles[ray];return [c-Math.sin(angle)*speed*scale,c-Math.cos(angle)*speed*scale];}
  function region(min,max){ctx.beginPath();for(let i=0;i<n;i++){const p=point(i,max);i?ctx.lineTo(...p):ctx.moveTo(...p);}for(let i=n-1;i>=0;i--)ctx.lineTo(...point(i,min));ctx.closePath();}
  region(0,1);ctx.fillStyle='#ff4a002d';ctx.fill('evenodd');ctx.strokeStyle='#ff4a00';ctx.lineWidth=2.5;ctx.stroke();
  region(2,3);ctx.setLineDash([7,6]);ctx.strokeStyle='#728898';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
  const velocity=clip.frames[frameIndex].base_linear_velocity;
  ctx.beginPath();ctx.arc(c-velocity[1]*scale,c-velocity[0]*scale,6,0,Math.PI*2);ctx.fillStyle='#353b43';ctx.fill();
  ctx.fillStyle='#75818b';ctx.font='20px monospace';ctx.textAlign='center';ctx.fillText('FORWARD',c,35);ctx.fillText('LEFT',35,c+5);ctx.fillText('RIGHT',size-40,c+5);ctx.fillText(max+' m/s',c,size-26);
  status.textContent=`Frame ${frameIndex+1} / ${clip.frames.length} · ${clip.times[frameIndex].toFixed(2)} s`;
 }
 async function load(){
  if(data){draw(lastFrame,true);return;}if(pending)return pending;
  status.textContent='Loading recorded velocity regions…';retry.hidden=true;
  pending=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   try{
    if(!meta||meta.encoding!=='float32-le'||meta.frame_count!==clip.frames.length)throw new Error('Unsupported perception recording');
    const response=await fetch(meta.url,{signal:controller.signal});if(!response.ok)throw new Error('Velocity map unavailable');
    const bytes=await response.arrayBuffer(),expected=clip.frames.length*meta.angles.length*4;
    if(bytes.byteLength!==expected*4)throw new Error('Incomplete velocity map');
    const view=new DataView(bytes),values=new Float32Array(expected);
    for(let i=0;i<expected;i++){values[i]=view.getFloat32(i*4,true);if(!Number.isFinite(values[i])||values[i]<0||values[i]>meta.max_speed+.001)throw new Error('Invalid velocity map');}
    data=values;draw(lastFrame,true);
   }catch(error){status.textContent='Velocity map could not load. The 3D replay is still available.';retry.hidden=false;}
   finally{clearTimeout(timer);pending=null;}
  })();return pending;
 }
 details.addEventListener('toggle',()=>{if(details.open&&!details.hidden)load();});retry.addEventListener('click',load);
 return {update:draw,show(){if(details.open)load();}};
}
