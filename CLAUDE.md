# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`To Do App/` is a single-page, framework-free To Do list: `index.html` + `style.css` + `app.js`. No build step, no bundler, no package manager, no test framework — plain HTML/CSS/JS served directly to a browser.

## Running it

Open `To Do App/index.html` directly in a browser (e.g. `start "To Do App/index.html"` on Windows), or serve the folder with any static file server. There is no build/lint/test command — verify changes by loading the page and exercising the UI manually.

## Architecture

- **State**: the entire task list lives in `localStorage` under key `todos` (array of `{id, text, done, priority, due}`). There is no in-memory store — every mutation function (`addTask`, `editTask`, `toggleTask`, `setPriority`, `deleteTask`, `reorderTasks`, `clearCompleted`) follows the same pattern: `loadTasks()` → mutate the array → `saveTasks()` → `render()`.
- **Rendering is a full teardown/rebuild**: `render()` clears `#task-list` and rebuilds every `<li>` from scratch on each call, wiring up all event listeners fresh each time. There is no diffing/virtual-DOM — this is intentional given the "no frills" spec in `To Do App/Specs.md`.
- **Filtering/sorting** (`getVisibleTasks()`) is derived on read, not stored — filter/sort selection lives only in the `<select>` elements' current values, read directly from the DOM.
- **Drag-and-drop reordering** is only wired up when `sort === 'none' && filter === 'all'` (see `reorderable` in `render()`), since reordering is meaningless under an active sort/filter.
- **Theme**: dark mode preference is stored separately under `todo-theme` in `localStorage`, and falls back to `prefers-color-scheme` when unset (`loadTheme()`). Dark mode is applied via a `body.dark` class that CSS selectors key off of throughout `style.css`.
- **Import/export**: `exportTasks()` downloads the raw `todos` array as JSON. `importTasts` (`importTasks()`) does full validation of every field on import (type checks, allowed priority values, size/count caps) before overwriting storage — treat this as the trust boundary for any externally supplied data.

## Spec source of truth

`To Do App/Specs.md` lists the full feature spec (priorities, due dates, inline edit, filter/sort, keyboard shortcuts, drag-and-drop reorder, import/export, etc.). Treat it as the authoritative feature list when adding/changing behavior — check new features against it rather than inferring scope from the code alone.
