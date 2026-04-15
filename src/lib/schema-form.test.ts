import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Ajv from "ajv";
import {
  schemaToFormFields,
  legacyToJsonSchema,
  isLegacySchema,
  validateAgainstSchema,
  __resetCompileCacheForTests,
  type JSONSchema,
  type LegacyInputField,
  type FormField,
} from "./schema-form";

beforeEach(() => {
  __resetCompileCacheForTests();
});

// ---------- schemaToFormFields ----------

describe("schemaToFormFields", () => {
  it("returns [] for a schema without properties", () => {
    expect(schemaToFormFields({ type: "object" })).toEqual([]);
    expect(schemaToFormFields({} as JSONSchema)).toEqual([]);
  });

  it("emits a plain text control for `type: string`", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        prompt: { type: "string" },
      },
    });
    expect(fields).toHaveLength(1);
    expect(fields[0].control).toBe("text");
    expect(fields[0].path).toBe("prompt");
    expect(fields[0].label).toBe("Prompt");
    expect(fields[0].required).toBe(false);
  });

  it("humanizes property names when no title is set (underscores -> spaces, capitalize first)", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        system_prompt: { type: "string" },
      },
    });
    expect(fields[0].label).toBe("System prompt");
  });

  it("uses `title` when present instead of humanized name", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        x: { type: "string", title: "Custom Label" },
      },
    });
    expect(fields[0].label).toBe("Custom Label");
  });

  it("passes `description` through", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        x: { type: "string", description: "Help text" },
      },
    });
    expect(fields[0].description).toBe("Help text");
  });

  it("marks fields in the top-level `required` array as required", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "string" },
      },
      required: ["a"],
    });
    const a = fields.find((f) => f.path === "a")!;
    const b = fields.find((f) => f.path === "b")!;
    expect(a.required).toBe(true);
    expect(b.required).toBe(false);
  });

  it("maps format: textarea -> textarea control", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: { body: { type: "string", format: "textarea" } },
    });
    expect(fields[0].control).toBe("textarea");
  });

  it("maps format: code -> code control", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: { src: { type: "string", format: "code" } },
    });
    expect(fields[0].control).toBe("code");
  });

  it("maps format: uri -> url control", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: { website: { type: "string", format: "uri" } },
    });
    expect(fields[0].control).toBe("url");
  });

  it("maps format: email -> email control", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: { contact: { type: "string", format: "email" } },
    });
    expect(fields[0].control).toBe("email");
  });

  it("maps string+enum -> select with options", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        size: { type: "string", enum: ["small", "medium", "large"] },
      },
    });
    expect(fields[0].control).toBe("select");
    expect(fields[0].options).toEqual(["small", "medium", "large"]);
  });

  it("maps contentEncoding base64 + contentMediaType image/* -> file with accept", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        photo: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "image/*",
        },
      },
    });
    expect(fields[0].control).toBe("file");
    expect(fields[0].accept).toBe("image/*");
  });

  it("maps contentEncoding base64 + contentMediaType audio/* -> file", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        clip: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "audio/*",
        },
      },
    });
    expect(fields[0].control).toBe("file");
    expect(fields[0].accept).toBe("audio/*");
  });

  it("maps contentEncoding base64 + contentMediaType video/* -> file", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        clip: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "video/*",
        },
      },
    });
    expect(fields[0].control).toBe("file");
    expect(fields[0].accept).toBe("video/*");
  });

  it("preserves contentMediaType verbatim for specific mime types", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        doc: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "application/pdf",
        },
      },
    });
    expect(fields[0].control).toBe("file");
    expect(fields[0].accept).toBe("application/pdf");
  });

  it("copies minLength, maxLength, pattern, default to FormField", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        s: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          pattern: "^[a-z]+$",
          default: "foo",
        },
      },
    });
    expect(fields[0].minLength).toBe(2);
    expect(fields[0].maxLength).toBe(100);
    expect(fields[0].pattern).toBe("^[a-z]+$");
    expect(fields[0].defaultValue).toBe("foo");
  });

  it("maps integer with min/max -> number control", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        count: { type: "integer", minimum: 1, maximum: 99 },
      },
    });
    expect(fields[0].control).toBe("number");
    expect(fields[0].min).toBe(1);
    expect(fields[0].max).toBe(99);
  });

  it("maps number type -> number control", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        ratio: { type: "number", minimum: 0.1, maximum: 0.9 },
      },
    });
    expect(fields[0].control).toBe("number");
    expect(fields[0].min).toBe(0.1);
    expect(fields[0].max).toBe(0.9);
  });

  it("maps boolean -> checkbox", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: { flag: { type: "boolean" } },
    });
    expect(fields[0].control).toBe("checkbox");
  });

  it("maps array of primitive strings -> tags", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        keywords: { type: "array", items: { type: "string" } },
      },
    });
    expect(fields[0].control).toBe("tags");
  });

  it("maps array of integer items -> tags", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        nums: { type: "array", items: { type: "integer" } },
      },
    });
    expect(fields[0].control).toBe("tags");
  });

  it("maps nested object -> fieldset with correct child paths", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        options: {
          type: "object",
          properties: {
            seed: { type: "integer" },
            temperature: { type: "number" },
          },
          required: ["seed"],
        },
      },
    });

    expect(fields).toHaveLength(1);
    expect(fields[0].control).toBe("fieldset");
    expect(fields[0].path).toBe("options");
    expect(fields[0].children).toBeDefined();
    const children = fields[0].children!;
    expect(children).toHaveLength(2);

    const seed = children.find((c) => c.path === "options.seed")!;
    expect(seed.control).toBe("number");
    expect(seed.required).toBe(true);

    const temperature = children.find((c) => c.path === "options.temperature")!;
    expect(temperature.control).toBe("number");
    expect(temperature.required).toBe(false);
  });

  it("recurses into deeply nested objects with correct dot paths", () => {
    const fields = schemaToFormFields({
      type: "object",
      properties: {
        a: {
          type: "object",
          properties: {
            b: {
              type: "object",
              properties: {
                c: { type: "string" },
              },
            },
          },
        },
      },
    });
    expect(fields[0].control).toBe("fieldset");
    const b = fields[0].children![0];
    expect(b.control).toBe("fieldset");
    expect(b.path).toBe("a.b");
    const c = b.children![0];
    expect(c.path).toBe("a.b.c");
    expect(c.control).toBe("text");
  });

  it("covers every Control value", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        t: { type: "string" }, // text
        ta: { type: "string", format: "textarea" }, // textarea
        cd: { type: "string", format: "code" }, // code
        u: { type: "string", format: "uri" }, // url
        em: { type: "string", format: "email" }, // email
        sel: { type: "string", enum: ["a", "b"] }, // select
        n: { type: "integer" }, // number
        b: { type: "boolean" }, // checkbox
        f: { type: "string", contentEncoding: "base64", contentMediaType: "image/*" }, // file
        tags: { type: "array", items: { type: "string" } }, // tags
        fs: { type: "object", properties: { inner: { type: "string" } } }, // fieldset
      },
    };
    const fields = schemaToFormFields(schema);
    const controls = new Set(fields.map((f) => f.control));

    for (const c of [
      "text",
      "textarea",
      "code",
      "url",
      "email",
      "select",
      "number",
      "checkbox",
      "file",
      "tags",
      "fieldset",
    ] as const) {
      expect(controls).toContain(c);
    }
  });
});

