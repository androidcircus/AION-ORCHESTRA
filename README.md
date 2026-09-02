# AION ORCHESTRA

AION ORCHESTRA - A Cyberpunk Nebula Music Creation Suite. Featuring generative Royal Blue & Purple textures and professional Native VST support.

## Key Features
- **Library of Congress Suite:** Historic generative models of the "Betts" Stradivarius (1704), James Madison's Crystal Flute (1813), the Buchla Model 100 Modular Synth, and the Pleyel Harpsichord.
- **Worldwide Orchestral Suite:** High-fidelity models for global instruments including ensemble Strings, Brass, Woodwinds, Physical Model Guitar, and World Percussion.
- **Signature Instruments:** Built-in AION-808, AION-VINTAGE (EPiano), NEBULA-PAD, and PULSE-LEAD synthesis models.
- **Cyberpunk UI:** High-end Royal Blue/Purple neon theme with nebula-drift backgrounds and "Orbitron" branding.
- **Native VST (Nebula Edition):**
    - **8-Knob Producer View:** Drive, Warmth, Tone, Bias, Width, Reverb, Sidechain, Mix.
    - **4x Oversampling:** High-fidelity processing to eliminate digital aliasing.
    - **Asymmetric Saturation:** "Tubes & Tape" mode for even-order harmonic richness.
    - **Tilt EQ:** Analog-style tone balance for instant frequency shaping.
    - **Master Limiter:** Professional-grade safety ceiling to prevent clipping.
    - **Core Engine Selector:** Switch between different signature shaper models.
- **AION Core Engine 4.2 (Cloud):**
    - **Neural Refinement:** Soundraw-style remixing for Energy, Warmth, and Style.
    - **Studio Stems Export:** High-quality stereo WAVs ready for Audacity/Ableton.
    - **Advanced DSP:** Algorithmic reverb, sidechain ducking, Tilt EQ, and master limiting.

## Multi-Platform Bridge (Android, PC, iOS)
AION Orchestra is fully hybrid-ready for mobile and desktop.

### Android (APK)
- **Local Sync:** Run `pnpm --filter @workspace/aion-orchestra run mobile:sync`.
- **Local Build:** Open `artifacts/aion-orchestra/android` in Android Studio and run `./gradlew assembleDebug`.

### Windows (PC EXE)
- **Local Sync:** Run `pnpm --filter @workspace/aion-orchestra run desktop:sync`.
- **Local Build:** Run `pnpm --filter @workspace/aion-orchestra run desktop:open` to preview, or use Electron Builder to package.

### iOS & Mac (iPhone/macOS)
- **Local Sync:** Run `pnpm --filter @workspace/aion-orchestra run mobile:sync:ios`.
- **Local Build:** Open `artifacts/aion-orchestra/ios/App` in Xcode. (Requires macOS).

## Downloads (Latest Alpha)
Access the latest public builds directly from GitHub:

- 📱 [**Android APK**](https://github.com/androidcircus/AION-ORCHESTRA/releases/latest/download/app-debug.apk)
- 💻 [**Windows EXE**](https://github.com/androidcircus/AION-ORCHESTRA/releases/latest/download/AION-Orchestra-Setup.exe)
- 🍎 [**iOS/macOS App**](https://github.com/androidcircus/AION-ORCHESTRA/releases/latest) (Requires Xcode/macOS)

## GitHub Automation
- **Multi-Platform Build:** Every push to `main` triggers a GitHub Action that generates:
    - **Nebula APK** (Android)
    - **Nebula EXE** (Windows PC)
    - **Nebula App** (iOS Debug)
- **Artifacts:** Access the latest builds directly from your GitHub Actions dashboard.

## Directory Structure
- `artifacts/aion-orchestra/src/App.tsx`: Cyberpunk Producer Workspace.
- `artifacts/aion-orchestra/src/pages/voice-to-instrument.tsx`: Voice-to-instrument studio and performance library.
- `artifacts/api-server/src/lib/dsp.ts`: Core TypeScript DSP and Instrument modules.
- `lib/api-spec/openapi.yaml`: Source of truth for the AION API contract.
- `plugins/WarmAionSaturation/`: Native C++ JUCE project for Nebula VST development.
