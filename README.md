# 1337emoji

**Emoji flood transitions for Premiere Pro and After Effects.** Pick the exact emoji you want, preview the motion live, then hit one button: the panel renders a transparent clip and drops it on your timeline at the playhead.

![1337emoji demo](docs/demo.gif)

### ⬇️ [Download 1337emoji for macOS (v2.1)](https://github.com/GFXER/1337emoji/releases/latest/download/1337emoji-mac.zip)

macOS · Premiere Pro 2020+ · After Effects 2020+ · Apple Silicon ready (ffmpeg included)

---

## Features

- **Emoji picker:** 1,945 emoji in 12 categories, with search. Click to add, shift-click to add more of the same one (weights the mix).
- **Live preview** of the exact transition, on an A|B cut, a transparency checker or a gradient.
- **11 directions:** left/right, up/down, 4 corner diagonals, burst out, implode, rain from all sides.
- **Sliders:** count (1–300), duration, stagger, size, size variance, spin, wobble, motion blur (shutter %).
- **Ease:** Linear, Smooth, Expo, Snap. Pop-in toggle. *Centre on playhead* puts the densest frame right on your cut.
- **No timeline lag:** it renders once to **ProRes 4444 with alpha** (sequence size and fps), so playback is just a normal clip. Real sub-frame motion blur.
- Clips land on the first free video track above V1 (a new track is added if needed) and go into a `1337emoji` bin. In After Effects it adds a layer to the active comp.

## Install (2 minutes)

1. **[Download the zip](https://github.com/GFXER/1337emoji/releases/latest/download/1337emoji-mac.zip)** and double-click it to unzip.
2. Open the `1337emoji` folder and double-click **`Install 1337emoji.command`**.
   - If macOS says it *"can't be opened because it is from an unidentified developer"*: **right-click** the file → **Open** → **Open**.
   - A Terminal window shows `✓ Panel installed` and `✓ ffmpeg ready`. Press Return to close it.
3. **Quit and reopen** Premiere Pro / After Effects.
4. Open the panel: **Window → Extensions → 1337emoji**. Dock it wherever you like.

> **Intel Mac?** The bundled ffmpeg is Apple Silicon only. Install ffmpeg once with [Homebrew](https://brew.sh): `brew install ffmpeg`. The panel finds it automatically.

<details>
<summary>Manual install (if you don't want to run the script)</summary>

1. Copy the `com.cheats1337.emoji` folder to `~/Library/Application Support/Adobe/CEP/extensions/` (in Finder: Go → Go to Folder…, paste the path, create the folders if missing).
2. The panel isn't signed, so let Adobe load unsigned panels. Run this once in Terminal:
   ```bash
   for v in 9 10 11 12 13; do defaults write com.adobe.CSXS.$v PlayerDebugMode 1; done
   ```
3. Restart Premiere / After Effects → Window → Extensions → 1337emoji.
</details>

## How to use

1. Open a sequence (Premiere) or a composition (After Effects).
2. **Move the playhead to your cut.**
3. In the panel:
   - **Emoji:** pick a category or search, then click emoji to add them. Shift-click one again to make it appear more often. Picked emoji sit in the tray at the top (click = remove, right-click = one less).
   - **Direction:** tap an arrow on the compass, or Burst / Implode / Rain.
   - **Motion:** set count, duration, size and so on. Double-click any slider to reset it. ⟳ on the preview gives a new random layout.
4. Press **Render + insert at playhead**. A 1.4 s transition at 1080p renders in a few seconds.

Renders are saved to `~/Movies/1337emoji/`. Delete old ones whenever you like.

**Tips**
- 60–120 emoji at 10–15 % size with *Expo* ease reads best as a cut-hider. Turn on *Centre on playhead*.
- Motion blur 30–50 % looks natural. 0 % gives a crisp sticker look.
- Use 1–3 emoji for a clean branded look, or a whole category for chaos.

## Troubleshooting

| Problem | Fix |
|---|---|
| No *1337emoji* under Window → Extensions | Run the installer again, then fully quit and reopen the app. For a manual install, check the `PlayerDebugMode` step. |
| "ffmpeg not found" | Intel Mac: `brew install ffmpeg`. Apple Silicon: reinstall (the bundled `bin/ffmpeg` is missing). |
| "Open a sequence first" | Click into the timeline so a sequence is active, then try again. |
| Panel is blank or shows an error at the bottom | Close and reopen the panel. If it persists, open an issue with the error text. |

**Uninstall:** delete `~/Library/Application Support/Adobe/CEP/extensions/com.cheats1337.emoji`.

## Build from source

```bash
EMOJI_SRC=/path/to/apple_emoji_pngs python3 build_1337emoji.py   # builds the emoji pool + AE ScriptUI v1 + MOGRT tooling
python3 build_cep.py --install [--debug]                          # builds the panel into build/ and installs it
```
`cep/` holds the panel (`index.html`, `style.css`, `main.js` = UI + particle model + renderer, `host.jsx` = Premiere/AE insert). `--debug` opens Chrome DevTools on port 8099 (Premiere) / 8098 (AE).

**v1 (legacy):** an After Effects ScriptUI expression rig plus MOGRTs (`dist/1337emoji.jsx`). Still included, but the v2 panel is much faster in Premiere.

## Credits & licenses

- Code: MIT © GFXER.
- Emoji artwork: © Apple Inc. (Apple Color Emoji). Included for convenience; it is not covered by the MIT license.
- `bin/ffmpeg` in the release zip: unmodified static [FFmpeg](https://ffmpeg.org) 7.1 build, GPL v2+ ([source](https://ffmpeg.org/download.html)). It runs as a separate program.
