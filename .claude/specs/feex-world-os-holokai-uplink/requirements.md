# Requirements Document: Feex World OS // HoloKai Uplink Terminal

## 1. Overview
The Feex World OS // HoloKai Uplink transforms the root experience (`/`) into a planetary command terminal embodying the grand FeexSystems vision. The system provides an interactive 3D viewport of the planetary Q-Core and its orbiting ecosystems, rendered in a clinical Swiss Typographic monochromatic wireframe aesthetic with `#00ff41` matrix phosphor green accents, accompanied by a voice & text conversational modal powered by the Google Gemini Interactive API (`gemini-3.7-flash`).

## 2. Orbiting Ecosystem Domains
1. **3WM DSP SONIK**: Audio platform & procedural sound synthesis engine (BushFeexer).
2. **YURRHEELER MED-NET**: 16 specialized medical AI diagnostics & tele-health mesh.
3. **FARMPLUG AI**: Voice crop guidance, soil sensor fusion, and localized market intelligence.
4. **FIREHOUSE GRILLS**: Culinary thermal engineering, IoT telemetry, and industrial kitchen mesh.
5. **FEEXKEEVOLT SECURITY**: High-assurance cryptographic security, hardware root of trust, and enclave protection.
6. **KAPPAXCHANGEFIN**: Decentralized finance, algorithmic liquidity routing, and trading matrix.
7. **RENTALL SMARTS HOMES**: Autonomous property IoT, smart locks, and tenant energy grids.
8. **FEEX WORLD OS / HOLOKAI**: Central planetary operating system & cognitive AI persona.

## 3. Functional Requirements (EARS Format)

### 3.1 Visual Aesthetic & Monochromatic HUD
- **REQ-AESTH-01 (WHERE)**: WHERE the Feex World OS terminal is rendered, the viewport SHALL adhere strictly to a Swiss Typographic clinical monochromatic aesthetic with `#050505` deep black void, 40px subtle gridlines, and `#00ff41` neon green as the sole accent color.
- **REQ-AESTH-02 (WHILE)**: WHILE the terminal is active, the system SHALL display an animated horizontal scanline (`0.08` opacity), a 350px circular radar reticle with crosshairs and center green dot, and live hexadecimal telemetry crawls `[0xXXXX]`.
- **REQ-AESTH-03 (WHERE)**: WHERE HUD telemetry panels are displayed, each panel SHALL render cybernetic corner brackets (`::before`, `::after`) and monochromatic high-contrast data rows.

### 3.2 Planetary 3D Scene & Orbiting Satellites
- **REQ-3D-01 (WHERE)**: WHERE the 3D WebGL scene is initialized, the system SHALL render a central wireframe planetary core featuring an icosahedron Q-Core in pulsing `#00ff41` neon green, surrounded by gyroscopic Torus rings and monochrome architecture plates.
- **REQ-3D-02 (WHERE)**: WHERE the planetary orbit is initialized, the system SHALL render 8 distinct 3D satellite nodes positioned in an orbit around the central core, each labeled with 3D Swiss Typographic tags for: 3WM, YURRHEELER, FARMPLUG, FIREHOUSE GRILLS, FEEXKEEVOLT, KAPPAXCHANGEFIN, RENTALL SMARTS HOMES, and FEEX WORLD OS.
- **REQ-3D-03 (WHEN)**: WHEN an operator selects an ecosystem satellite node (via clicking the 3D node or header pill), the system SHALL smoothly target the camera towards the selected world, trigger Sonik cyber audio feedback, update telemetry panels `[L1-L5]` & `[R1-R5]`, and output a domain-specific briefing in the HoloKai `SYS_LOG`.
- **REQ-3D-04 (WHILE)**: WHILE the 3D viewport is focused, the system SHALL allow the operator to fly a probe drone using standard `W, A, S, D` keyboard controls or the on-screen virtual tactile joystick.

### 3.3 HoloKai Voice & Text Hybrid Modal (Gemini Interactive API)
- **REQ-VOICE-01 (WHEN)**: WHEN the operator clicks the `[VOICE UPLINK // HOLOKAI]` action button or issues a voice trigger, the system SHALL present a slide-up holographic voice & text modal without leaving the 3D planetary terminal.
- **REQ-VOICE-02 (WHERE)**: WHERE the voice modal is open, the system SHALL display an active real-time oscilloscope waveform visualizer in phosphor neon green (`#00ff41`) rendered on an HTML5 canvas.
- **REQ-VOICE-03 (WHEN)**: WHEN the operator clicks the push-to-talk microphone button, the system SHALL capture speech via the Web Speech API and transcribe the input into the terminal input console.
- **REQ-VOICE-04 (WHEN)**: WHEN a query is submitted (via voice transcript or typed text), the system SHALL transmit the request to the backend `POST /api/world-model/navigator` endpoint utilizing the Google Gemini Interactive API (`gemini-3.7-flash`) with multi-turn history and grounded World Model entities.
- **REQ-VOICE-05 (WHEN)**: WHEN a response is received from HoloKai, the system SHALL render the markdown explanation, display suggested follow-up prompts, and vocalize the response via Web Speech Synthesis (TTS) accompanied by visual audio frequency pulses.
- **REQ-VOICE-06 (IF)**: IF the operator toggles the audio mute switch, the system SHALL immediately silence voice playback while maintaining full text generation and visual telemetry.

### 3.4 Dual Mode Routing & Navigation
- **REQ-NAV-01 (WHERE)**: WHERE the operator desires the traditional 2D marketing SaaS website, the system SHALL provide a dedicated "Technical Dossier" button in the header bar that smoothly switches the view to `/?view=dossier`.
- **REQ-NAV-02 (WHERE)**: WHERE the operator desires the full-screen 3D Spatial Knowledge Galaxy, the system SHALL provide a direct navigation link to `/world`.

## 4. Acceptance Criteria
- [ ] Visual aesthetic is 100% monochromatic black/white/gray wireframe with `#00ff41` neon green accents.
- [ ] 8 orbiting ecosystem satellites are physically present in 3D orbit around the central core.
- [ ] Selecting any ecosystem satellite updates telemetry and HoloKai SYS_LOG.
- [ ] HoloKai Voice Modal opens cleanly, captures microphone input, communicates with Gemini Interactive API, and vocalizes responses with real-time waveform visualization.
- [ ] Operator can fly probe drone with WASD and virtual joystick.
