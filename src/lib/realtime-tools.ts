// Single source of truth for OpenAI Realtime tool definitions used by the
// Spanish teacher. Imported by the token route (to register tools with the
// session) and by the client (to route tool calls to app handlers). Keeping
// them colocated avoids name drift between server and client.

// Tool name constants so the client router and server wiring cannot diverge.
export const TOOL_ADD_TO_NOTEBOOK = 'add_to_notebook' as const;
export const TOOL_REQUEST_WRITING_EXERCISE = 'request_writing_exercise' as const;
export const TOOL_MARK_SPEAKING_PROMPT = 'mark_speaking_prompt' as const;
export const TOOL_MARK_CONCEPT_TAUGHT = 'mark_concept_taught' as const;
export const TOOL_REQUEST_END_LESSON = 'request_end_lesson' as const;
export const TOOL_MARK_ITEM_REVIEWED = 'mark_item_reviewed' as const;
export const TOOL_REQUEST_PRONUNCIATION_DRILL = 'request_pronunciation_drill' as const;
export const TOOL_REQUEST_LISTENING_EXERCISE = 'request_listening_exercise' as const;
export const TOOL_REQUEST_READING_PASSAGE = 'request_reading_passage' as const;
export const TOOL_REQUEST_FLUENCY_SPRINT = 'request_fluency_sprint' as const;
export const TOOL_REMEMBER_STUDENT_FACT = 'remember_student_fact' as const;

export type ToolName =
  | typeof TOOL_ADD_TO_NOTEBOOK
  | typeof TOOL_REQUEST_WRITING_EXERCISE
  | typeof TOOL_MARK_SPEAKING_PROMPT
  | typeof TOOL_MARK_CONCEPT_TAUGHT
  | typeof TOOL_REQUEST_END_LESSON
  | typeof TOOL_MARK_ITEM_REVIEWED
  | typeof TOOL_REQUEST_PRONUNCIATION_DRILL
  | typeof TOOL_REQUEST_LISTENING_EXERCISE
  | typeof TOOL_REQUEST_READING_PASSAGE
  | typeof TOOL_REQUEST_FLUENCY_SPRINT
  | typeof TOOL_REMEMBER_STUDENT_FACT;

// Parameter shapes for each tool. The model will serialize these to JSON
// matching these schemas. Client-side we validate before dispatching.

export interface AddToNotebookArgs {
  word: string;
  // Optional English gloss. When present, the server persists this into the
  // canonical `vocabulary` row so the item enters the SRS review queue in a
  // reviewable state. At A1.1–A1.2 the prompt REQUIRES sandwiching, so the
  // AI will almost always have this value to hand.
  english?: string;
}

export type WritingExerciseType =
  | 'translation'
  | 'sentence'
  | 'conjugation'
  | 'fill-blank'
  // Production-without-translation variants added in Phase 9 to reduce the
  // translate-from-English crutch at A2+.
  | 'scene-description'
  | 'opinion-prompt';

export interface RequestWritingExerciseArgs {
  exerciseType: WritingExerciseType;
  prompt: string;
  expectedAnswer?: string;
  hints?: string[];
}

export interface MarkSpeakingPromptArgs {
  // No parameters — presence of the call is the signal.
  // Optional free-form description for debugging.
  description?: string;
}

export interface MarkConceptTaughtArgs {
  concept: string;
}

export interface RequestEndLessonArgs {
  reason: string;
}

export type ReviewItemKind = 'vocab' | 'error';
export type ReviewPerformance = 'again' | 'hard' | 'good' | 'easy';

export interface MarkItemReviewedArgs {
  kind: ReviewItemKind;
  spanish: string;
  performance: ReviewPerformance;
}

export type PronunciationDrillType =
  | 'minimal-pairs'
  | 'vowel-purity'
  | 'stress'
  | 'rolled-rr'
  | 'silent-h'
  | 'soft-d';

export interface RequestPronunciationDrillArgs {
  drillType: PronunciationDrillType;
  items: string[];
  target: string;
}

export interface ListeningExerciseOption {
  id: string;
  label: string;
}

export interface RequestListeningExerciseArgs {
  scene: string;
  comprehensionQuestion: string;
  options?: ListeningExerciseOption[];
  correctAnswer: string;
}

export interface ReadingPassageGloss {
  spanish: string;
  english: string;
}

export interface RequestReadingPassageArgs {
  text: string;
  title?: string;
  comprehensionQuestion?: string;
  newVocab?: ReadingPassageGloss[];
}

export interface RequestFluencySprintArgs {
  sentence: string;
  reps?: number;
}

export interface RememberStudentFactArgs {
  key: string;
  value: string;
}

