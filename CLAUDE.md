# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (Vite)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # preview production build locally
npm run deploy     # build + publish to GitHub Pages (gh-pages -d dist)
```

There is no test framework in this project.

## Architecture

LingoDrill is a React + Vite + TypeScript installable PWA for language learning via audio fragment drilling. It is deployed to GitHub Pages at `/LingoDrill-PWA/`. That path is set once, as `BASE` in `vite.config.ts`; the router basename and in-app URLs derive it from `import.meta.env.BASE_URL`, so never hardcode it.

### PWA

`vite-plugin-pwa` in `vite.config.ts` generates the manifest and a Workbox service worker that precaches the app shell and serves `index.html` for navigations (deep links work offline). All user data is in IndexedDB, so the whole app works offline. `registerType: 'prompt'` with no prompt UI means a new deploy activates on the next launch, never mid-session. Install icons (`public/pwa-*.png`, `maskable-icon-512x512.png`) are generated from `public/favicon.svg` by `npm run generate-pwa-assets` (config: `pwa-assets.config.ts`).

### Layers

```
src/core/          — pure domain types and interfaces (no React, no browser APIs)
src/infrastructure/ — browser API implementations (IndexedDB, Web Audio, HTML Audio)
src/app/           — React hooks, context, components
src/pages/         — top-level page components (one per route)
src/utils/         — stateless utility functions
```

### Routes (defined in `src/app/App.tsx`)

| Path | Page | Purpose |
|---|---|---|
| `/` | `LibraryPage` | Upload/select audio files |
| `/file/:id/sequences` | `FragmentLibraryPage` | List and manage sequences |
| `/file/:id/editor` | `FragmentEditorPage` | Create/edit a sequence |
| `/file/:id/editor/:seqId` | `FragmentEditorPage` | Edit existing sequence |
| `/file/:id/player/:seqId` | `SequencePlayerPage` | Play back a sequence |

### Domain types (`src/core/domain/types.ts`)

- **AudioFile** — uploaded audio file metadata. `derivedFrom` marks a processed copy (see below): hidden from the Audio Library and deleted with its source.
- **SubtitleFile** — text file linked to an audio file
- **SequenceFragment** — time range with `start/end/repeat/speed` + optional subtitle bindings
- **Sequence** — ordered list of `SequenceFragment`s linked to an `AudioFile`
- **FragmentSubtitle** — links a fragment to a character range inside a `SubtitleFile`
- **Fragment** — legacy type kept for backwards compatibility, superseded by `SequenceFragment`

### Processed audio

Trim silence / Normalize volume / Maximize volume write a new WAV, but the sequence does not move: it keeps its id, its label and its place in the original file's sequence list, and only gains `processedAudioId` (plus `processedDuration`) pointing at the new file. So `Sequence.audioId` is the grouping key — which file's list, subtitles and vocabularies it belongs to — while the audio actually played comes from `sequenceAudioId(seq)` in `src/core/domain/sequenceAudio.ts`. Anything loading audio for a sequence must go through that helper.

The processed WAV is stored with `derivedFrom` set to the original file's id, which keeps it out of the Audio Library and deletes it when the original goes. Processing again (trim, then maximize) supersedes the previous copy, which is deleted unless another sequence still plays it.

One consequence: a `.lingodrill` bundle holds exactly one audio file, so exporting from the editor exports the audio currently open and only the sequences that play it; the rest are reported as omitted.

### Subtitle and vocabulary text

A fragment never stores snippet text. `FragmentSubtitle` / `FragmentVocabulary` hold `charStart`/`charEnd` into the one shared `SubtitleFile.content` / `VocabularyFile.content`, and those files are keyed by `audioId` — so every sequence of that audio file reads from the same string. Editing that string therefore moves every binding sitting after the edit, in every sequence.

The editor's Sub / Vocab modal offers "Edit text" alongside plain select-and-bind, but only for the snippet the open fragment is bound to — the textarea holds `content.slice(charStart, charEnd)`, never the whole file, and the button is absent until the fragment has a binding. On save the file becomes "text before + draft + text after", which is exactly the single replaced span `diffText()` reduces to, so all bindings re-base through `rebaseSubtitleBindings()` / `rebaseVocabularyBindings()` in `src/core/domain/textBindings.ts`: the sequence being edited from the live `fragments` state, the rest of the file's sequences straight from storage. Anything else that rewrites one of those files must re-base the same way, or bindings silently slide onto the wrong words.

Two fragments may bind overlapping ranges, and then no re-basing can keep both on their own words — so `findSubtitleOverlap()` / `findVocabularyOverlap()` scan every sequence of the audio file when "Edit text" is clicked, and a hit refuses the edit with a warning naming the sequence it clashed with instead of opening the textarea.

### Background colour

The page ground is painted by `html` alone — `background-color: var(--color-bg-page)` plus `--bg-ground-image`. The neon dark theme's ambient halos are `--bg-ground-image`, not a `body` background.

There used to be a user-made SVG background pattern (a `backgrounds` store, a Backgrounds page, an `html::before` mask layer). It was removed; DB v9 deletes the store and `clearRetiredBgSettings()` drops its localStorage keys at boot (along with the retired single `bgTint`).

Each theme has its own ground colour (`BgColor`, `"default"` or `#rrggbb`), stored as `lingodrill.bgColorLight` / `lingodrill.bgColorDark`. `applyBgColors()` puts them on `<html>` as `--bg-light` / `--bg-dark`, and index.css sets `--bg-ground-color` to whichever matches `data-theme`, falling back to `--color-bg-page` — so switching theme needs no script. Note that `--color-bg-page` itself is never redefined: filled buttons use it as their *text* colour, so tinting it would tint the type inside them.

