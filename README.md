# Mkdm-Ele — personal robotics website

A light, tactile Neumorphism portfolio built with Vite, Three.js, and urdf-loader, with a Supabase-backed Markdown blog.

## Run

```sh
npm install
npm run dev
```

- Local website: http://localhost:5173
- Blog: http://localhost:5173/blog/
- Editor: http://localhost:5173/admin/

Copy `.env.example` to `.env.local` and fill in the public Supabase configuration on a new machine. For this workspace, it is already configured. Complete the one-time database setup in [BLOG-SETUP.md](BLOG-SETUP.md).

## Build

```sh
npm run build
npm run preview
```

Deploy `dist/` at the domain root. The build includes physical entry pages for `/blog/` and `/admin/`; articles use `/blog/?post=slug`. Blog content stays in Supabase and does not require a rebuild when updated. Configure the deployment's public environment variables and Supabase redirect URLs as described in the setup guide.

## Where to edit

- `src/home.js`: biography, homepage headings, VOP-Nav keywords, gallery captions.
- `src/style.css`: original portfolio appearance.
- `src/robot.js`: interactive Go2 viewer and playback controls.
- `src/go2-motion.js`: joint mapping, timestamp interpolation, and loop transition.
- `public/models/go2/motions/run.csv`: recorded running motion; replace with the same named time/joint columns.
- `src/blog/blog.css`: blog and editor appearance.
- `src/blog/public.js`: article list and reading page.
- `src/blog/admin.js`: GitHub login and writing desk.
- `src/blog/editor.js` / `src/blog/editor.css`: the Vditor instant-rendering editor and its appearance.
- `src/blog/image-tools.js`: visual image insertion, pointer dragging and side-by-side rows.
- `src/blog/image-resize.js`: proportional corner/edge resizing, keyboard sizing and persistent display widths.
- `supabase/003-blog-images.sql`: one-time owner-only upload permissions and public image bucket.
- `supabase/001-blog.sql`: database schema and access rules.
- `supabase/002-owner.sql`: assign the one owner by Supabase user UUID.

## Content and behavior

- Compact English SJTU biography and linked avatar.
- Actual supplied Go2 URDF with official Unitree visual meshes and joint limits.
- Orbit, pan, zoom, reset, fullscreen where supported, manual auto-rotation, and stand/crouch/run transitions. Run replays the supplied 12-joint recording with pause, speed selection, and seeking.
- Keyboard controls on the viewer: arrows to orbit, +/− to zoom, R to reset.
- VOP-Nav four-figure gallery with an accessible native dialog.
- Public blog list and Markdown reading pages, with inline/display LaTeX math and Chinese/English italics.
- Owner-only Markdown editor with a full-width Typora-style instant-rendering surface, focus mode, Ctrl/Cmd+S, drafts, publishing, unpublishing, deletion, and concurrent-edit checks.
- Centered visual images with hidden source markers, drag-to-reorder / side-by-side rows, image settings, undo/redo, and optional local-file / clipboard upload (requires `003-blog-images.sql`).
- Database-enforced permissions: visitors can only read published posts; only the owner can write or see drafts.
- Responsive layout, self-hosted fonts and model assets, and reduced-motion support.

Image and font provenance is documented in `ASSET-SOURCES.md`. The supplied avatar and research images remain unchanged. The URDF view demonstrates joint poses; it is not a physics simulator or an implementation of the VOP-Nav policy.

Go2 meshes total approximately 26 MB before transfer compression. They load only on the homepage.

## Checks

```sh
npm test
npm run dev
# In another terminal (Chrome installed):
npm run test:browser
npm run build
```

Vditor and KaTeX runtime resources are copied from the installed package by `predev` / `prebuild` and served on the website’s own origin. The writing desk does not require a third-party CDN.

The SQL tests use an isolated local PostgreSQL runtime. Browser tests mock Supabase and never mutate the real project; complete a real login and save after database initialization.

## Go2 running recording

Click **Run** next to Stand and Crouch. The CSV loads on demand. **Pause / Resume**, the timeline, and **0.5× / 1× / 1.5× / 2×** control playback; Stand or Crouch exits running. Leaving the viewer offscreen or switching browser tabs suspends playback.

The original recording `20260916_191436_507251.csv` is preserved as `public/models/go2/motions/run.csv`: 501 frames, approximately 10 seconds at 50 Hz, in radians. Columns are matched to the URDF by joint name, regardless of column order. All recorded values fall within the supplied URDF limits. Frames are linearly interpolated using the recorded timestamps. A 0.24-second end-to-start transition prevents a pose jump when looping; mode switches blend over 0.35 seconds.

This is an in-place replay of joint angles. The CSV has no base position, orientation, or contact data. The body is kept upright and its display height follows the lowest foot; body translation and aerial phases cannot be reconstructed from this recording alone. No physics or policy simulation is implied.

## VOP-Nav episode replay

The Go2 console now has Stand, Crouch, Run and VOP-Nav modes. VOP-Nav replays the supplied `episode.json`: 478 frames at approximately 50 Hz, lasting 9.54 seconds. The robot follows its recorded base position, quaternion and 12 named joint angles. Eight moving obstacles, six static obstacles and two walls share the same recorded world frame. Start/goal markers and the recorded/travelled path are projected onto the floor.

Controls: pause/resume, seek, playback speed, replay at the final frame, Overview / Follow Go2 / Top view, orbit/pan/zoom, reset, fullscreen, and trajectory visibility. Navigation stops at the final recorded frame instead of inventing a loop between the goal and the start. The displayed success status comes from the recording. This is an episode replay, not browser-side policy inference or a new simulation.

Open **Velocity perception** to compare the recorded VOP prediction (orange) and geometric oracle (dashed gray). The chart is in the robot body-yaw velocity frame, measured in m/s; forward is up and left is left. The dark dot shows recorded body velocity. These arrays use the preceding recorded frame during interpolation, and the chart identifies that frame explicitly.

Implementation:
- `src/vop-episode.js`: validation, named-joint mapping, linear interpolation and normalized quaternion SLERP.
- `src/vop-scene.js`: obstacles, start/goal, path, camera presets, and obstruction fading to keep Go2 visible.
- `src/vop-perception.js`: optional recorded safe-velocity chart.
- `public/models/go2/motions/vop-nav/episode.json`: 791 KB replay data, downloaded only when selected.
- `public/models/go2/motions/vop-nav/perception.bin`: optional 2.63 MiB float32 little-endian velocity intervals, downloaded only when the chart opens.

To replace the recording, run `node scripts/prepare-episode.mjs "C:/path/to/episode.json"`, then build normally. The conversion preserves every recorded pose, joint position, timestamp and velocity region. Training checkpoint paths, raw sensor histories and unused configuration are not published. The source SHA-256 is retained in the generated JSON for traceability.

Coordinates are rebased using `env_origin`, then converted from simulator Z-up `(x,y,z)` to viewer Y-up `(x,z,-y)`. Obstacles use recorded dimensions/orientation and are displayed as boxes/cylinders. The base pose is never floor-fitted in this mode. One recorded FR calf angle exceeds this viewer URDF's upper limit by 0.000178 rad; episode replay preserves this value without clamping (validation allows at most 0.001 rad of overshoot). Normal joint limits are restored when leaving VOP-Nav.

Validation: all original frames and all 688,320 perception values were compared exactly with the supplied file. Automated checks cover coordinates, mapping, interpolation, end-of-episode state, malformed data, mode switching, camera controls, mobile layout, lazy loading and retry/cancellation.
