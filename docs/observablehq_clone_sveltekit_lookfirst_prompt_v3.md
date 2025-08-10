# Copilot: ObservableHQ-Exact Notebook — **SvelteKit** + Event Store (LOOK & FEEL FIRST)

**Prime Directive (P1): Ship the _experience_ first.** Your #1 priority is to replicate the **look-and-feel** of ObservableHQ’s editor UI with pixel-level care _before_ building the full reactive runtime. Build the full **visual skeleton** and surface interactions first; wire logic later.

**Scope order:** **(1) UX skin & interactions** → (2) non-reactive stubs → (3) reactive runtime & dataflow → (4) persistence, history & multiplayer.

Eventing (for later phases): https://github.com/graeme-lockley/event-store

---

## P1: Visual & Interaction Parity (Experience First)

### A. Global Layout

- **Top menu bar** above the document: title, metadata (e.g., last edited), and doc-level actions (share/duplicate/download). Minimalist, airy.
- **Left rail** (editor mode): outline, inputs list, search.
- **Main work area**: stacked cells with **rendered output ABOVE the editor text** for each focused cell.
- **Footer action bar**: persistent bottom bar with global actions (add cell, run all, settings/view), subtle elevation.
- **Icons on the right**: context actions aligned along the right edge where relevant (e.g., collapse, comments).

### B. Cell Surface & Gutter

- **Auto-resizing editor**: text area grows with content (no inner scrollbars). Use CodeMirror 6 (preferred) or Monaco with height-sync.
- **Left gutter**: drag handle, pin, type icon (JS/MD/HTML), kebab menu.
- **Focused-cell grey highlight**: a soft grey bar on the far-left gutter spanning the cell’s height when focused; fades on blur (120–160ms).
- **Top-right RUN icon** within the editor block: a discreet circular/ghost button that appears on hover/focus; aligns to the editor’s top-right corner. Clicking it will (later) run the cell. Keep the button visible on focus, hidden when idle.

### C. Menus & Affordances

- **Cell action menu (kebab)** with: _Pin/Unpin, Add comment, Select, Duplicate, Copy link, Embed (placeholder), Download PNG, Delete_.
- **Cell type switcher** popup to choose **JavaScript / Markdown / HTML** (icon+label). Compact and elegant.
- **“+” add-cell affordances between cells** (above and below): appear on hover/focus of gaps; large hit areas (≥32×32); keyboard accessible; open a type chooser after insertion.
- **Hover/focus cues**: reveal gutter & between-cell controls; apply a very light row tint.

### D. Output & Inspector (Visuals Only)

- Outputs render **above the editor** in a clean block with subtle top border and padding.
- Values/DOM/charts on a white surface; errors in a gently tinted panel with monospaced stack.
- Maintain consistent vertical rhythm between output and editor.

### E. Motion & Details

- Micro-animations (120–200ms) for menu open/close, cell focus highlight, “+” affordances, run-button reveal, pin/collapse.
- Soft shadows (e.g., md/lg), rounded corners (xl/2xl), consistent 4/8px spacing scale.
- Keyboard visual affordances now (wire later): `Shift+Enter`, `Cmd/Ctrl+Enter`, `Alt+↑/↓`, `Cmd/Ctrl+Shift+A/B`, `?` for shortcuts modal.

### F. Iconography

- Use **Lucide** (thin 2px stroke) by default; provide an adapter to swap to **Heroicons** if desired.
- Include icons for: drag, pin, kebab/menu, comment, duplicate, link, embed, download, delete, **plus**, **cell-kind (JS/MD/HTML)**, **run (play)**, collapse.
- Icon glyphs ~18–20px within 32–36px interactive targets; consistent alignment left/right.

> **Deliverable for P1:** A **static-but-interactive** SvelteKit UI that visually matches Observable’s editor: output-above-editor, top menu bar, footer bar, left gutter (with grey focus highlight), right-edge icons, kebab menu, type switcher, **top-right run icon in the editor**, auto-resizing editors, and **“+ add cell”** affordances. Handlers may be stubs.

---

## P2: Functional Stubs (Non‑Reactive)

- Wire all buttons/menus to **no-op actions** that log intent.
- Provide mock outputs (e.g., “7” or placeholder chart) to validate composition and spacing.
- Persist _UI only_ state (selection, pinned/collapsed) to local storage for visual continuity.

---

