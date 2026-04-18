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

export type ToolName =
  | typeof TOOL_ADD_TO_NOTEBOOK
  | typeof TOOL_REQUEST_WRITING_EXERCISE
  | typeof TOOL_MARK_SPEAKING_PROMPT
  | typeof TOOL_MARK_CONCEPT_TAUGHT
  | typeof TOOL_REQUEST_END_LESSON;

// Parameter shapes for each tool. The model will serialize these to JSON
// matching these schemas. Client-side we validate before dispatching.

export interface AddToNotebookArgs {
  word: string;
}

export type WritingExerciseType =
  | 'translation'
  | 'sentence'
  | 'conjugation'
  | 'fill-blank';

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
      'Add a Spanish vocabulary word or short phrase to the student\'s visible notebook. ' +
      'You MUST call this EVERY TIME you introduce a new word or phrase, BEFORE pronouncing it. ' +
      'Do NOT narrate "Escribo X en el cuaderno" in speech — this tool is the canonical write action.',
    parameters: {
      type: 'object',
      properties: {
        word: {
          type: 'string',
          description:
            'The Spanish word or short phrase (1–6 words). ' +
            'Use natural capitalization. Example: "gustaría", "vos tenés".',
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
          enum: ['translation', 'sentence', 'conjugation', 'fill-blank'],
          description: 'Kind of exercise.',
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
];

// Shape of the payload we send back as `function_call_output` in response to
// a `request_end_lesson` tool call. Kept as a type so server + client agree.
export interface RequestEndLessonOutput {
  allowed: boolean;
  reason: string;
  action: string;
}
