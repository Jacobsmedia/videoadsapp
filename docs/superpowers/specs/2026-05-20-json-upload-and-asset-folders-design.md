# JSON Upload And Asset Folders Design

## Goal

Add two related capabilities to the NAD+ pipeline app:

1. Let the user upload a `scenes.json` file that replaces the in-memory `basePrompt` and `scenes` data without restarting the app.
2. Show each generation session as a folder-like run inside the app and allow that run to be exported as a downloadable JSON manifest for later access.

The existing hardcoded/default `basePrompt` and `scenes` remain the initial dataset on first load.

## Scope

In scope:

- JSON upload button and hidden file input
- JSON parsing and validation
- Runtime replacement of current scene/base prompt data
- Reset of live generation state after a successful import
- In-app run/folder library for generated assets
- Export of a run as a JSON manifest containing metadata and remote asset URLs
- Tests for validation and key UI flows

Out of scope:

- Backend or database persistence
- Cross-device syncing
- ZIP packaging of remote media files
- Importing previously exported run manifests back into the app

## Recommended Approach

Use small helper modules for JSON validation and run/export shaping instead of keeping all new logic in `App.jsx`.

Why:

- Keeps `App.jsx` from becoming harder to maintain
- Makes validation rules easy to test directly
- Reduces the risk of mixing UI concerns with parsing and run bookkeeping

## Data Model

### Live Pipeline State

Convert the default data into runtime state:

- `scenes`
- `basePrompt`
- `prompts`
- `images`
- `videos`
- `editSceneId`
- upload/import status message

`prompts` should continue to be derived from the current `scenes` and `basePrompt` using the existing base-scene vs edit-scene prompt strategy.

### Run Library State

Add:

- `runs`: array of saved generation sessions, newest first
- `activeRunId`: the current folder/run being filled by newly generated assets

Each run stores:

- `id`
- `name`
- `createdAt`
- `basePrompt`
- `scenes`
- `assets` keyed by `scene.id`

Each asset record may include:

- image URL and status
- video URL and status
- task ids if available
- timestamps if useful

## JSON Upload Flow

### UI

In the prompt controls section, place a `Load Scenes JSON` button next to `Edit Prompts`.

Also add:

- hidden file input accepting `.json`
- inline success/error message area

### Validation Rules

The uploaded file must parse to an object with:

- `basePrompt`: string
- `scenes`: array

Each scene must be an object containing:

- `id`: number
- `label`: string
- `setting`: string
- `dialogue`: string
- `emotion`: string
- `vidPrompt`: string

Validation should produce specific messages, for example:

- `Invalid JSON syntax`
- `basePrompt must be a string`
- `scenes must be an array`
- `Scene 2 is missing "vidPrompt"`
- `Scene 3 field "id" must be a number`

### Successful Import Behavior

On successful validation:

- replace live `scenes`
- replace live `basePrompt`
- rebuild `prompts`
- clear `images`
- clear `videos`
- clear `editSceneId`
- clear any active polling timers
- reset `activeRunId`
- show a success message

Existing saved runs remain in the library and are not deleted by a new upload.

### Failed Import Behavior

On failure:

- keep the current pipeline unchanged
- show a specific error message
- do not clear current live generation state

## Run Folder Behavior

### When A Run Is Created

A new run is created automatically when the user starts generating for a fresh pipeline setup and there is no active run yet.

The run captures the current:

- `basePrompt`
- `scenes`
- creation timestamp

### How Assets Attach To A Run

As image/video generation completes, the app updates both:

- live `images` / `videos` state for the current UI
- the `assets` map inside the active run

This keeps the current pipeline behavior unchanged while building a browsable session record.

### Reset Behavior

Loading a new `scenes.json` starts a fresh live pipeline and clears the active run pointer, but old runs remain visible in the library.

## Asset Folders UI

Add a new `Asset Folders` panel between the prompt controls and the scene grid.

Each run appears as a folder-like card showing:

- run name
- timestamp
- scene count
- number of generated images/videos
- `Export Run` button

Expanding a run reveals grouped scene assets:

- scene label
- image preview if present
- video preview if present

Newest runs appear first.

## Export Behavior

Each run exports as a downloadable JSON manifest rather than a ZIP file.

The export includes:

- run metadata
- `basePrompt`
- `scenes`
- saved asset URLs/statuses by scene

This satisfies the short-term “folder for later access” requirement without needing backend storage or attempting to download third-party media files into a packaged archive.

## Error Handling

Handle:

- unreadable file content
- invalid JSON syntax
- wrong root type
- missing required fields
- wrong field types

Errors should be surfaced inline in the controls area and should never partially mutate the current pipeline state.

## Testing Plan

Add focused tests for:

1. JSON validation helper
   - accepts valid payload
   - rejects invalid JSON
   - rejects missing `basePrompt`
   - rejects non-array `scenes`
   - rejects scene objects missing required fields
   - rejects wrong field types

2. App behavior
   - valid upload replaces visible scene content
   - invalid upload shows an error and leaves current content intact
   - successful import clears current image/video state
   - generation creates a run entry/folder
   - run export produces a downloadable manifest

## Implementation Notes

- Prefer extracting helpers such as `pipeline-import.js` and `runs.js`
- Reuse existing scene-card rendering where possible
- Avoid changing the API request layer unless required by the new state model
- Keep the default hardcoded data as the first-load source of truth