## P3: Reactive Runtime & Dataflow (Later)

- Add Web Worker evaluator; post `{ code, context }` → return HTML/value.
- Build symbol export/usage detection → dependency DAG → topo re-run; add cancellation (latest-wins).
- Implement `viewof` semantics; Inputs `{range, select, checkbox}` returning live values.
- Inline errors & per-cell console capture.

---

## P4: Persistence, History, Multiplayer (Later)

- Wrap event store: `append(topic, event, {expectedSeq})`, `read(topic, fromSeq)`, snapshots (`writeSnapshot`/`readLatestSnapshot`).
- Topics: `notebooks` and `notebook-{id}`.
- Version timeline & restore; Yjs for presence/cursors/comments.

---

## Tech Stack (SvelteKit)

- **SvelteKit + TypeScript (strict) + Vite + Tailwind**.
- Editor: **CodeMirror 6** with auto-resize; provide Monaco adapter if needed.
- Icons: **Lucide** (default).
- Worker: `src/lib/runtime/worker.ts` (later).
- Sanitization: DOMPurify for HTML values (later).
- Routes: `/` (list), `/n/[id]` (editor), `/api/notebooks/*` (CRUD/streams), `/static/eval-worker.js` (later).

---

## Component Breakdown (UX‑First)

1. **TopBar** — document title, metadata, doc actions.
2. **LeftRail** — outline, inputs, search.
3. **CellShell** — wrapper with left grey focus gutter, left icons, right-edge context icons, pinned/collapsed visuals.
4. **CellEditor** — CM6 editor, **auto-resize**, **top-right run icon**, inline **type switcher**.
5. **CellMenu** — kebab popup (actions above).
6. **AddCellBetween** — “+ above / + below” affordances + type chooser.
7. **OutputPanel** — visual container for results (sits **above** editor).
8. **FooterBar** — persistent bottom action bar (add/run-all/settings).
9. **ShortcutsHelp** — `?` modal listing shortcuts.

---

## Initial Data Model (for later wiring)

```ts
type CellKind = 'js' | 'md' | 'html' | 'input';
type InputKind = 'slider' | 'number' | 'text' | 'select' | 'checkbox' | 'toggle' | 'color' | 'date';

interface Notebook {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
	version: number;
	cellOrder: string[];
}

interface Cell {
	id: string;
	kind: CellKind;
	source: string;
	meta: { pinned?: boolean; collapsed?: boolean; name?: string };
	deps: string[];
	exports: string[];
	lastRun?: {
		status: 'ok' | 'error' | 'pending';
		valueHtml?: string;
		error?: string;
		console?: string[];
	};
}
```

---

## Acceptance Criteria

### P1 (experience-only)

- **Output above editor**, **top menu bar**, **footer bar**, **left gutter with grey focus highlight**, **right-edge icons**, **kebab menu**, **type switcher**, **“+ add cell” affordances**, and **top-right run icon** behave and look like the reference.
- Editors auto-resize; spacing/typography rhythm matches screenshots; animations feel buttery and restrained.

### P2

- All actions respond (stubs OK); mock outputs render cleanly and consistently.

### P3

- Reactive updates only rerun impacted cells; `viewof` inputs drive dependents; inline errors and console capture.

### P4

- Version restore via replay; realtime presence/cursors/comments.

---

## Quality Bar

- TypeScript strict; accessible menus; keyboard focus states.
- Consistent icon sizing/targets; balanced shadows/radii; timing curves tuned.
- Tests: unit (auto-resize, menu accessibility, plus-affordance visibility), e2e smoke via Playwright.

---

## Start Here — Tasks

1. Scaffold SvelteKit + Tailwind + Lucide; set typography (text + mono).
2. Build **TopBar** and **FooterBar** shells.
3. Implement **CellShell** with left highlight and gutters; add right-edge icons.
4. Implement **CellEditor** (CM6) with **auto-resize** and **top-right run icon**.
5. Add **CellMenu** (kebab) + **type switcher** popup.
6. Add **AddCellBetween** (“+ above / + below”) with hover/focus reveal + type chooser.
7. Implement **OutputPanel** (above editor) with mock results.
8. Implement **LeftRail** with outline/inputs/search (visuals only).
9. Add **ShortcutsHelp** modal and baseline keybindings (handlers can be stubs).
10. Polish spacing, shadows, radii, and animation timings until it feels indistinguishable from Observable.