// ---------- legacyToJsonSchema + isLegacySchema ----------

describe("isLegacySchema", () => {
  it("returns true for a non-empty array of {name, type} entries", () => {
    expect(
      isLegacySchema([
        { name: "a", type: "text" },
        { name: "b", type: "number" },
      ]),
    ).toBe(true);
  });

  it("returns false for empty array", () => {
    expect(isLegacySchema([])).toBe(false);
  });

  it("returns false for a JSON Schema object", () => {
    expect(
      isLegacySchema({
        type: "object",
        properties: { a: { type: "string" } },
      }),
    ).toBe(false);
  });

  it("returns false for an array whose entries miss name or type", () => {
    expect(isLegacySchema([{ name: "a" }])).toBe(false);
    expect(isLegacySchema([{ type: "text" }])).toBe(false);
  });

  it("returns false for an unknown legacy type", () => {
    expect(isLegacySchema([{ name: "a", type: "bogus" }])).toBe(false);
  });

  it("returns false for null / undefined / primitives", () => {
    expect(isLegacySchema(null)).toBe(false);
    expect(isLegacySchema(undefined)).toBe(false);
    expect(isLegacySchema("text")).toBe(false);
    expect(isLegacySchema(42)).toBe(false);
  });
});

describe("legacyToJsonSchema", () => {
  it("rounds each of the eight legacy types into a canonical JSON Schema", () => {
    const legacy: LegacyInputField[] = [
      { name: "t", type: "text" },
      { name: "ta", type: "textarea" },
      { name: "s", type: "select", options: ["a", "b"] },
      { name: "cd", type: "code" },
      { name: "u", type: "url" },
      { name: "g", type: "git_url" },
      { name: "f", type: "file", accept: "image/*" },
      { name: "n", type: "number" },
    ];
    const schema = legacyToJsonSchema(legacy);
    expect(schema.type).toBe("object");
    const props = schema.properties as Record<string, JSONSchema>;

    expect(props.t).toEqual({ type: "string" });
    expect(props.ta).toEqual({ type: "string", format: "textarea" });
    expect(props.s).toEqual({ type: "string", enum: ["a", "b"] });
    expect(props.cd).toEqual({ type: "string", format: "code" });
    expect(props.u).toEqual({ type: "string", format: "uri" });
    expect(props.g).toEqual({ type: "string", format: "uri" });
    expect(props.f).toEqual({
      type: "string",
      contentEncoding: "base64",
      contentMediaType: "image/*",
    });
    expect(props.n).toEqual({ type: "number" });
  });

  it("falls back to application/octet-stream accept when missing on file", () => {
    const schema = legacyToJsonSchema([{ name: "f", type: "file" }]);
    const props = schema.properties as Record<string, JSONSchema>;
    expect(props.f).toEqual({
      type: "string",
      contentEncoding: "base64",
      contentMediaType: "application/octet-stream",
    });
  });

  it("joins accept string[] into a comma-separated contentMediaType for file fields", () => {
    const schema = legacyToJsonSchema([
      { name: "f", type: "file", accept: [".json", ".csv"] },
    ]);
    const props = schema.properties as Record<string, JSONSchema>;
    expect(props.f).toEqual({
      type: "string",
      contentEncoding: "base64",
      contentMediaType: ".json,.csv",
    });
  });

  it("produces empty enum array when select has no options", () => {
    const schema = legacyToJsonSchema([{ name: "s", type: "select" }]);
    const props = schema.properties as Record<string, JSONSchema>;
    expect(props.s).toEqual({ type: "string", enum: [] });
  });

  it("promotes required: true entries into the top-level required array", () => {
    const schema = legacyToJsonSchema([
      { name: "a", type: "text", required: true },
      { name: "b", type: "text" },
      { name: "c", type: "number", required: true },
    ]);
    expect(schema.required).toEqual(["a", "c"]);
  });

  it("copies label -> title and description passes through", () => {
    const schema = legacyToJsonSchema([
      { name: "a", type: "text", label: "My Label", description: "Helpful" },
    ]);
    const props = schema.properties as Record<string, JSONSchema>;
    expect(props.a).toEqual({
      type: "string",
      title: "My Label",
      description: "Helpful",
    });
  });

  it("round-trips through isLegacySchema: output is a JSON Schema object and rejected by isLegacySchema", () => {
    const schema = legacyToJsonSchema([{ name: "a", type: "text" }]);
    expect(isLegacySchema(schema)).toBe(false);
  });
});

