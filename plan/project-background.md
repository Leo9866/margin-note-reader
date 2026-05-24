# Project Background

## Origin

The idea started from a useful HTML viewer pattern: a document-like interface that already supported practical reading controls such as search and font adjustment. That sparked a larger product question: for long, dense documents, can the reading interface become more than a viewer?

Long-form reading often breaks down in the middle of the process. A reader may search, adjust typography, and move through sections, but the harder work is elsewhere:

- remembering why a passage mattered
- keeping track of unresolved questions
- saving important claims or definitions
- creating summaries that stay connected to the source text
- asking AI for clarification without leaving the document context

The initial implementation briefly explored this inside the Hermes Agent dashboard, but that was only a fast way to validate the interaction. The intended product is independent: a dedicated reader for long Markdown documents.

## Product Intention

Margin Note Reader should feel like a calm reading desk for dense Markdown material. The first screen should be the product itself, not a landing page or a dashboard. A user opens a document and immediately sees:

- document structure
- readable prose
- note-taking tools
- contextual AI assistance
- a running notebook of saved understanding

The core product belief is:

> The most valuable AI reading interface is not a separate chatbot. It is a margin that understands the current passage, surrounding section, and the reader's own notes.

## Target Users

The first target users are people who read long, information-dense Markdown documents:

- researchers reading Markdown-converted papers
- engineers reading RFCs, specs, design docs, and architecture notes
- product managers reading research reports or PRDs
- students reading course notes and technical tutorials
- writers turning source material into summaries, outlines, and review notes

The product should work especially well when the user is not just browsing but trying to understand, annotate, and reuse the material later.

## Initial Scope

The project intentionally starts with Markdown rather than PDF. This avoids early complexity around layout extraction, OCR, double-column parsing, figures, formulas, and page-coordinate anchoring.

Markdown gives the product a cleaner foundation:

- headings become reliable sections
- paragraphs and lists become addressable blocks
- notes can be bound to stable block IDs
- summaries can be scoped to headings
- source text can remain editable
- later importers can convert other formats into the same block model

## Product Principles

1. Open directly into the reading workspace.

   The product is not a marketing page. The first screen is the active reading desk.

2. Keep AI in the margin.

   AI should use the selected passage and current section. It should not force users to copy text into a separate chat surface.

3. Bind notes to source.

   Highlights, bookmarks, questions, and AI answers should remain connected to the original document block.

4. Keep the reading surface quiet.

   Typography, line width, search, and outline should support sustained reading without turning the page into a dashboard.

5. Build from one document outward.

   The first version should make one long document deeply readable before adding libraries, cloud sync, or multi-document knowledge graphs.

## Current Prototype State

The current standalone project already includes:

- independent Vite + React application
- product shell branded as Margin Note
- Markdown source import and editing
- outline generated from Markdown headings
- reader controls for text size and line width
- search with inline highlighting
- text selection capture
- highlight, bookmark, and note actions
- local notebook panel
- localStorage persistence
- Markdown note export
- prototype AI margin flow with local simulated responses
- light and dark theme switch

The current AI behavior is intentionally local and simulated. It validates the interaction model before introducing model APIs, streaming, citation handling, prompt design, and error states.

