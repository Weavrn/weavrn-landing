/**
 * tool-presets.ts
 *
 * Inline JSON-Schema presets keyed by `tool_category`. The publish wizard's
 * "Template" tab reads these to seed a new tool with a reasonable starting
 * shape; providers can still edit the schema in the Builder or Raw JSON tab
 * afterwards.
 *
 * Only a few categories have tailored presets — the rest fall back to a
 * generic `{ prompt: string }` default via `getPresetForCategory`. Expand as
 * real tool categories get first-class support.
 */

import type { JSONSchema } from "./schema-form";

export const TOOL_CATEGORIES = [
  "image_generation",
  "video_generation",
  "audio_generation",
  "speech_to_text",
  "text_generation",
  "vision",
  "code_execution",
  "data_extraction",
  "web_search",
  "embedding",
  "translation",
  "other",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

const GENERIC_PRESET: JSONSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      description: "Free-form text describing what you want the tool to do.",
      format: "textarea",
    },
  },
  required: ["prompt"],
};

const IMAGE_GEN_PRESET: JSONSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      description: "Describe the image you want to generate.",
      format: "textarea",
    },
    aspect_ratio: {
      type: "string",
      title: "Aspect ratio",
      enum: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      default: "1:1",
    },
    seed: {
      type: "integer",
      title: "Seed",
      description: "Optional deterministic seed.",
      minimum: 0,
    },
  },
  required: ["prompt"],
};

const TEXT_GEN_PRESET: JSONSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      description: "Instructions for the model.",
      format: "textarea",
    },
    max_tokens: {
      type: "integer",
      title: "Max tokens",
      description: "Upper bound on output tokens.",
      minimum: 1,
      maximum: 8192,
      default: 1024,
    },
  },
  required: ["prompt"],
};

const SPEECH_TO_TEXT_PRESET: JSONSchema = {
  type: "object",
  properties: {
    audio_url: {
      type: "string",
      title: "Audio URL",
      description: "Publicly reachable URL for the audio file to transcribe.",
      format: "uri",
    },
  },
  required: ["audio_url"],
};

const PRESETS: Record<ToolCategory, JSONSchema> = {
  image_generation: IMAGE_GEN_PRESET,
  video_generation: GENERIC_PRESET,
  audio_generation: GENERIC_PRESET,
  speech_to_text: SPEECH_TO_TEXT_PRESET,
  text_generation: TEXT_GEN_PRESET,
  vision: GENERIC_PRESET,
  code_execution: GENERIC_PRESET,
  data_extraction: GENERIC_PRESET,
  web_search: GENERIC_PRESET,
  embedding: GENERIC_PRESET,
  translation: GENERIC_PRESET,
  other: GENERIC_PRESET,
};

const OUTPUT_PRESETS: Record<ToolCategory, JSONSchema> = {
  image_generation: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        title: "Image URL",
        format: "uri",
      },
    },
    required: ["image_url"],
  },
  video_generation: {
    type: "object",
    properties: {
      video_url: {
        type: "string",
        title: "Video URL",
        format: "uri",
      },
    },
    required: ["video_url"],
  },
  audio_generation: {
    type: "object",
    properties: {
      audio_url: {
        type: "string",
        title: "Audio URL",
        format: "uri",
      },
    },
    required: ["audio_url"],
  },
  speech_to_text: {
    type: "object",
    properties: {
      text: {
        type: "string",
        title: "Transcript",
      },
    },
    required: ["text"],
  },
  text_generation: {
    type: "object",
    properties: {
      text: {
        type: "string",
        title: "Response",
      },
    },
    required: ["text"],
  },
  vision: {
    type: "object",
    properties: {
      description: { type: "string", title: "Description" },
    },
    required: ["description"],
  },
  code_execution: {
    type: "object",
    properties: {
      stdout: { type: "string", title: "Stdout" },
      stderr: { type: "string", title: "Stderr" },
      exit_code: { type: "integer", title: "Exit code" },
    },
    required: ["stdout"],
  },
  data_extraction: {
    type: "object",
    properties: {
      data: { type: "object", title: "Extracted data" },
    },
    required: ["data"],
  },
  web_search: {
    type: "object",
    properties: {
      results: {
        type: "array",
        title: "Results",
        items: { type: "string" },
      },
    },
    required: ["results"],
  },
  embedding: {
    type: "object",
    properties: {
      vector: {
        type: "array",
        title: "Vector",
        items: { type: "number" },
      },
    },
    required: ["vector"],
  },
  translation: {
    type: "object",
    properties: {
      translated_text: { type: "string", title: "Translated text" },
    },
    required: ["translated_text"],
  },
  other: {
    type: "object",
    properties: {
      result: { type: "string", title: "Result" },
    },
    required: ["result"],
  },
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getPresetForCategory(category: ToolCategory): JSONSchema {
  return deepClone(PRESETS[category] ?? GENERIC_PRESET);
}

export function getOutputPresetForCategory(category: ToolCategory): JSONSchema {
  return deepClone(OUTPUT_PRESETS[category] ?? OUTPUT_PRESETS.other);
}

export function getDefaultContentTypeForCategory(category: ToolCategory): string {
  switch (category) {
    case "image_generation":
      return "image/png";
    case "video_generation":
      return "video/mp4";
    case "audio_generation":
      return "audio/mpeg";
    case "speech_to_text":
    case "text_generation":
    case "translation":
      return "text";
    default:
      return "json";
  }
}
