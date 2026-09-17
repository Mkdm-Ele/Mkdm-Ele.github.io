import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { GO2_JOINTS, parseJointMotion, sampleJointMotion } from '../src/go2-motion.js';

const csv = await readFile(new URL('../public/models/go2/motions/run.csv', import.meta.url), 'utf8');
const clip = parseJointMotion(csv);
const almost = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('real recording maps 12 named radian joints, irrespective of column order', () => {
 assert.equal(clip.frames.length, 501);
 almost(clip.duration, 10, 1e-6);
 almost(clip.times[1] - clip.times[0], .02, 1e-8);
 const [header, ...rows] = csv.trim().split(/\r?\n/).map(line => line.split(','));
 const names = header.map(value => value.replace(/^\uFEFF/, ''));
 GO2_JOINTS.forEach((name, i) => almost(clip.frames[0][i], Number(rows[0][names.indexOf(name + '_rad')])));
 const reordered = [names, ...rows].map(row => row.toReversed().join(',')).join('\n');
 assert.deepEqual(parseJointMotion(reordered).frames, clip.frames);
});

test('recording obeys all model limits, with no implicit clamping or sign changes', async () => {
 const urdf = await readFile(new URL('../public/models/go2/go2.urdf', import.meta.url), 'utf8');
 const doc = new JSDOM(urdf, { contentType: 'text/xml' }).window.document;
 GO2_JOINTS.forEach((name, i) => {
  const limit = doc.querySelector(`joint[name="${name}"] > limit`);
  assert.ok(limit, name);
  const low = Number(limit.getAttribute('lower')), high = Number(limit.getAttribute('upper'));
  assert.ok(clip.frames.every(frame => frame[i] >= low && frame[i] <= high), name);
 });
});

test('sampling follows recorded timestamps and interpolates between adjacent frames', () => {
 const index = 175;
 const exact = sampleJointMotion(clip, clip.times[index]);
 exact.forEach((value, i) => almost(value, clip.frames[index][i]));
 const between = sampleJointMotion(clip, (clip.times[index] + clip.times[index + 1]) / 2);
 between.forEach((value, i) => almost(value, (clip.frames[index][i] + clip.frames[index + 1][i]) / 2));
 // Nonuniform timestamps and an arbitrary time origin must work too.
 const rows = csv.trim().split(/\r?\n/).slice(0, 4);
 for (let i = 1; i < rows.length; i++) rows[i] = [7 + [0, .04, .13][i - 1], ...rows[i].split(',').slice(1)].join(',');
 const irregular = parseJointMotion(rows.join('\n'));
 const result = sampleJointMotion(irregular, .085);
 result.forEach((value, i) => almost(value, (irregular.frames[1][i] + irregular.frames[2][i]) / 2));
});

test('loop preserves the final recorded pose and continuously returns to the first', () => {
 sampleJointMotion(clip, clip.duration).forEach((value, i) => almost(value, clip.frames.at(-1)[i]));
 const before = sampleJointMotion(clip, clip.loopDuration - 1e-6);
 const start = sampleJointMotion(clip, clip.loopDuration);
 before.forEach((value, i) => almost(value, start[i], 1e-7));
 start.forEach((value, i) => almost(value, clip.frames[0][i]));
 sampleJointMotion(clip, clip.loopDuration * 4 + 1.3).forEach((value, i) =>
  almost(value, sampleJointMotion(clip, 1.3)[i]));
});

test('malformed data fails explicitly rather than animating incorrect joints', () => {
 const lines = csv.trim().split(/\r?\n/).slice(0, 3);
 assert.throws(() => parseJointMotion(lines[0]), /two frames/);
 assert.throws(() => parseJointMotion(lines.join('\n').replace('FL_hip_joint_rad', 'unknown')), /column/);
 const duplicate = lines.slice(); duplicate[2] = duplicate[1];
 assert.throws(() => parseJointMotion(duplicate.join('\n')), /strictly increase/);
 for (const invalid of ['NaN', '', 'Infinity']) {
  const bad = lines.slice(); const row = bad[1].split(','); row[1] = invalid; bad[1] = row.join(',');
  assert.throws(() => parseJointMotion(bad.join('\n')), /Invalid motion value/);
 }
});
