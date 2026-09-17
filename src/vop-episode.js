import { Quaternion } from 'three';
import { GO2_JOINTS } from './go2-motion.js';

const vector = (value, length, label) => {
 if (!Array.isArray(value) || value.length !== length || !value.every(Number.isFinite))
  throw new Error(`Invalid ${label}`);
 return value;
};
function pose(value, label) {
 vector(value, 7, label);
 const norm = Math.hypot(...value.slice(3));
 if (norm < .9 || norm > 1.1) throw new Error(`Invalid quaternion: ${label}`);
 return value;
}
export function parseEpisode(data) {
 if (data?.schema_version !== 1 || !Array.isArray(data.frames) || data.frames.length < 2)
  throw new Error('Unsupported or empty episode');
 vector(data.env_origin, 3, 'world origin'); vector(data.start, 3, 'start'); vector(data.goal, 3, 'goal');
 vector(data.room_bounds, 4, 'room bounds');
 const [xmin,xmax,ymin,ymax] = data.room_bounds;
 if (xmin >= xmax || ymin >= ymax || !Number.isFinite(data.goal_radius) || data.goal_radius <= 0)
  throw new Error('Invalid room or goal dimensions');
 if (!Array.isArray(data.joint_names) || data.joint_names.length !== 12 || new Set(data.joint_names).size !== 12)
  throw new Error('Invalid joint names');
 const jointMap = GO2_JOINTS.map(name => {
  const index = data.joint_names.indexOf(name);
  if (index < 0) throw new Error('Missing joint: ' + name);
  return index;
 });
 if (!Array.isArray(data.obstacles) || data.obstacles.length > 100) throw new Error('Invalid obstacles');
 const ids = new Set();
 data.obstacles.forEach(obstacle => {
  if (!obstacle.id || ids.has(obstacle.id) || !['box','cylinder'].includes(obstacle.shape)) throw new Error('Invalid obstacle shape or id');
  ids.add(obstacle.id);
  vector(obstacle.dimensions_m, obstacle.shape === 'box' ? 3 : 2, 'obstacle dimensions');
  if (obstacle.dimensions_m.some(v => v <= 0)) throw new Error('Invalid obstacle dimensions');
  const order = obstacle.shape === 'box' ? ['length','width','height'] : ['radius','height'];
  if (JSON.stringify(obstacle.dimension_order) !== JSON.stringify(order)) throw new Error('Unsupported dimension order');
 });
 const times = new Float64Array(data.frames.length), distances = new Float64Array(data.frames.length);
 const origin = data.frames[0].t;
 const frames = data.frames.map((frame, index) => {
  if (!Number.isFinite(frame.t)) throw new Error('Invalid timestamp');
  times[index] = frame.t - origin;
  if (index && times[index] <= times[index - 1]) throw new Error('Timestamps must strictly increase');
  pose(frame.robot, 'robot pose'); vector(frame.joint_position, 12, 'joint positions');
  vector(frame.base_linear_velocity, 3, 'body velocity');
  if (!Array.isArray(frame.obstacles) || frame.obstacles.length !== data.obstacles.length) throw new Error('Obstacle count mismatch');
  frame.obstacles.forEach(value => pose(value, 'obstacle pose'));
  if (index) distances[index] = distances[index - 1] + Math.hypot(frame.robot[0] - data.frames[index-1].robot[0], frame.robot[1] - data.frames[index-1].robot[1]);
  return { ...frame, joints: Float64Array.from(jointMap, i => frame.joint_position[i]) };
 });
 return { ...data, frames, times, distances, duration: times.at(-1), pathLength: distances.at(-1) };
}
export function episodeInterval(clip, seconds) {
 const time = Math.max(0, Math.min(clip.duration, seconds));
 let low = 0, high = clip.times.length - 1;
 while (low + 1 < high) {
  const mid = (low + high) >> 1;
  if (clip.times[mid] <= time) low = mid; else high = mid;
 }
 return { low, high, mix: (time - clip.times[low]) / (clip.times[high] - clip.times[low]), time };
}
export function createEpisodeSample(clip) {
 return { robot: new Float64Array(7), joints: new Float64Array(12), velocity: new Float64Array(3),
  obstacles: clip.obstacles.map(() => new Float64Array(7)), frameIndex: 0, distance: 0, time: 0 };
}
const qa = new Quaternion(), qb = new Quaternion();
function interpolatePose(a, b, mix, out) {
 for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * mix;
 qa.fromArray(a, 3).normalize(); qb.fromArray(b, 3).normalize();
 qa.slerp(qb, mix).toArray(out, 3);
}
export function sampleEpisode(clip, seconds, out = createEpisodeSample(clip)) {
 const { low, high, mix, time } = episodeInterval(clip, seconds);
 const a = clip.frames[low], b = clip.frames[high];
 interpolatePose(a.robot, b.robot, mix, out.robot);
 a.obstacles.forEach((value, i) => interpolatePose(value, b.obstacles[i], mix, out.obstacles[i]));
 for (let i = 0; i < 12; i++) out.joints[i] = a.joints[i] + (b.joints[i] - a.joints[i]) * mix;
 for (let i = 0; i < 3; i++) out.velocity[i] = a.base_linear_velocity[i] + (b.base_linear_velocity[i] - a.base_linear_velocity[i]) * mix;
 out.frameIndex = mix === 1 ? high : low;
 out.distance = clip.distances[low] + (clip.distances[high] - clip.distances[low]) * mix;
 out.time = time;
 return out;
}
// Z-up simulator -> Y-up viewer, after translating the environment origin.
export function episodePosition(position, origin, out) {
 return out.set(position[0] - origin[0], position[2] - origin[2], -(position[1] - origin[1]));
}
