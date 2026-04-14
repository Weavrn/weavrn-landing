/**
 * schema-form.ts
 *
 * Client-side peer of `weavrn-api/src/services/tool-schema.ts`. Converts a
 * JSON Schema (draft-07 subset) into flat `FormField` descriptors the React
 * renderer can walk, coerces the legacy `InputField[]` shape into JSON
 * Schema, and validates form state against a schema via ajv.
 *
 * Supported subset mirrors the server (`tool-schema.ts`) — keep the two
 * modules in lockstep when the subset changes.
 */

import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

// -------- Types --------

export type JSONSchema = Record<string, unknown>;

export type Control =
  | "text"
  | "textarea"
  | "code"
  | "url"
  | "email"
  | "select"
  | "number"
  | "checkbox"
  | "file"
  | "tags"
  | "fieldset";

export interface FormField {
  path: string;
  label: string;
  description?: string;
  control: Control;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  defaultValue?: unknown;
  accept?: string;
  children?: FormField[];
}

export interface LegacyInputField {
  name: string;
  label?: string;
  type: "text" | "textarea" | "select" | "code" | "url" | "git_url" | "file" | "number";
  required?: boolean;
  accept?: string;
  options?: string[];
  description?: string;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

// -------- Helpers --------

const LEGACY_TYPES = new Set([
  "text",
  "textarea",
  "select",
  "code",
  "url",
  "git_url",
  "file",
  "number",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function humanize(name: string): string {
  if (!name) return name;
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") return undefined;
    strings.push(v);
  }
  return strings;
}

// -------- schemaToFormFields --------

export function schemaToFormFields(schema: JSONSchema): FormField[] {
  if (!isPlainObject(schema)) return [];
  return buildFieldsFromProperties(schema, "");
}

function buildFieldsFromProperties(node: Record<string, unknown>, basePath: string): FormField[] {
  const props = node.properties;
  if (!isPlainObject(props)) return [];

  const requiredArr = asStringArray(node.required) ?? [];
  const required = new Set(requiredArr);

  const fields: FormField[] = [];
  for (const [name, rawSchema] of Object.entries(props)) {
    if (!isPlainObject(rawSchema)) continue;
    const path = basePath ? `${basePath}.${name}` : name;
    fields.push(buildField(name, path, rawSchema, required.has(name)));
  }

  return fields;
}

function buildField(
  name: string,
  path: string,
  schema: Record<string, unknown>,
  required: boolean,
): FormField {
  const label = asString(schema.title) ?? humanize(name);
  const description = asString(schema.description);

  const field: FormField = {
    path,
    label,
    control: "text",
    required,
  };

  if (description !== undefined) field.description = description;
  if (schema.default !== undefined) field.defaultValue = schema.default;

  const type = schema.type;

  if (type === "string") {
    applyStringControl(field, schema);
  } else if (type === "integer" || type === "number") {
    applyNumberControl(field, schema);
  } else if (type === "boolean") {
    field.control = "checkbox";
  } else if (type === "array") {
    applyArrayControl(field, schema);
  } else if (type === "object") {
    applyObjectControl(field, path, schema);
  } else {
    // Unknown/missing type — default to text for safety.
    field.control = "text";
  }

  return field;
}

function applyStringControl(field: FormField, schema: Record<string, unknown>): void {
  const format = asString(schema.format);
  const enumValues = asStringArray(schema.enum);
  const contentEncoding = asString(schema.contentEncoding);
  const contentMediaType = asString(schema.contentMediaType);

  if (enumValues !== undefined) {
    field.control = "select";
    field.options = enumValues;
  } else if (contentEncoding === "base64" && contentMediaType !== undefined) {
    field.control = "file";
    // Pass through as-is — `image/*`, `audio/*`, etc. are valid `accept`
    // attributes and the UI can hand them to <input accept>.
    field.accept = contentMediaType;
  } else if (format === "textarea") {
    field.control = "textarea";
  } else if (format === "code") {
    field.control = "code";
  } else if (format === "uri") {
    field.control = "url";
  } else if (format === "email") {
    field.control = "email";
  } else {
    field.control = "text";
  }

  const minLength = asNumber(schema.minLength);
  if (minLength !== undefined) field.minLength = minLength;
  const maxLength = asNumber(schema.maxLength);
  if (maxLength !== undefined) field.maxLength = maxLength;
  const pattern = asString(schema.pattern);
  if (pattern !== undefined) field.pattern = pattern;
}

function applyNumberControl(field: FormField, schema: Record<string, unknown>): void {
  field.control = "number";
  const minimum = asNumber(schema.minimum);
  if (minimum !== undefined) field.min = minimum;
  const maximum = asNumber(schema.maximum);
  if (maximum !== undefined) field.max = maximum;
}

function applyArrayControl(field: FormField, schema: Record<string, unknown>): void {
  const items = schema.items;
  if (isPlainObject(items)) {
    const itemType = items.type;
    if (
      itemType === "string" ||
      itemType === "integer" ||
      itemType === "number" ||
      itemType === "boolean"
    ) {
      field.control = "tags";
      return;
    }
  }
  // Fallback for unsupported array shapes — render nothing renderable but
  // keep the field so the consumer knows about it.
  field.control = "tags";
}

function applyObjectControl(
  field: FormField,
  path: string,
  schema: Record<string, unknown>,
): void {
  field.control = "fieldset";
  field.children = buildFieldsFromProperties(schema, path);
}

// -------- legacyToJsonSchema + isLegacySchema --------

export function isLegacySchema(x: unknown): boolean {
  if (!Array.isArray(x) || x.length === 0) return false;
  for (const entry of x) {
    if (!isPlainObject(entry)) return false;
    if (typeof entry.name !== "string") return false;
    if (typeof entry.type !== "string") return false;
    if (!LEGACY_TYPES.has(entry.type)) return false;
  }
  return true;
}

export function legacyToJsonSchema(legacy: LegacyInputField[]): JSONSchema {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  for (const entry of legacy) {
    const name = entry.name;
    const type = entry.type;
    let prop: JSONSchema = {};

    switch (type) {
      case "text":
        prop = { type: "string" };
        break;
      case "textarea":
        prop = { type: "string", format: "textarea" };
        break;
      case "code":
        prop = { type: "string", format: "code" };
        break;
      case "url":
      case "git_url":
        prop = { type: "string", format: "uri" };
        break;
      case "select": {
        const options = Array.isArray(entry.options)
          ? entry.options.filter((o): o is string => typeof o === "string")
          : [];
        prop = { type: "string", enum: options };
        break;
      }
      case "file": {
        const accept =
          typeof entry.accept === "string" ? entry.accept : "application/octet-stream";
        prop = {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: accept,
        };
        break;
      }
      case "number":
        prop = { type: "number" };
        break;
      default:
        prop = { type: "string" };
    }

    if (typeof entry.label === "string") {
      prop.title = entry.label;
    }
    if (typeof entry.description === "string") {
      prop.description = entry.description;
    }

    properties[name] = prop;

    if (entry.required === true) {
      required.push(name);
    }
  }

  return {
    type: "object",
    properties,
    required,
  };
}

// -------- validateAgainstSchema --------

const ajv = new Ajv({
  strict: true,
  allErrors: true,
  allowUnionTypes: false,
});
addFormats(ajv);

// UI-only formats — stubbed so strict mode accepts them during compile.
for (const fmt of ["textarea", "code"]) {
  if (!ajv.formats[fmt]) {
    ajv.addFormat(fmt, true);
  }
}

const compileCache = new Map<string, ValidateFunction>();

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function validateAgainstSchema(schema: JSONSchema, value: unknown): ValidationResult {
  const cacheKey = stableStringify(schema);
  let validate = compileCache.get(cacheKey);

  if (!validate) {
    try {
      validate = ajv.compile(schema);
      compileCache.set(cacheKey, validate);
    } catch (err) {
      return {
        ok: false,
        errors: [
          {
            path: "",
            message: `Schema compile failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }

  const valid = validate(value);
  if (valid) {
    return { ok: true, errors: [] };
  }

  const errors: ValidationError[] = (validate.errors ?? []).map((e) => ({
    path: e.instancePath ?? "",
    message: e.message ?? "",
  }));

  return { ok: false, errors };
}

// Test-only: reset the compile cache. Not exported from the public surface
// as far as runtime consumers are concerned, but useful for the unit tests
// to assert cache behavior deterministically.
export function __resetCompileCacheForTests(): void {
  compileCache.clear();
}