// ---------- validateAgainstSchema ----------

describe("validateAgainstSchema", () => {
  it("passes a valid value", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: { name: { type: "string", maxLength: 100 } },
      required: ["name"],
    };
    const result = validateAgainstSchema(schema, { name: "hello" });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports instancePath as `path` and root errors as empty string", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    };
    const result = validateAgainstSchema(schema, {});
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // required error is at the root instance
    expect(result.errors[0].path).toBe("");
  });

  it("rejects string exceeding maxLength", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: { name: { type: "string", maxLength: 3 } },
      required: ["name"],
    };
    const result = validateAgainstSchema(schema, { name: "abcd" });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "/name")).toBe(true);
  });

  it("rejects integer below minimum", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: { n: { type: "integer", minimum: 5 } },
      required: ["n"],
    };
    const result = validateAgainstSchema(schema, { n: 4 });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "/n")).toBe(true);
  });

  it("rejects value not in enum", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: { size: { type: "string", enum: ["small", "large"] } },
      required: ["size"],
    };
    const bad = validateAgainstSchema(schema, { size: "medium" });
    expect(bad.ok).toBe(false);

    const good = validateAgainstSchema(schema, { size: "small" });
    expect(good.ok).toBe(true);
  });

  it("accepts booleans and rejects non-booleans", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: { on: { type: "boolean" } },
      required: ["on"],
    };
    expect(validateAgainstSchema(schema, { on: true }).ok).toBe(true);
    expect(validateAgainstSchema(schema, { on: false }).ok).toBe(true);
    expect(validateAgainstSchema(schema, { on: "true" }).ok).toBe(false);
  });

  it("validates arrays of strings", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" }, minItems: 1 },
      },
      required: ["tags"],
    };
    expect(validateAgainstSchema(schema, { tags: ["a", "b"] }).ok).toBe(true);
    expect(validateAgainstSchema(schema, { tags: [] }).ok).toBe(false);
    expect(validateAgainstSchema(schema, { tags: [1, 2] }).ok).toBe(false);
  });

  it("validates nested object required fields", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        options: {
          type: "object",
          properties: {
            seed: { type: "integer" },
          },
          required: ["seed"],
        },
      },
      required: ["options"],
    };
    expect(validateAgainstSchema(schema, { options: { seed: 42 } }).ok).toBe(true);
    const missing = validateAgainstSchema(schema, { options: {} });
    expect(missing.ok).toBe(false);
    // The nested-required error lives at /options
    expect(missing.errors.some((e) => e.path === "/options")).toBe(true);
  });

  it("accepts a base64-encoded string for file fields (contentEncoding)", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        photo: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "image/*",
        },
      },
      required: ["photo"],
    };
    // ajv by default does not error on contentEncoding (unless configured
    // with `validateFormats: true` for content*), so any string passes.
    // What we care about is that the schema compiles under strict mode and
    // enforces the string type.
    expect(validateAgainstSchema(schema, { photo: "aGVsbG8=" }).ok).toBe(true);
    expect(validateAgainstSchema(schema, { photo: 42 }).ok).toBe(false);
  });

  it("accepts UI-only formats (textarea, code) under strict mode without erroring on format", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        body: { type: "string", format: "textarea" },
        src: { type: "string", format: "code" },
      },
    };
    const result = validateAgainstSchema(schema, { body: "hi", src: "console.log(1)" });
    expect(result.ok).toBe(true);
  });

  it("returns a compile-failure error if the schema is invalid", () => {
    // An invalid schema keyword under strict mode triggers a compile throw.
    const bad: JSONSchema = {
      type: "object",
      properties: { a: { type: "string", unknownKeywordFoo: true } },
    };
    const result = validateAgainstSchema(bad, {});
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toBe("");
    expect(result.errors[0].message).toMatch(/Schema compile failed/);
  });

  describe("compile cache", () => {
    // Loose type: vitest's strongly-typed overloads for `compile` don't
    // line up with `spyOn` under strict mode.
    let compileSpy: { mockRestore: () => void; mock: { calls: unknown[] } };

    beforeEach(() => {
      __resetCompileCacheForTests();
      compileSpy = vi.spyOn(Ajv.prototype, "compile") as unknown as typeof compileSpy;
    });

    afterEach(() => {
      compileSpy.mockRestore();
    });

    it("compiles the same schema only once across multiple calls", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: { x: { type: "string" } },
        required: ["x"],
      };

      const first = validateAgainstSchema(schema, { x: "a" });
      const second = validateAgainstSchema(schema, { x: "b" });
      const third = validateAgainstSchema(schema, { x: "c" });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      expect(third.ok).toBe(true);
      expect(compileSpy.mock.calls.length).toBe(1);
    });

    it("treats schemas with equivalent content but different key order as the same cache entry", () => {
      const a: JSONSchema = {
        type: "object",
        properties: { x: { type: "string" } },
        required: ["x"],
      };
      const b: JSONSchema = {
        required: ["x"],
        properties: { x: { type: "string" } },
        type: "object",
      };

      validateAgainstSchema(a, { x: "hi" });
      validateAgainstSchema(b, { x: "hi" });

      expect(compileSpy.mock.calls.length).toBe(1);
    });

    it("compiles separately for structurally different schemas", () => {
      const a: JSONSchema = {
        type: "object",
        properties: { x: { type: "string" } },
      };
      const b: JSONSchema = {
        type: "object",
        properties: { y: { type: "integer" } },
      };

      validateAgainstSchema(a, { x: "hi" });
      validateAgainstSchema(b, { y: 1 });

      expect(compileSpy.mock.calls.length).toBe(2);
    });
  });
});

