# Asset evaluation — 16 September 2026

All displayed imagery is either explicitly supplied by the owner or fetched from its original publisher. No generated artwork or generic stock imagery is used.

| Asset | Source | Evaluation and use |
| --- | --- | --- |
| Profile picture | User-provided image; profile https://github.com/Mkdm-Ele | Preserved the exact requested avatar. The avatar links to the provided GitHub profile. Yellow appears only inside this supplied photograph; no yellow is used in the UI palette. |
| Go2 description | User-provided `go2_description.urdf` | Preserved the original link/joint definitions, including 12 actuated joints. |
| Seven Go2 DAE meshes | https://github.com/unitreerobotics/unitree_ros/tree/master/robots/go2_description/dae | Official Unitree source. Filenames match the supplied URDF; geometry and materials display successfully in the browser. Downloaded and hosted locally, shared meshes are loaded only once. Upstream license is preserved under `public/models/go2/LICENSE`. |
| Four VOP-Nav figures | User-supplied files; corroborated against https://arxiv.org/html/2607.15036v1 | Subject and diagrams correspond to the paper. Originals are preserved at supplied resolution, with contain sizing for diagrams and an enlarged dialog. Publication rights remain with the respective authors. |
| Research description | https://arxiv.org/abs/2607.15036 | The title, date and concise method description are verified against the paper. No unverified performance numbers or personal contribution claims are added. |
| Requested article | https://mp.weixin.qq.com/s/MJ0KtTtTbK9Lg5eA-efciw | Direct retrieval failed. Kept as the “Read the story” link; content was corroborated with the primary paper instead. |
| DM Sans / DM Mono | https://github.com/google/fonts/tree/main/ofl/dmsans and https://github.com/google/fonts/tree/main/ofl/dmmono | SIL OFL fonts. Bundled with Fontsource for local loading. DM Sans provides the soft geometric lettering; DM Mono is reserved for small instrument labels. |
| Interface icons | https://lucide.dev/ | ISC licensed Lucide icons; only the selected icons are bundled. |
| Art direction | https://www.openai.fm/ ; designer case study https://justinjay.wang/openai-fm/ | Used as an interaction and visual reference (muted monochrome surfaces and tactile controls); no screenshot is used as page content. Direct browser access to the original timed out; indexed reference images were evaluated. |
| URDF interaction reference | https://urdf.enkeebot.com/ | Reference for direct model inspection. Implemented locally using Three.js, OrbitControls and urdf-loader, without embedding the external service. |

The interface uses cold gray-white `#edf0f2`, graphite text, and a restrained deep green accent. No cream, beige, or pale yellow background is used.


## Orange accent and instant Markdown editor

- The interface accent `#FF4A00` is taken from the official OpenAI.fm stylesheet: https://github.com/openai/openai-fm/blob/main/src/app/globals.css . Small text uses a darker orange `#B93600` for contrast against the light gray surface.
- Vditor 4.0.0 provides Typora-style instant rendering: https://github.com/Vanessa219/vditor . License: MIT. Editor scripts, language data, icons and styles are installed with npm and served locally. The runtime asset copy includes its LICENSE.

## Recorded Go2 running motion

- User-supplied `20260916_191436_507251.csv`, copied unchanged to `public/models/go2/motions/run.csv`.
- Evaluated: 501 finite samples, strictly increasing timestamps spaced approximately 0.02 seconds apart; 12 named hip/thigh/calf joints in radians; every value within the supplied URDF limits.
- Used for an in-place interactive replay. Original data is not generated or modified. Interpolation and a short loop transition are applied only during playback.

- KaTeX 0.18.7 renders inline and display math in both the writing desk and public articles: https://katex.org/docs/supported.html . License: MIT. Scripts, CSS and fonts are served locally; the editor asset copy includes its LICENSE. Public rendering keeps authored HTML sanitization separate from trusted KaTeX output (`trust: false`).
- marked-katex-extension 5.1.13 supplies Markdown math tokenization: https://github.com/UziTech/marked-katex-extension . License: MIT.

## VOP-Nav replay data

- Source: user-supplied `episode.json` (2026-09-17); task `go2_pos_voprl`, environment `NarrowStandardEnv`, seed 1. Successful recorded episode, duration 9.54 s, path length 13.663 m, final planar goal distance 0.107 m.
- Evaluation: includes named joints, SI units, world pose layout, explicit obstacle dimensions, origin, bounds and timestamps; suitable for faithful synchronized replay. All 478 poses/joint arrays and obstacle states were checked against the generated site asset. The separate perception asset exactly preserves the source float32 VOP/GT values.
- Rendering uses the existing Unitree Go2 URDF/meshes. Obstacle primitives use the provided shapes and dimensions. Walls are translucent; obstacles intersecting the view to the robot fade for visibility. These are presentation choices and do not change the recorded trajectory.
- Quaternion interpolation reference: https://threejs.org/docs/pages/Quaternion.html . No external textures, icons or model assets were needed for the episode scene.
