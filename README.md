# 1337emoji

Emoji transitions for **After Effects** and **Premiere Pro**. Drag-and-drop emoji floods with sliders.

> Private build. Contains Apple Color Emoji artwork for personal use only. Do not publish or redistribute.

## What it does
An expression rig fills the frame with up to **200 emoji** and sweeps them across the frame as a transition.

| Control | What it does |
|---|---|
| Emoji Count | 1–200 emoji |
| Direction | Left→Right, Right→Left, Bottom→Top, Top→Bottom, the 4 corner diagonals, Burst Out, Implode, Rain (all sides) |
| Duration (s) / Stagger % / Ease | timing (Linear, Ease In-Out, Expo In-Out, Expo Out) |
| Size % of height / Size Variance % | how big |
| Spin / Wobble px / Pop-in | motion character |
| Category | All, Faces, Hearts, Hands, Hype, Money, Cars, Party, Sports, Food, Animals, Flags, Other |
| Emoji A/B/C # | hand-pick up to 3 emoji (overrides category) |
| Seed | new random layout |

The pool holds **1,945 emoji** (no skin-tone duplicates), stored as one image sequence: frame N = emoji N. Every particle time-remaps to its emoji, so the rig loads instantly.

## Install
**After Effects (panel):** copy `dist/1337emoji.jsx` **and** the `dist/1337emoji_pool/` folder into
`~/Library/Preferences/Adobe/After Effects/<version>/Scripts/ScriptUI Panels/`, restart AE, then open **Window → 1337emoji**.
Pick a direction, sliders and emoji, then press **APPLY AT PLAYHEAD**. You can tweak everything later on the rig's `1337_CTRL` layer.

**Premiere Pro (MOGRT):** download the `.mogrt` files from the latest release (16:9, 9:16, 1:1 at 4K).
Install them via Essential Graphics → Browse → Install Motion Graphics Template (or copy them to
`~/Library/Application Support/Adobe/Common/Motion Graphics Templates/`).
Drag one onto a track above the cut and set the sliders in Essential Graphics.

## Build
`python3 build_1337emoji.py` rebuilds `dist/` from the emoji library. Running `dist/make_mogrts.jsx` in AE builds the rigs and exports the MOGRTs.

## Notes
- The emoji are 160 px, so they stay sharp up to about 12 % of a 4K frame's height.
- The particle cap is 200 layers per rig.
