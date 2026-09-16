# Mkdm-Ele — personal robotics website

A light, tactile Neumorphism portfolio built with Vite, Three.js, and urdf-loader.

## Run

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

The `dist/` folder is a complete static website. Host it at the domain root. No API keys or runtime backend are needed.

## Content and behavior

- Compact English SJTU biography and linked avatar.
- Actual supplied Go2 URDF with official Unitree visual meshes and joint limits.
- Orbit, pan, zoom, reset, fullscreen where supported, manual auto-rotation, and stand/crouch pose transitions.
- Keyboard controls on the viewer: arrows to orbit, +/− to zoom, R to reset.
- VOP-Nav four-figure gallery with an accessible native dialog, previous/next buttons, arrow keys, and Escape to close.
- Responsive layout, self-hosted fonts and model assets, reduced-motion support for UI transitions, and rendering paused offscreen.

Image and font provenance is documented in `ASSET-SOURCES.md`. The supplied avatar and research images remain unchanged. The URDF view demonstrates joint poses; it is not a physics simulator or an implementation of the VOP-Nav policy.

Go2 meshes total approximately 26 MB before transfer compression. They are cached and reused within the viewer. Initial loading on slow connections may take time; loading and error states are provided.

Validation completed: production build, browser model loading, pose controls, reset and rotation, gallery selection and enlargement, and mobile/desktop overflow checks.
