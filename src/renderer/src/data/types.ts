// ─────────────────────────────────────────────
// Gdnsua Studio — Core data types
// ─────────────────────────────────────────────

/** Phonological classification from the language guide */
export type PhonemeClass =
  | 'vowel'
  | 'special-vowel'
  | 'nasal'
  | 'plosive'
  | 'fricative'
  | 'approximant'
  | 'affricative'
  | 'regional' // Y, B, W — Kharmat & Haadfahuta only

/** A letter of the Gdnsua alphabet (base script) */
export interface Letter {
  /** Stable ID used by Word.spelling and glyph files, e.g. "mn" */
  id: string
  /** Romanized form as written, e.g. "MN" or "/ʍ/" */
  romanization: string
  /** Traditional letter name, e.g. "mirs", "tethes" */
  letterName: string
  /** Rough pronunciation from the guide, e.g. "kuh" */
  sound: string
  phonemeClass: PhonemeClass
  /** Regions where this letter exists; omitted = universal */
  regions?: string[]
  /** Notes: doubling rules, usage quirks, etc. */
  notes?: string
}

/** A glyph asset (SVG) — visual layer, decoupled from meaning */
export interface Glyph {
  id: string // "syll-mn" | "logo-taus"
  type: 'syllabary' | 'logograph'
  /** Letter id or Word id this glyph draws */
  represents: string
  /** Raw SVG markup, or empty if not yet designed */
  svg: string
  regions?: string[]
  status: 'final' | 'draft' | 'missing'
}

/** A dictionary word — the core data point */
export interface Word {
  id: string
  romanization: string
  /** All English meanings, split: ["doubt", "hesitation", "fear"] */
  glosses: string[]
  category: string
  tags?: string[]
  /**
   * Resolved letter-id sequence. Usually computed from romanization
   * by lib/tokenize.ts at load time; set explicitly only to override
   * ambiguous tokenizations (e.g. M+N vs MN).
   */
  spelling?: string[]
  logographId?: string
  regions?: string[]
  /** Word ids this compound derives from, e.g. ["ten", "pu"] */
  derivedFrom?: string[]
  /** Longer definition, lore, slang flags, usage notes */
  notes?: string
}

/** Modifier words get extra behavioral metadata */
export interface Modifier extends Word {
  /** What the modifier does, e.g. "negates target meaning" */
  effect: string
  /** Standalone form repeats: HAH → HAHAH */
  standaloneForm: string
}