// ---------- Integration: legacy pipeline renders through schemaToFormFields ----------

describe("legacy -> schema -> fields pipeline", () => {
  it("legacyToJsonSchema output renders through schemaToFormFields with the expected controls", () => {
    const legacy: LegacyInputField[] = [
      { name: "title", type: "text", required: true, label: "Title" },
      { name: "body", type: "textarea" },
      { name: "size", type: "select", options: ["s", "m", "l"] },
      { name: "snippet", type: "code" },
      { name: "site", type: "url" },
      { name: "repo", type: "git_url" },
      { name: "avatar", type: "file", accept: "image/*" },
      { name: "qty", type: "number" },
    ];
    const schema = legacyToJsonSchema(legacy);
    const fields = schemaToFormFields(schema);

    const byPath: Record<string, FormField> = {};
    for (const f of fields) byPath[f.path] = f;

    expect(byPath.title.control).toBe("text");
    expect(byPath.title.required).toBe(true);
    expect(byPath.title.label).toBe("Title");
    expect(byPath.body.control).toBe("textarea");
    expect(byPath.size.control).toBe("select");
    expect(byPath.size.options).toEqual(["s", "m", "l"]);
    expect(byPath.snippet.control).toBe("code");
    expect(byPath.site.control).toBe("url");
    expect(byPath.repo.control).toBe("url");
    expect(byPath.avatar.control).toBe("file");
    expect(byPath.avatar.accept).toBe("image/*");
    expect(byPath.qty.control).toBe("number");
  });
});
