# Iteration Plan

## Stage 0: Prototype Baseline

Status: implemented.

Goal: prove the independent product surface and the core reading flow.

Delivered:

- standalone blank reading workspace
- three-pane reading workspace
- blank local document library start state
- document outline
- search
- text size and line-width controls
- source editing
- passage selection
- highlight, bookmark, and note creation
- notebook panel
- local AI margin simulation
- localStorage persistence
- Markdown note export

Acceptance criteria:

- the product launches at its own local URL
- the page opens as a clean reading workspace without bundled project-specific materials
- a user can read, search, select, save notes, and trigger an AI-style response

## Stage 1: Reading and Annotation Quality

Status: in progress.

Goal: make the local Markdown reader feel robust enough for real long documents.

Delivered in the current iteration:

- improved inline Markdown rendering for bold, emphasis, links, inline code, blockquotes, tables, and nested/indented lists
- added stable block IDs based on heading scope and block order, with legacy ID aliases to preserve existing local notes
- added click-to-source navigation and a short source flash when jumping from notebook items
- added annotation types: important, question, definition, citation, and revisit
- kept existing localStorage annotations compatible with the new block model

Planned work:

- add active-section detection while scrolling
- add keyboard shortcuts for common reading actions
- add mobile and narrow-screen layout refinement

Acceptance criteria:

- imported Markdown documents with common syntax render cleanly
- saved annotations remain useful after reload
- notebook items can navigate back to the original passage
- search and outline remain fast on long documents

## Stage 2: Real AI Margin

Status: partially implemented.

Goal: replace the local AI simulation with real contextual AI while preserving product boundaries.

Delivered:

- backend Vite middleware for AI requests
- model configuration through environment variables
- OpenAI-compatible Responses API integration
- selected text, section Markdown, document title, and relevant notes are sent only when the user triggers AI
- streaming AI answers in the notebook feed
- AI answers can be saved as notes

Planned work:

- return concise answers with source references
- strengthen loading, error, empty, and retry states
- support actions:
  - summarize selected passage
  - retry failed answer
  - regenerate answer
  - copy answer
- add prompt templates for technical documents, research papers, and product docs

Acceptance criteria:

- AI responses use the active selection and section context
- answers can be saved as notes
- failures are visible and non-destructive
- no document text is sent unless the user triggers an AI action

## Stage 3: Document Persistence and Library

Status: early slice implemented.

Goal: move from a single local document to a lightweight local document library.

Delivered:

- open the app into a workspace home when no document hash is provided
- create a blank Markdown document from the workspace home or left rail
- edit and save user document Markdown source back to the local library
- import local Markdown / plain text / HTML files from the workspace home or left rail
- import a browser-selected local folder and add supported files to the library
- preserve Markdown / HTML image references, inline SVG figures, and folder-imported relative image assets
- store user document source in IndexedDB instead of localStorage
- show imported and created files under local document groups
- keep per-document annotations and AI threads keyed by document id

Planned work:

- support multiple documents
- show recent documents
- save per-document annotations and AI threads
- add document metadata: title, created date, updated date, tags
- add document-level export bundle: source Markdown, notes Markdown, annotations JSON
- add import history and reset controls

Acceptance criteria:

- users can switch between multiple documents
- each document keeps its own notes and AI history
- exported notes preserve source references

## Stage 4: Structured Summaries

Goal: make summaries cumulative and useful rather than one-off AI answers.

Planned work:

- generate section summaries from heading scopes
- show document summary, current-section summary, and selected-passage summary
- save summary snapshots with source block IDs
- track unresolved questions
- generate a reading recap:
  - key claims
  - definitions
  - methods
  - open questions
  - saved citations
- add "continue from last session" state

Acceptance criteria:

- summaries link back to source sections
- users can resume reading with context
- unresolved questions are visible and editable

## Stage 5: Importers and Format Expansion

Status: early slice implemented.

Goal: keep Markdown as the internal model while accepting more source formats.

Delivered:

- import from local Markdown files
- import from local plain text files
- import from local HTML files and convert readable structure to Markdown
- import supported documents from a local folder selection
- preserve imported images as rendered Markdown image blocks

Planned work:

- import from web article HTML
- paste URL and convert readable content to Markdown
- optional DOCX to Markdown conversion
- optional PDF to Markdown conversion after the Markdown workflow is strong

Acceptance criteria:

- imported material becomes the same internal block model
- annotations and AI flows work consistently regardless of source format
- PDF support does not distort the main product around page-layout problems

## Stage 6: Advanced Knowledge Work

Goal: help users reuse reading output across documents and projects.

Planned work:

- cross-document search
- tag-based note views
- collections or projects
- compare two documents
- generate literature review notes
- cite saved passages in writing mode
- optional sync backend
- optional account system

Acceptance criteria:

- notes become reusable knowledge assets
- users can organize documents around a project
- the product still opens quickly into a focused reading surface

## Near-Term Priority

The next best iteration is Stage 1 plus a small slice of Stage 2:

1. finish active-section detection and outline synchronization
2. add keyboard shortcuts for common reading actions
3. add AI source references that jump back to source blocks
4. add retry/regenerate/copy actions for AI cards
5. start the local document library design from Stage 3

This keeps the product focused while moving from prototype flow toward a credible first usable version.
