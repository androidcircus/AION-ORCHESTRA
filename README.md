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

## Nebula Mobile Bridge (APK)
AION Orchestra is hybrid-ready.
- **GitHub Automation:** Every push to `main` or `master` triggers a GitHub Action that builds a fresh **Nebula APK**.
- **Local Sync:** Run `pnpm --filter @workspace/aion-orchestra run mobile:sync` to sync the web app to the Android project.
    - *Note:* If running for the first time, you may need to run `npx cap add android` inside `artifacts/aion-orchestra/`.
- **Local Build:** Use Android Studio to open the `artifacts/aion-orchestra/android` folder (after running sync) to build and run on your device.

## GitHub Integration
- **Branch Tracking:** The `AION NEBULA - Mobile Sync & Build` workflow ensures that your GitHub repo always stays updated with a verified build.
- **Artifacts:** Access the latest built APK directly from your GitHub Actions dashboard.

## Directory Structure
- `artifacts/aion-orchestra/src/App.tsx`: Cyberpunk Producer Workspace.
- `artifacts/aion-orchestra/src/pages/voice-to-instrument.tsx`: Voice-to-instrument studio and performance library.
- `artifacts/api-server/src/lib/dsp.ts`: Core TypeScript DSP and Instrument modules.
- `lib/api-spec/openapi.yaml`: Source of truth for the AION API contract.
- `plugins/WarmAionSaturation/`: Native C++ JUCE project for Nebula VST development.
