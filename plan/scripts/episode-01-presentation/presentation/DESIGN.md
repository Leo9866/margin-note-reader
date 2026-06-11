# Margin Note Reader Vertical Video Design

## Style Prompt

9:16 竖屏短视频，深色编辑部杂志感。画面像一张在夜里排版的技术海报：温暖黑棕底色、锋利的橙色重点、中文衬线大标题、少量等宽小字作为工程质感。节奏适合手机观看，文本要少而重，每一步只承载一个清楚判断。

## Colors

- Background: `#0d0b09`
- Surface: `#1a1714`
- Secondary Surface: `#231f1a`
- Text: `#f5f0e5`
- Muted Text: `#7a7972`
- Accent: `#ff4a2b`

## Typography

- Chinese Display: `Noto Serif SC`, fallback to source han serif / serif
- English Display: `Instrument Serif`, fallback to Georgia / serif
- UI / Mono: `JetBrains Mono`, fallback to SF Mono / ui-monospace

## Motion

- Slow editorial reveals, mask wipes, staggered chips, warm accent lines.
- Prefer opacity and transform. No viewport-width font scaling during runtime.
- Every 9:16 frame must read on a phone screen: one focal headline, one supporting line, one secondary visual.

## What Not To Do

- No purple-blue AI gradients.
- No busy dashboard layouts in vertical frames.
- No tiny explanatory text blocks.
- No generic stock images.
- No centered hero repeated on every scene unless it is the final quote.
