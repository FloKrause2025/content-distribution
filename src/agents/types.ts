/**
 * src/agents/types.ts
 * -----------------------------------------------------------------------------
 * This file is the shared "dictionary" of data shapes (TypeScript types) used by
 * every AI agent and by the UI. Defining them in ONE place means that when the
 * shape of our data changes, we change it here and TypeScript tells us
 * everywhere else that needs updating.
 *
 * It also contains the CHANNEL REGISTRY — the single list of every social
 * channel the app can generate content for. Adding a new channel later is
 * mostly a matter of adding one entry to `CHANNELS` below (see
 * `docs/adding-a-channel.md`).
 *
 * NOTE: This file must stay "pure" — it must NOT import anything from Node.js
 * (like the file system). That keeps it safe to import from browser/UI code.
 */

// ---------------------------------------------------------------------------
// CONTENT PILLARS
// ---------------------------------------------------------------------------
// The four "content pillars" are the strategic buckets every key idea maps to.
// These come from the agency's content framework.

export type PillarId =
  | "perspectives"
  | "proof"
  | "creative_work"
  | "differentiator";

/** Human-friendly labels for each pillar, shown in the UI. */
export const PILLAR_LABELS: Record<PillarId, string> = {
  perspectives: "Perspectives / Opinions",
  proof: "Startup Proof / Ecosystem Examples",
  creative_work: "Creative Work / Expertise",
  differentiator: "Differentiator",
};

// ---------------------------------------------------------------------------
// CHANNEL REGISTRY
// ---------------------------------------------------------------------------
// Every social channel the app supports. To add a new channel you typically:
//   1. Add a markdown playbook file to the knowledge base (via the UI)
//   2. Add one entry to this CHANNELS object
//   3. (Optional) reference the playbook here in `playbookDoc`
// The UI reads this list automatically to render the channel checkboxes, and
// the channel-adapter agent reads it to know which playbook to inject.

export interface ChannelDefinition {
  /** A stable, machine-friendly id used in code and API calls. */
  id: string;
  /** The platform this channel belongs to (used for the coloured badge). */
  platform: "LinkedIn" | "Instagram";
  /** Short human-friendly label shown on buttons and checkboxes. */
  label: string;
  /** The content format produced (shown as a badge in step 3). */
  format: string;
  /**
   * The knowledge-base document (without the ".md" extension) whose playbook
   * should be injected into the AI prompt for this channel.
   */
  playbookDoc: string;
  /**
   * Which pillars this channel is a good fit for. Used to pre-tick the channel
   * checkboxes for each key idea in step 2 (the user can always change them).
   */
  suggestedForPillars: PillarId[];
}

export const CHANNELS: ChannelDefinition[] = [
  {
    id: "linkedin-founder",
    platform: "LinkedIn",
    label: "LinkedIn Founder Post",
    format: "Founder Post",
    playbookDoc: "playbook-linkedin-founder",
    suggestedForPillars: ["perspectives", "proof", "differentiator"],
  },
  {
    id: "instagram-carousel",
    platform: "Instagram",
    label: "Instagram Carousel",
    format: "Carousel",
    playbookDoc: "playbook-instagram",
    suggestedForPillars: ["proof", "creative_work", "differentiator"],
  },
  {
    id: "instagram-reel",
    platform: "Instagram",
    label: "Instagram Reel",
    format: "Reel Script",
    playbookDoc: "playbook-instagram",
    suggestedForPillars: ["perspectives", "creative_work"],
  },
];

/** Look up a single channel definition by its id. Returns undefined if unknown. */
export function getChannel(id: string): ChannelDefinition | undefined {
  return CHANNELS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// AGENT 1 — HERO ANALYZER
// ---------------------------------------------------------------------------

/** What we send INTO the hero analyzer. */
export interface HeroAnalyzerInput {
  heroContent: string; // The full blog post text.
  title?: string; // Optional title.
  targetAudience?: string; // Optional audience override.
}

/** What the hero analyzer returns. */
export interface HeroAnalysis {
  mainArgument: string; // The central thesis in 1-2 sentences.
  targetAudience: string; // Who this content is for.
  themes: string[]; // 3-5 major themes identified.
  proofPoints: string[]; // Data, examples, quotes found.
  tone: string; // The tone detected in the original.
  suggestedAngles: string[]; // Potential angles for social content.
}

// ---------------------------------------------------------------------------
// AGENT 2 — KEY IDEA EXTRACTOR
// ---------------------------------------------------------------------------

/** A single key idea, mapped to one content pillar. */
export interface KeyIdea {
  id: string;
  pillar: PillarId;
  pillarLabel: string;
  coreArgument: string;
  supportingPoints: string[];
  /** Channel ids (from the CHANNELS registry) suggested for this idea. */
  suggestedChannels: string[];
}

/** What we send INTO the key idea extractor. */
export interface KeyIdeaExtractorInput {
  heroContent: string;
  heroAnalysis: HeroAnalysis;
}

/** What the key idea extractor returns. */
export interface KeyIdeaExtractorOutput {
  keyIdeas: KeyIdea[];
}

// ---------------------------------------------------------------------------
// AGENT 3 — CHANNEL CONTENT ADAPTER
// ---------------------------------------------------------------------------

/** What we send INTO the channel adapter (one call per idea × channel). */
export interface ChannelAdapterInput {
  keyIdea: KeyIdea;
  channel: string; // A channel id from the CHANNELS registry.
  heroContent: string; // Original blog for reference.
}

/** A single ready-to-publish content piece. */
export interface ChannelContent {
  /** A unique id we generate so the UI can track/edit each piece. */
  id: string;
  /** The id of the key idea this content was generated from. */
  keyIdeaId: string;
  channel: string; // The channel id.
  channelLabel: string; // Human-friendly channel label.
  platform: string; // "LinkedIn" | "Instagram".
  format: string; // "Founder Post" | "Carousel" | "Reel Script".
  content: string; // The full generated content.
  hookLine: string; // The opening hook extracted.
  cta: string; // The call-to-action extracted.
  estimatedLength: string; // e.g. "1,200 characters" or "7 slides".
}

// ---------------------------------------------------------------------------
// KNOWLEDGE BASE
// ---------------------------------------------------------------------------

/** Metadata about a single knowledge-base markdown document. */
export interface KnowledgeBaseDoc {
  /** The filename, e.g. "brand-voice-guide.md". */
  filename: string;
  /** A category tag derived from the filename. */
  category: "Brand Voice" | "Channel Playbook" | "Other";
  /** ISO date string of when the file was last modified. */
  lastModified: string;
  /** File size in bytes. */
  sizeBytes: number;
}
