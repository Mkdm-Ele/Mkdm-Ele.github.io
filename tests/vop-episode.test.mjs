import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Quaternion, Vector3 } from 'three';
import { GO2_JOINTS } from '../src/go2-motion.js';
import { parseEpisode, sampleEpisode, episodePosition } from '../src/vop-episode.js';
const data=JSON.parse(await readFile('public/models/go2/motions/vop-nav/episode.json','utf8'));
const clip=parseEpisode(data);
const close=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('recording has matched joints, obstacles, timestamps and successful final position',()=>{
 assert.equal(clip.frames.length,478);assert.equal(clip.obstacles.length,16);
 assert.equal(clip.obstacles.filter(o=>o.kind==='dynamic').length,8);
 assert.equal(clip.obstacles.filter(o=>o.kind==='wall').length,2);
 close(clip.duration,9.54,1e-6);close(clip.pathLength,13.662982862252841);
 close(Math.hypot(clip.end[0]-clip.goal[0],clip.end[1]-clip.goal[1]),.10673429123682186);
 assert.equal(clip.success,true);
 const shuffled=structuredClone(data);shuffled.joint_names.reverse();shuffled.frames.forEach(f=>f.joint_position.reverse());
 const mapped=parseEpisode(shuffled);
 assert.deepEqual(mapped.frames[137].joints,clip.frames[137].joints);
 GO2_JOINTS.forEach((name,i)=>close(clip.frames[137].joints[i],data.frames[137].joint_position[data.joint_names.indexOf(name)]));
});

test('base motion and all obstacle poses use a common Z-up world, rebased without scaling',()=>{
 const start=episodePosition(clip.start,clip.env_origin,new Vector3());
 close(start.x,-4.526115417480469);close(start.y,.41999998688697815);close(start.z,.762784481048584);
 const goal=episodePosition(clip.goal,clip.env_origin,new Vector3());
 close(start.distanceTo(goal),new Vector3(...clip.start).distanceTo(new Vector3(...clip.goal)));
 const zUp=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2);
 const bodyYaw=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),Math.PI/2);
 const direction=new Vector3(1,0,0).applyQuaternion(zUp.multiply(bodyYaw));
 close(direction.x,0);close(direction.y,0);close(direction.z,-1);
});

test('sampling interpolates every articulated pose and holds the real final frame',()=>{
 const i=180,a=clip.frames[i],b=clip.frames[i+1],mid=sampleEpisode(clip,(clip.times[i]+clip.times[i+1])/2);
 a.joints.forEach((angle,j)=>close(mid.joints[j],(angle+b.joints[j])/2));
 a.obstacles.forEach((pose,j)=>pose.slice(0,3).forEach((value,k)=>close(mid.obstacles[j][k],(value+b.obstacles[j][k])/2)));
 close(Math.hypot(...mid.robot.slice(3)),1);
 const last=sampleEpisode(clip,clip.duration+100);
 assert.equal(last.frameIndex,477);assert.deepEqual([...last.joints],[...clip.frames.at(-1).joints]);
 last.robot.slice(0,3).forEach((value,j)=>close(value,clip.end[j]));
 assert.deepEqual([...sampleEpisode(clip,-10).joints],[...clip.frames[0].joints]);
 const mini=structuredClone(data);mini.frames=mini.frames.slice(0,2);
 mini.frames[0].robot.splice(3,4,0,0,0,1);mini.frames[1].robot.splice(3,4,0,0,0,-1);
 const noSpin=sampleEpisode(parseEpisode(mini),.01);
 close(Math.abs(noSpin.robot[6]),1); // Quaternion sign flips must not spin the robot.
});

test('malformed recordings fail before replacing the current scene',()=>{
 for(const change of [d=>d.frames[1].t=d.frames[0].t,d=>d.frames[0].robot[0]=NaN,
  d=>d.frames[0].robot.splice(3,4,0,0,0,0),d=>d.joint_names[0]='unknown',
  d=>d.frames[0].obstacles.pop(),d=>d.obstacles[0].dimensions_m[0]=-1,
  d=>d.obstacles[0].dimension_order.reverse()]){
  const bad=structuredClone(data);change(bad);assert.throws(()=>parseEpisode(bad));
 }
});

test('optional perception data is complete, bounded and separate from the initial replay',async()=>{
 const bytes=await readFile('public/models/go2/motions/vop-nav/perception.bin');
 assert.equal(bytes.length,478*360*4*4);
 for(let i=0;i<bytes.length;i+=4){const v=bytes.readFloatLE(i);assert.ok(Number.isFinite(v)&&v>=0&&v<=4.5);}
 assert.ok(!JSON.stringify(data).includes('/home/drone/'));
 assert.ok(!('vo_gt' in data.frames[0]));
});
