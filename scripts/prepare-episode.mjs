import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseEpisode } from '../src/vop-episode.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-episode.mjs path/to/episode.json');
const bytes = await readFile(source);
const raw = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const destination = fileURLToPath(new URL('../public/models/go2/motions/vop-nav/', import.meta.url));
const episode = Object.fromEntries(['schema_version', 'room', 'dt', 'start', 'goal', 'end', 'goal_radius',
  'env_origin', 'room_bounds', 'joint_names', 'success', 'success_rule'].map(key => [key, raw[key]]));
episode.source_sha256 = createHash('sha256').update(bytes).digest('hex');
episode.obstacles = raw.obstacles.map(({ id, kind, shape, dimensions_m, dimension_order }) =>
  ({ id, kind, shape, dimensions_m, dimension_order }));
episode.frames = raw.frames.map(frame => ({ t: frame.t, robot: frame.robot.slice(0, 7),
  joint_position: frame.joint_position, base_linear_velocity: frame.base_linear_velocity,
  obstacles: frame.obstacles.map(pose => pose.slice(0, 7)) }));
// Separate optional perception data: the 3D replay never waits for these 360-ray arrays.
const angles = raw.vo_angles;
const buffer = Buffer.alloc(raw.frames.length * angles.length * 4 * 4);
let offset = 0;
for (const frame of raw.frames) for (let ray = 0; ray < angles.length; ray++) {
  for (const value of [...frame.vop[ray], ...frame.vo_gt[ray]]) {
    if (!Number.isFinite(value)) throw new Error('Invalid perception value');
    buffer.writeFloatLE(value, offset); offset += 4;
  }
}
episode.perception = { angles, max_speed: raw.vo_max, frame_count: raw.frames.length,
  components: ['predicted_min', 'predicted_max', 'oracle_min', 'oracle_max'],
  encoding: 'float32-le', url: '/models/go2/motions/vop-nav/perception.bin',
  semantics: raw.vo_semantics };
parseEpisode(episode);
await mkdir(destination, { recursive: true });
await writeFile(destination + '/episode.json', JSON.stringify(episode));
await writeFile(destination + '/perception.bin', buffer);
console.log(`Prepared ${episode.frames.length} frames; replay ${(JSON.stringify(episode).length / 1024).toFixed(0)} KB, optional perception ${(buffer.length / 1024).toFixed(0)} KB. Original poses and joints preserved; training paths omitted.`);
