import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { useState } from "react";
import SchemaForm from "./SchemaForm";
import {
  schemaToFormFields,
  type FormField,
  type JSONSchema,
} from "../lib/schema-form";

interface HarnessProps {
  fields: FormField[];
  initial?: Record<string, unknown>;
  errors?: Record<string, string>;
  disabled?: boolean;
  onFileUpload?: (field: FormField, file: File) => Promise<string>;
  onStateChange?: (next: Record<string, unknown>) => void;
}

function Harness(props: HarnessProps): JSX.Element {
  const [value, setValue] = useState<Record<string, unknown>>(props.initial ?? {});
  return (
    <SchemaForm
      fields={props.fields}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onStateChange?.(next);
      }}
      errors={props.errors}
      disabled={props.disabled}
      onFileUpload={props.onFileUpload}
    />
  );
}

function fieldsFromSchema(schema: JSONSchema): FormField[] {
  return schemaToFormFields(schema);
}

// Polyfill FileReader.readAsDataURL for jsdom — while jsdom has FileReader,
// tests assert on the emitted data URL, so we spy on its readAsDataURL to
// produce a deterministic base64 payload.
function installFileReaderDataUrl(payload: string): void {
  const orig = FileReader.prototype.readAsDataURL;
  vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (
    this: FileReader,
  ) {
    Object.defineProperty(this, "result", {
      configurable: true,
      value: payload,
    });
    // Invoke async to mimic real FileReader semantics.
    setTimeout(() => {
      const ev = new ProgressEvent("load");
      if (typeof this.onload === "function") {
        this.onload.call(this as unknown as FileReader, ev as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
  });
  // Silence the lint — we keep a reference to the original to avoid leak warnings.
  void orig;
}

describe("SchemaForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a text input with label, required asterisk, and fires onChange on typing", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        prompt: { type: "string", description: "Help" },
      },
      required: ["prompt"],
    });
    const captured: Record<string, unknown>[] = [];
    render(
      <Harness
        fields={fields}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );

    const label = screen.getByText("Prompt");
    expect(label).toBeTruthy();
    expect(screen.getByText("Help")).toBeTruthy();
    expect(screen.getByText("*")).toBeTruthy();

    const input = screen.getByLabelText(/Prompt/) as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("text");
    expect(input.required).toBe(true);

    fireEvent.change(input, { target: { value: "hello" } });

    expect(captured[captured.length - 1]).toEqual({ prompt: "hello" });
  });

  it("renders defaultValue as the input's initial display but does not auto-write state", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        greeting: { type: "string", default: "hi there" },
      },
    });
    const captured: Record<string, unknown>[] = [];
    render(
      <Harness
        fields={fields}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );
    const input = screen.getByLabelText(/Greeting/) as HTMLInputElement;
    expect(input.value).toBe("hi there");
    // No onChange was called during render.
    expect(captured).toHaveLength(0);
  });

  it("renders a textarea for format:textarea (rows=4)", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: { body: { type: "string", format: "textarea" } },
    });
    render(<Harness fields={fields} />);
    const ta = screen.getByLabelText(/Body/) as HTMLTextAreaElement;
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta.rows).toBe(4);
  });

  it("renders a code textarea for format:code (rows=6 with font-mono)", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: { src: { type: "string", format: "code" } },
    });
    render(<Harness fields={fields} />);
    const ta = screen.getByLabelText(/Src/) as HTMLTextAreaElement;
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta.rows).toBe(6);
    expect(ta.className).toMatch(/font-mono/);
  });

  it("renders a url input for format:uri", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: { site: { type: "string", format: "uri" } },
    });
    render(<Harness fields={fields} />);
    const input = screen.getByLabelText(/Site/) as HTMLInputElement;
    expect(input.type).toBe("url");
  });

  it("renders an email input for format:email", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: { contact: { type: "string", format: "email" } },
    });
    render(<Harness fields={fields} />);
    const input = screen.getByLabelText(/Contact/) as HTMLInputElement;
    expect(input.type).toBe("email");
  });

  it("honors minLength/maxLength/pattern on a text field", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        slug: {
          type: "string",
          minLength: 2,
          maxLength: 40,
          pattern: "^[a-z0-9-]+$",
        },
      },
    });
    render(<Harness fields={fields} />);
    const input = screen.getByLabelText(/Slug/) as HTMLInputElement;
    expect(input.minLength).toBe(2);
    expect(input.maxLength).toBe(40);
    expect(input.pattern).toBe("^[a-z0-9-]+$");
  });

  it("renders a select for string+enum with a blank option when not required", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        model: { type: "string", enum: ["gpt-4", "claude-3"] },
      },
    });
    render(<Harness fields={fields} />);
    const select = screen.getByLabelText(/Model/) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.options).toHaveLength(3);
    expect(select.options[0].value).toBe("");
    expect(select.options[1].value).toBe("gpt-4");
    expect(select.options[2].value).toBe("claude-3");
  });

  it("omits the blank option when the select field is required", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        model: { type: "string", enum: ["gpt-4", "claude-3"] },
      },
      required: ["model"],
    });
    render(<Harness fields={fields} />);
    const select = screen.getByLabelText(/Model/) as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    expect(select.options[0].value).toBe("gpt-4");
  });

  it("renders a number input with min/max and writes a numeric value", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        temperature: { type: "number", minimum: 0, maximum: 2 },
      },
    });
    const captured: Record<string, unknown>[] = [];
    render(
      <Harness
        fields={fields}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );
    const input = screen.getByLabelText(/Temperature/) as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.min).toBe("0");
    expect(input.max).toBe("2");

    fireEvent.change(input, { target: { value: "1.25" } });
    expect(captured[captured.length - 1]).toEqual({ temperature: 1.25 });
  });

  it("renders a checkbox and toggles true/false", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        agree: { type: "boolean", title: "Agree" },
      },
    });
    const captured: Record<string, unknown>[] = [];
    render(
      <Harness
        fields={fields}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );
    const box = screen.getByLabelText(/Agree/) as HTMLInputElement;
    expect(box.type).toBe("checkbox");
    expect(box.checked).toBe(false);

    fireEvent.click(box);
    expect(captured[captured.length - 1]).toEqual({ agree: true });

    fireEvent.click(box);
    expect(captured[captured.length - 1]).toEqual({ agree: false });
  });

  it("renders a file input with accept and writes the returned URL when onFileUpload is provided", async () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        asset: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "image/*",
        },
      },
    });
    const captured: Record<string, unknown>[] = [];
    const onFileUpload = vi.fn(async (_field: FormField, _file: File) => {
      return "https://cdn.example.com/uploaded.png";
    });

    render(
      <Harness
        fields={fields}
        onFileUpload={onFileUpload}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );

    const input = screen.getByLabelText(/Asset/) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe("image/*");

    const file = new File(["hello"], "pic.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onFileUpload).toHaveBeenCalledTimes(1);
    });
    expect(onFileUpload.mock.calls[0][1]).toBe(file);
    await waitFor(() => {
      expect(captured[captured.length - 1]).toEqual({
        asset: "https://cdn.example.com/uploaded.png",
      });
    });
  });

  it("writes a base64 data URL when onFileUpload is NOT provided", async () => {
    installFileReaderDataUrl("data:image/png;base64,AAAA");

    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        asset: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "image/*",
        },
      },
    });
    const captured: Record<string, unknown>[] = [];

    render(
      <Harness
        fields={fields}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );

    const input = screen.getByLabelText(/Asset/) as HTMLInputElement;
    const file = new File(["hi"], "pic.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(captured[captured.length - 1]).toEqual({
        asset: "data:image/png;base64,AAAA",
      });
    });
  });

  it("renders a tags chip input; Enter adds a chip; Backspace on empty input removes the last chip", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
      },
    });
    const captured: Record<string, unknown>[] = [];
    render(
      <Harness
        fields={fields}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );

    const input = screen.getByLabelText(/Tags/) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "red" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(captured[captured.length - 1]).toEqual({ tags: ["red"] });
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { value: "blue" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(captured[captured.length - 1]).toEqual({ tags: ["red", "blue"] });
    expect(screen.getByText("red")).toBeTruthy();
    expect(screen.getByText("blue")).toBeTruthy();

    // Backspace on empty input removes the last chip.
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(captured[captured.length - 1]).toEqual({ tags: ["red"] });
  });

  it("recursively renders nested fieldsets with dot-path keys", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        options: {
          type: "object",
          properties: {
            seed: { type: "integer" },
            model: { type: "string", enum: ["a", "b"] },
          },
          required: ["seed"],
        },
      },
    });

    expect(fields).toHaveLength(1);
    expect(fields[0].control).toBe("fieldset");
    expect(fields[0].children?.[0].path).toBe("options.seed");
    expect(fields[0].children?.[1].path).toBe("options.model");

    const captured: Record<string, unknown>[] = [];
    render(
      <Harness
        fields={fields}
        onStateChange={(next) => {
          captured.push(next);
        }}
      />,
    );

    // Legend rendered
    expect(screen.getByText("Options")).toBeTruthy();

    const seedInput = screen.getByLabelText(/Seed/) as HTMLInputElement;
    expect(seedInput.type).toBe("number");
    fireEvent.change(seedInput, { target: { value: "42" } });
    expect(captured[captured.length - 1]).toEqual({ "options.seed": 42 });

    const modelSelect = screen.getByLabelText(/Model/) as HTMLSelectElement;
    fireEvent.change(modelSelect, { target: { value: "a" } });
    expect(captured[captured.length - 1]).toEqual({
      "options.seed": 42,
      "options.model": "a",
    });
  });

  it("renders an error message and sets aria-invalid when errors[path] is set", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        prompt: { type: "string" },
      },
    });

    render(
      <Harness fields={fields} errors={{ prompt: "must not be empty" }} />,
    );

    expect(screen.getByText("must not be empty")).toBeTruthy();
    const input = screen.getByLabelText(/Prompt/) as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("disables every control when disabled=true", () => {
    const fields = fieldsFromSchema({
      type: "object",
      properties: {
        prompt: { type: "string" },
        body: { type: "string", format: "textarea" },
        model: { type: "string", enum: ["a", "b"] },
        temperature: { type: "number" },
        agree: { type: "boolean" },
        asset: {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: "image/*",
        },
        tags: { type: "array", items: { type: "string" } },
      },
    });

    render(<Harness fields={fields} disabled={true} />);

    expect((screen.getByLabelText(/Prompt/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Body/) as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Model/) as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Temperature/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Agree/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Asset/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Tags/) as HTMLInputElement).disabled).toBe(true);
  });
});
