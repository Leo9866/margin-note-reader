# Iteration Plan

## Stage 0: Prototype Baseline

Status: implemented.

Goal: prove the independent product surface and the core reading flow.

Delivered:

- standalone project outside Hermes Agent
- three-pane reading workspace
- sample Markdown document
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
- the page does not expose Hermes Agent dashboard chrome
- a user can read, search, select, save notes, and trigger an AI-style response

## Stage 1: Reading and Annotation Quality

Goal: make the local Markdown reader feel robust enough for real long documents.

Planned work:

- improve Markdown parsing for nested lists, ordered lists, links, inline code, blockquotes, and tables
- preserve basic inline formatting in rendered text instead of flattening all inline Markdown
- add stable block IDs that survive small document edits better than index-based IDs
- support annotation colors or types: important, question, definition, citation, revisit
- add click-to-scroll from notebook item back to source block
- add active-section detection while scrolling
- add keyboard shortcuts for common reading actions
- add mobile and narrow-screen layout refinement

Acceptance criteria:

- imported Markdown documents with common syntax render cleanly
- saved annotations remain useful after reload
- notebook items can navigate back to the original passage
- search and outline remain fast on long documents

## Stage 2: Real AI Margin

Goal: replace the local AI simulation with real contextual AI while preserving product boundaries.

Planned work:

- add a backend API endpoint for AI requests
- support model configuration through environment variables
- send selected text, section Markdown, document title, and relevant notes to the model
- return concise answers with source references
- add loading, error, empty, and retry states
- support actions:
  - explain selected passage
  - summarize selected passage
  - summarize current section
  - answer custom question
  - turn answer into saved note
- add prompt templates for technical documents, research papers, and product docs

Acceptance criteria:

- AI responses use the active selection and section context
- answers can be saved as notes
- failures are visible and non-destructive
- no document text is sent unless the user triggers an AI action

## Stage 3: Document Persistence and Library

Goal: move from a single local document to a lightweight local document library.

Planned work:

- create a local document store
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

Goal: keep Markdown as the internal model while accepting more source formats.

Planned work:

- import from plain text
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

1. improve Markdown rendering and annotation anchoring
2. add click-to-source navigation from notes
3. add a real AI API boundary behind the existing AI margin UI
4. keep the current standalone product shell unchanged

This keeps the product focused while moving from prototype flow toward a credible first usable version.

