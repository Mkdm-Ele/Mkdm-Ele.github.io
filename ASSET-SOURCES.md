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