The Settings UI copies sDraw's: a plain sample box, two swatch rows from `BG_PALETTES` (top row light theme — sDraw's pastels at 49% of their saturation; bottom row dark theme) and a palette button opening `ColorPickerDialog` (`src/app/components/`) — an HSV square + hue bar or a hue ring + diamond, hex field, Apply, and a "Save to" row. Only the active theme's row is enabled; the sample box, reset and palette button all act on the active theme. Each row ends with `BG_USER_SLOTS` (3) user colours (`lingodrill.bgUserColorsLight` / `…Dark`, JSON arrays with `null` for empty), filled from the dialog's "Save to" row via `setBgUserColor()`; clicking an empty slot opens the picker. A free pick keeps its hue and saturation but `normalizeBgColor()` clamps lightness per theme (light ≥ 70%, dark ≤ 25%) so the theme's text stays readable; the normalised value is what gets stored. Colour maths lives in `src/utils/color.ts`.

### Dual audio engine

`useAudioEngine` (`src/app/hooks/useAudioEngine.ts`) manages two engines in parallel:

- **`HtmlAudioEngine`** (`src/infrastructure/audio/htmlAudioEngine.ts`) — wraps `HTMLAudioElement`. Used for whole-file playback. Loads instantly via an Object URL (no decode needed).
- **`WebAudioEngine`** (`src/infrastructure/audio/webAudioEngine.ts`) — wraps `Web Audio API`. Used for fragment playback (precise start/end, repeat, speed). Requires a decoded `AudioBuffer`.

On `loadById`, the HTML engine loads first so playback is immediately available. The Web Audio engine decodes in the background via **chunked decode** (`src/infrastructure/audio/chunkedDecode.ts`), splitting the file into ~30s byte slices with watchdog timeouts to avoid mobile OOM crashes. The decoded `AudioBuffer` is cached in memory keyed by file id. `isReady` becomes true after HTML load; `isFragmentsReady` becomes true after Web Audio decode completes.

`activeEngineRef` tracks which engine is currently driving playback (`"html"` or `"web"`). Calling `playFragment()` switches to `"web"`; calling `play()` switches back to `"html"`.

### Shared audio state

`AudioEngineProvider` (`src/app/contexts/AudioEngineContext.tsx`) wraps the whole app and exposes a single `AudioEngineContextType` combining the engine state with the audio file library. All pages access it via `useSharedAudioEngine()`.

The audio file library is managed by `useAudioLibrary` (`src/app/hooks/useAudioLibrary.ts`) and sequences/subtitles by `useSequences` / `useSubtitles` hooks — all backed by IndexedDB.

### Persistence (IndexedDB)

Database: `"language-trainer"` (current version: 9), opened in `src/infrastructure/indexeddb/db.ts`.

Object stores: `audioMeta`, `audioBlobs`, `subtitleFiles`, `vocabularyFiles`, `fragments`, `sequences`, `waveformCache`.

Each domain concept has its own storage class in `src/infrastructure/indexeddb/`.

### Bundle format

Export/import of a full dataset as a `.lingodrill` file (JSON with base64-encoded audio). Implemented in `src/core/bundle/exportBundle.ts` and `importBundle.ts`. Contains: manifest (version, audio metadata, waveform data, sequences, subtitle files) + optional base64 audio.