// Schema definitions passed into the Realtime `session` body as the `tools`
// array. Shape matches OpenAI's function-tool spec.
export interface RealtimeToolSchema {
  type: 'function';
  name: ToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export const REALTIME_TOOLS: readonly RealtimeToolSchema[] = [
  {
    type: 'function',
    name: TOOL_ADD_TO_NOTEBOOK,
    description:
      'Add a Spanish vocabulary word or short phrase (CHUNKS WELCOME — multi-word units like "me llamo" or "hace dos años" are preferred over isolated words when they form a meaningful unit) to the student\'s visible notebook AND seed the spaced-repetition queue. ' +
      'You MUST call this EVERY TIME you introduce a new word or phrase, BEFORE pronouncing it. ' +
      'Always include the `english` gloss when you have it (you almost always do — the sandwiching rule requires you to say it aloud). ' +
      'Do NOT narrate "Escribo X en el cuaderno" in speech — this tool is the canonical write action.',
    parameters: {
      type: 'object',
      properties: {
        word: {
          type: 'string',
          description:
            'The Spanish word or short phrase (1–6 words). ' +
            'Use natural capitalization. Example: "gustaría", "vos tenés", "me llamo".',
        },
        english: {
          type: 'string',
          description:
            'Short English gloss/translation. Required whenever you are sandwiching a new item — which is almost always at A1.1/A1.2. Keep to 1-6 words.',
        },
      },
      required: ['word'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_REQUEST_WRITING_EXERCISE,
    description:
      'Start a written exercise for the student. Call this instead of ' +
      'describing an exercise in prose; the UI will render a dedicated ' +
      'writing modal. After calling, continue speaking naturally.',
    parameters: {
      type: 'object',
      properties: {
        exerciseType: {
          type: 'string',
          enum: [
            'translation',
            'sentence',
            'conjugation',
            'fill-blank',
            'scene-description',
            'opinion-prompt',
          ],
          description:
            'Kind of exercise. "scene-description" and "opinion-prompt" are production-without-translation variants — prefer these at A2.1+.',
        },
        prompt: {
          type: 'string',
          description:
            'Student-facing prompt, phrased as an instruction. ' +
            'Example: "Translate to Spanish: \'I would like\'".',
        },
        expectedAnswer: {
          type: 'string',
          description: 'Canonical correct answer (optional, used for grading).',
        },
        hints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to 2 short hints. Optional.',
        },
      },
      required: ['exerciseType', 'prompt'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_MARK_SPEAKING_PROMPT,
    description:
      'Call this EVERY TIME you ask the student to speak, repeat, or answer ' +
      'out loud. Used internally to measure lesson engagement; does not ' +
      'change what the student sees.',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Optional short description of what you asked.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_MARK_CONCEPT_TAUGHT,
    description:
      'Call ONCE per new pedagogical concept you introduce (a grammar rule, ' +
      'a vocabulary theme, a usage pattern). Used to track lesson progress ' +
      'and decide when the lesson may end.',
    parameters: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description:
            'Short label for the concept. Example: "condicional simple", ' +
            '"días de la semana", "gustar con pronombres".',
        },
      },
      required: ['concept'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_REQUEST_END_LESSON,
    description:
      'Ask the system for permission to end the lesson. You MUST call this ' +
      'BEFORE any farewell, summary, or closing phrase. The system will ' +
      'respond with a function output whose payload contains ' +
      '{ allowed: boolean, reason: string, action: string }. If allowed is ' +
      'false, you MUST NOT end — continue with the next concept silently, ' +
      'following the action instruction, and never mention this tool. If ' +
      'allowed is true, you may give a brief summary and a farewell.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Short internal reason you believe the lesson should end ' +
            '(e.g. "objectives complete", "student disengaged").',
        },
      },
      required: ['reason'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_MARK_ITEM_REVIEWED,
    description:
      'Advance the SRS state for an item the student just recycled. Call this ' +
      'AFTER the student produces (or fails to produce) an item from the ' +
      'OPENING RETRIEVAL SPRINT, COSAS PARA REPASAR, or any past item you ' +
      'pulled into today\'s activity. The system converts performance to an ' +
      'SM-2 rating internally. Unknown items are silently ignored, so you ' +
      'can call this liberally.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['vocab', 'error'],
          description:
            '"vocab" for a notebook/vocabulary word, "error" for a past mistake ' +
            'from the COSAS PARA REPASAR block.',
        },
        spanish: {
          type: 'string',
          description: 'Exact Spanish text of the item as it appears in the queue.',
        },
        performance: {
          type: 'string',
          enum: ['again', 'hard', 'good', 'easy'],
          description:
            'How well the student handled it. "again"=failed, "hard"=weak ' +
            'success with hesitation, "good"=normal correct, "easy"=instant and confident.',
        },
      },
      required: ['kind', 'spanish', 'performance'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_REQUEST_PRONUNCIATION_DRILL,
    description:
      'Open a pronunciation drill modal and focus the student on a specific ' +
      'Spanish phonological feature. Use once per lesson at A1.1-A1.3 (and ' +
      'when the student\'s production shows a persistent phonological error). ' +
      'After calling the tool, model each item slowly, then ask the student to repeat.',
    parameters: {
      type: 'object',
      properties: {
        drillType: {
          type: 'string',
          enum: [
            'minimal-pairs',
            'vowel-purity',
            'stress',
            'rolled-rr',
            'silent-h',
            'soft-d',
          ],
          description:
            'Which phonological feature is being trained. Pick the one that ' +
            'matches the items you want to drill.',
        },
        items: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Up to 4 Spanish tokens for the student to practice (e.g. ["pero", "perro"] for a minimal pair).',
        },
        target: {
          type: 'string',
          description:
            'Short plain-English description of the rule/phoneme in focus. ' +
            'Example: "single flap /ɾ/ vs trilled /r/".',
        },
      },
      required: ['drillType', 'items', 'target'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_REQUEST_LISTENING_EXERCISE,
    description:
      'Open a listening-comprehension modal where the student listens to a ' +
      'short Spanish scene and answers a comprehension question WITHOUT being ' +
      'required to produce Spanish. Use this BEFORE any production drill at A1.1 and A1.2. ' +
      'After calling, narrate the scene slowly and clearly.',
    parameters: {
      type: 'object',
      properties: {
        scene: {
          type: 'string',
          description:
            '2-4 short Spanish sentences at the student\'s sub-level. No English.',
        },
        comprehensionQuestion: {
          type: 'string',
          description:
            'Question asked in ENGLISH about what the student just heard.',
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['id', 'label'],
            additionalProperties: false,
          },
          description:
            'Optional multiple-choice options in English. Omit for short-text answer.',
        },
        correctAnswer: {
          type: 'string',
          description:
            'Option id (if options provided) or exact expected text otherwise.',
        },
      },
      required: ['scene', 'comprehensionQuestion', 'correctAnswer'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_REQUEST_READING_PASSAGE,
    description:
      'Show a short Spanish reading passage and ask a comprehension question. ' +
      'Use ONCE near the end of every lesson at A1.2 and above, drawing only on ' +
      'vocabulary the student has already seen today or in the notebook. ' +
      'After calling the tool, read the text aloud slowly, then ask the question in Spanish.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '3-5 short Spanish sentences forming a coherent mini-story.',
        },
        title: {
          type: 'string',
          description: 'Optional Spanish title for the passage.',
        },
        comprehensionQuestion: {
          type: 'string',
          description:
            'Optional one-sentence question asked in Spanish about the passage.',
        },
        newVocab: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              spanish: { type: 'string' },
              english: { type: 'string' },
            },
            required: ['spanish', 'english'],
            additionalProperties: false,
          },
          description:
            'Optional glosses for any word the student has not yet seen. Keep to ≤ 3 items.',
        },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_REQUEST_FLUENCY_SPRINT,
    description:
      'Run a fluency sprint: the student repeats one Spanish sentence multiple ' +
      'times, each time faster. Use ONCE per lesson at A2.1+ on a structure the ' +
      'student has just correctly produced, to consolidate speed and prosody.',
    parameters: {
      type: 'object',
      properties: {
        sentence: {
          type: 'string',
          description:
            'The Spanish sentence to drill. Should be one the student has already produced successfully.',
        },
        reps: {
          type: 'number',
          description: 'Number of repetitions. Default 3.',
        },
      },
      required: ['sentence'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: TOOL_REMEMBER_STUDENT_FACT,
    description:
      'Persist a durable personal fact the student volunteered, so you can ' +
      'reference it in future lessons for narrative continuity. Examples: ' +
      '{key: "pet", value: "dog named Luna"} or {key: "travel_plan", value: "moving to Madrid in July"}. ' +
      'Do NOT call this for transient states ("tired today", "had coffee"). ' +
      'Do NOT narrate to the student that you are remembering — the tool is silent.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description:
            'Short snake_case category key. Examples: "pet", "job_change", "favorite_food", "travel_plan".',
        },
        value: {
          type: 'string',
          description:
            'Short value, typically in English for reliable future recall. Max 120 chars.',
        },
      },
      required: ['key', 'value'],
      additionalProperties: false,
    },
  },
];

// Shape of the payload we send back as `function_call_output` in response to
// a `request_end_lesson` tool call. Kept as a type so server + client agree.
export interface RequestEndLessonOutput {
  allowed: boolean;
  reason: string;
  action: string;
}
