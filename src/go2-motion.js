// Joint names, rather than CSV column position, determine the URDF mapping.
export const GO2_JOINTS = Object.freeze(
  ['FL', 'FR', 'RL', 'RR'].flatMap(leg =>
    ['hip', 'thigh', 'calf'].map(part => `${leg}_${part}_joint`))
);
export const LOOP_BLEND_SECONDS = 0.24;

export function parseJointMotion(csv) {
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(line => line.trim());
  const headers = lines.shift()?.split(',').map(name => name.trim()) ?? [];
  const required = ['time_s', ...GO2_JOINTS.map(name => name + '_rad')];
  const columns = required.map(name => {
    if (headers.filter(header => header === name).length !== 1)
      throw new Error('Missing or duplicate motion column: ' + name);
    return headers.indexOf(name);
  });
  if (lines.length < 2) throw new Error('Motion requires at least two frames.');
  const times = new Float64Array(lines.length);
  const frames = [];
  let origin = 0;
  for (const [index, line] of lines.entries()) {
    const cells = line.split(',');
    const values = columns.map(column => {
      const cell = cells[column]?.trim();
      if (!cell || !Number.isFinite(Number(cell))) throw new Error('Invalid motion value at frame ' + index);
      return Number(cell);
    });
    if (index === 0) origin = values[0];
    times[index] = values[0] - origin;
    if (index > 0 && times[index] <= times[index - 1])
      throw new Error('Motion timestamps must strictly increase.');
    frames.push(Float64Array.from(values.slice(1)));
  }
  const duration = times[times.length - 1];
  return { times, frames, duration, loopDuration: duration + LOOP_BLEND_SECONDS };
}

export function smoothStep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

// Preserve all recorded frames at their timestamps, then bridge the end to the start.
// This short bridge is a presentation transition, not an extra recorded gait cycle.
export function sampleJointMotion(clip, seconds, out = new Float64Array(GO2_JOINTS.length)) {
  const t = ((seconds % clip.loopDuration) + clip.loopDuration) % clip.loopDuration;
  let first, second, mix;
  if (t > clip.duration) {
    first = clip.frames[clip.frames.length - 1];
    second = clip.frames[0];
    mix = smoothStep((t - clip.duration) / LOOP_BLEND_SECONDS);
  } else {
    let low = 0, high = clip.times.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (clip.times[middle] <= t) low = middle;
      else high = middle;
    }
    first = clip.frames[low];
    second = clip.frames[high];
    mix = (t - clip.times[low]) / (clip.times[high] - clip.times[low]);
  }
  for (let i = 0; i < out.length; i++) out[i] = first[i] + (second[i] - first[i]) * mix;
  return out;
}

export function poseAngles(pose) {
  return Float64Array.from(GO2_JOINTS, name =>
    name.includes('_hip_') ? 0 :
      name.includes('_thigh_') ? (pose === 'crouch' ? 1.22 : 0.7) :
        (pose === 'crouch' ? -2.33 : -1.4));
}
