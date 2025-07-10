# LoFi Engine
<p align="center">
    <img alt="Icon" align="center" width="100" height="100" src="app-icon.png" />
</p>

Generate LoFi music on the go. You create your own atmosphere; LoFi Engine sets the mood.

<p align="center">
  <a href="https://github.com/meel-hd/lofi-engine/releases/tag/app-v1.0.0">
    <img src="https://img.shields.io/badge/Download-LoFi_Engine-blue?style=for-the-badge&logo=github" alt="Download">
  </a>
</p>

<p align="center">
   <img  alt="Screenshot" src="screenshots/screenshot.jpeg" />
</p>

## Table of Contents

- [Introduction](#lofi-engine)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)
- [Features](#features)
- [Run Locally](#run-locally)
- [Contributing](#contributing)
- [License](#license)

## Tech Stack

[![Svelte](https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=Tauri&logoColor=white)](https://tauri.app/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Tone.js](https://img.shields.io/badge/Tone.js-009688?style=for-the-badge&logo=javascript&logoColor=white)](https://tonejs.github.io/)

## Roadmap
- [x] Procedural LoFi track generation using Tone.js
- [x] Customizable ambient tracks
- [x] Customizable effects
- [x] Customizable look and feel
- [x] Keyboard shortcuts for all actions
- [x] Offline support
- [x] Cross-platform support (Linux, Mac, Windows)
- [ ] Browser deployment with a domain
- [ ] Mobile support (iOS, Android)
- [ ] More customization options and effects
- [ ] Improved procedural generation algorithms
- [ ] User feedback integration



## Features
* Create your own LoFi studio with your unique music with minimal touches from this and that. Be the Artist.
* Works with major desktop platforms: **Linux**, **Mac**, and **Windows**.
* Doesn't require an internet connection; your experience is fully private.
* LoFi Engine's main focus is **customization**, **accessibility**, and **artistic freedom**.

### Customization
1. **Playback**: If you want to listen to music or just listen to birds singing freely, you choose.
2. **Look**: With carefully crafted artworks from talented artists, long study sessions become a joy.
3. **Ambience**: A windy evening or the sound of waves crashing into the sand of a sunny beach brings peace.

### Accessibility
Any action or click you can do with the mouse has a shortcut for it with the keyboard. For playback, effects, ambient tracks, look, etc.

All information about the app and **shortcuts** is available in the *info box* accessible via the **ESC** key.

![info-box](screenshots/info-box.png)

### Procedural LoFi Track Generation

The LoFi track is now generated procedurally using **Tone.js**, providing a dynamic and unique listening experience every time. We are actively seeking feedback from users to refine and improve the track generation process. Your input will help us enhance the quality, variety, and customization of the generated music.

If you have suggestions or encounter any issues, please let us know by opening an issue or contributing directly to the project. Together, we can make LoFi Engine even better!

## Run Locally

To run LofiEngine locally, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [pnpm](https://pnpm.io/) (v6 or later)
- [Rust](https://www.rust-lang.org/) (latest stable version)
- [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) (based on your operating system)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/meel-hd/lofi-engine
   cd lofi-engine
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

### Development

To run the app in development mode:

```
pnpm tauri:d
```

This command will start both the Vite dev server for the frontend and the Tauri development process for the native shell.

### Building

To build the app for production:

```
pnpm tauri:b
```

This will create a production-ready build of your application in the `src-tauri/target/release` directory.

### Additional Commands

- `pnpm dev`: Run the Vite development server without Tauri
- `pnpm build`: Build the frontend assets without Tauri
- `pnpm preview`: Preview the built frontend
- `pnpm check`: Run Svelte type checking

## Contributing
We welcome contributions from the community! If you're interested in contributing to LoFi Engine, please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with clear and descriptive messages.
4. Push your changes to your fork.
5. Open a Pull Request to the `main` branch of this repository.

## License
This project is licensed under the [MIT License](LICENSE).
Feel free to use, modify, and distribute this code as per the terms of the license.

## What's New: Voice Narration

The latest update adds AI voice narration that seamlessly integrates with the Lo-Fi music:

- **3 Voice Channels**: News, Education, and Weather content
- **Auto-Ducking**: Music automatically lowers when voice plays
- **Stop Control**: Easily stop narration mid-playback
- **Volume Control**: Adjust voice volume independently
- **Keyboard Shortcuts**: V to open menu, 1-3 to play content

## Voice Content

The voice narration feature includes:
- **News**: Latest updates and headlines
- **Education**: Learn something new
- **Weather**: Current conditions and forecasts

Voice clips are pre-loaded for instant playback with <2s latency.

## Technical Details

- **Framework**: Svelte + Vite
- **Audio Engine**: Tone.js
- **Music Generation**: Procedural using chord progressions
- **Voice Integration**: Pre-recorded ElevenLabs clips
- **Mixing**: Real-time audio ducking and level management

## Building for Production

```bash
# Build the application
pnpm tauri:b

# Preview the production build
pnpm tauri:d
```

## Desktop App (Tauri)

To build as a desktop application:

```bash
# Development
pnpm tauri:d

# Build
pnpm tauri:b
```

## Credits

- Original Lo-Fi Engine by [original author]
- Voice narration integration for MVP testing
- ElevenLabs for voice synthesis
- Tone.js for audio processing
