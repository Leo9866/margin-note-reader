import type { ChapterDef } from "./types";
import HookNeedsChapter from "../chapters/01-hook-needs/HookNeeds";
import { narrations as hookNeedsNarrations } from "../chapters/01-hook-needs/narrations";

/**
 * Order = order of presentation.
 *
 * Each chapter MUST provide a `narrations: Narration[]` array. Its length
 * is the chapter's step count — there is no `totalSteps` to maintain
 * separately. This guarantees the audio synthesis pipeline, the runtime
 * stepper, and the chapter `.tsx` switch on `step` cannot drift apart.
 */
export const CHAPTERS: ChapterDef[] = [
  {
    id: "hook-needs",
    title: "钩子 + 三条需求清单",
    narrations: hookNeedsNarrations,
    Component: HookNeedsChapter,
  },
];
