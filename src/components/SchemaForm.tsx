"use client";

import { useId, useState, useCallback } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import type { FormField } from "../lib/schema-form";

export interface SchemaFormProps {
  fields: FormField[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  onFileUpload?: (field: FormField, file: File) => Promise<string>;
}

const INPUT_CLASS =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-weavrn-accent/50 disabled:opacity-50 disabled:cursor-not-allowed";

const CODE_CLASS = `${INPUT_CLASS} font-mono text-xs resize-none`;

const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;

const LABEL_CLASS =
  "block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1";

const DESCRIPTION_CLASS =
  "block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1";

const ERROR_CLASS =
  "block text-xs text-red-500 dark:text-red-400 mt-1";

const CHIP_CLASS =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs";

const CHIP_REMOVE_CLASS =
  "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer";

const FIELDSET_CLASS =
  "rounded-md border border-zinc-300 dark:border-zinc-700 p-3";

const LEGEND_CLASS =
  "px-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300";

function readString(value: Record<string, unknown>, path: string, fallback = ""): string {
  const v = value[path];
  return typeof v === "string" ? v : fallback;
}

function readBoolean(value: Record<string, unknown>, path: string): boolean {
  const v = value[path];
  return typeof v === "boolean" ? v : false;
}

function readTags(value: Record<string, unknown>, path: string): string[] {
  const v = value[path];
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    return v as string[];
  }
  return [];
}

function readNumberDisplay(value: Record<string, unknown>, path: string): string {
  const v = value[path];
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v;
  return "";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

interface FieldRowProps {
  field: FormField;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  onFileUpload?: (field: FormField, file: File) => Promise<string>;
}

function TextLikeInput({
  field,
  value,
  onChange,
  errors,
  disabled,
  type,
}: FieldRowProps & { type: "text" | "url" | "email" }): JSX.Element {
  const id = useId();
  const current = readString(value, field.path);
  const defaultDisplay =
    current === "" && typeof field.defaultValue === "string"
      ? field.defaultValue
      : current;
  const errMsg = errors?.[field.path];
  const hasError = typeof errMsg === "string" && errMsg.length > 0;

  return (
    <FieldWrapper id={id} field={field} errorMsg={errMsg}>
      <input
        id={id}
        type={type}
        value={defaultDisplay}
        onChange={(e) => onChange({ ...value, [field.path]: e.target.value })}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        pattern={field.pattern}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        className={INPUT_CLASS}
      />
    </FieldWrapper>
  );
}

function TextareaInput({
  field,
  value,
  onChange,
  errors,
  disabled,
}: FieldRowProps): JSX.Element {
  const id = useId();
  const current = readString(value, field.path);
  const defaultDisplay =
    current === "" && typeof field.defaultValue === "string"
      ? field.defaultValue
      : current;
  const errMsg = errors?.[field.path];
  const hasError = typeof errMsg === "string" && errMsg.length > 0;

  return (
    <FieldWrapper id={id} field={field} errorMsg={errMsg}>
      <textarea
        id={id}
        rows={4}
        value={defaultDisplay}
        onChange={(e) => onChange({ ...value, [field.path]: e.target.value })}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        className={TEXTAREA_CLASS}
      />
    </FieldWrapper>
  );
}

function CodeInput({
  field,
  value,
  onChange,
  errors,
  disabled,
}: FieldRowProps): JSX.Element {
  const id = useId();
  const current = readString(value, field.path);
  const defaultDisplay =
    current === "" && typeof field.defaultValue === "string"
      ? field.defaultValue
      : current;
  const errMsg = errors?.[field.path];
  const hasError = typeof errMsg === "string" && errMsg.length > 0;

  return (
    <FieldWrapper id={id} field={field} errorMsg={errMsg}>
      <textarea
        id={id}
        rows={6}
        value={defaultDisplay}
        onChange={(e) => onChange({ ...value, [field.path]: e.target.value })}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        className={CODE_CLASS}
      />
    </FieldWrapper>
  );
}

function SelectInput({
  field,
  value,
  onChange,
  errors,
  disabled,
}: FieldRowProps): JSX.Element {
  const id = useId();
  const current = readString(value, field.path);
  const defaultDisplay =
    current === "" && typeof field.defaultValue === "string"
      ? field.defaultValue
      : current;
  const errMsg = errors?.[field.path];
  const hasError = typeof errMsg === "string" && errMsg.length > 0;
  const options = field.options ?? [];
  const showBlank = !field.required;

  return (
    <FieldWrapper id={id} field={field} errorMsg={errMsg}>
      <select
        id={id}
        value={defaultDisplay}
        onChange={(e) => onChange({ ...value, [field.path]: e.target.value })}
        required={field.required}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        className={INPUT_CLASS}
      >
        {showBlank && <option value=""></option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

function NumberInput({
  field,
  value,
  onChange,
  errors,
  disabled,
}: FieldRowProps): JSX.Element {
  const id = useId();
  const display = readNumberDisplay(value, field.path);
  const defaultDisplay =
    display === "" && typeof field.defaultValue === "number"
      ? String(field.defaultValue)
      : display;
  const errMsg = errors?.[field.path];
  const hasError = typeof errMsg === "string" && errMsg.length > 0;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      const next = { ...value };
      delete next[field.path];
      onChange(next);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      onChange({ ...value, [field.path]: parsed });
    } else {
      onChange({ ...value, [field.path]: raw });
    }
  };

  return (
    <FieldWrapper id={id} field={field} errorMsg={errMsg}>
      <input
        id={id}
        type="number"
        value={defaultDisplay}
        onChange={handleChange}
        required={field.required}
        min={field.min}
        max={field.max}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        className={INPUT_CLASS}
      />
    </FieldWrapper>
  );
}

function CheckboxInput({
  field,
  value,
  onChange,
  errors,
  disabled,
}: FieldRowProps): JSX.Element {
  const id = useId();
  const explicit = typeof value[field.path] === "boolean";
  const current = explicit
    ? readBoolean(value, field.path)
    : typeof field.defaultValue === "boolean"
      ? field.defaultValue
      : false;
  const errMsg = errors?.[field.path];
  const hasError = typeof errMsg === "string" && errMsg.length > 0;

  return (
    <div className="mb-4">
      <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
        <input
          id={id}
          type="checkbox"
          checked={current}
          onChange={(e) => onChange({ ...value, [field.path]: e.target.checked })}
          required={field.required}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        <span>
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </label>
      {field.description && <p className={DESCRIPTION_CLASS}>{field.description}</p>}
      {hasError && <p className={ERROR_CLASS}>{errMsg}</p>}
    </div>
  );
}

function FileInput({
  field,
  value,
  onChange,
  errors,
  disabled,
  onFileUpload,
}: FieldRowProps): JSX.Element {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const current = value[field.path];
  const errMsg = errors?.[field.path] ?? localError ?? undefined;
  const hasError = typeof errMsg === "string" && errMsg.length > 0;

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      if (onFileUpload) {
        setUploading(true);
        try {
          const url = await onFileUpload(field, file);
          onChange({ ...value, [field.path]: url });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setLocalError(msg || "Upload failed");
        } finally {
          setUploading(false);
        }
        return;
      }
      try {
        const dataUrl = await fileToBase64(file);
        onChange({ ...value, [field.path]: dataUrl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLocalError(msg || "Failed to read file");
      }
    },
    [field, onChange, onFileUpload, value],
  );

  const preview = typeof current === "string" ? current : null;

  return (
    <FieldWrapper id={id} field={field} errorMsg={hasError ? errMsg : undefined}>
      <input
        id={id}
        type="file"
        accept={field.accept}
        disabled={disabled || uploading}
        aria-invalid={hasError ? true : undefined}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        className="block w-full text-xs text-zinc-700 dark:text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-zinc-300 dark:file:border-zinc-700 file:bg-white dark:file:bg-zinc-900 file:text-xs file:text-zinc-900 dark:file:text-zinc-100"
      />
      {uploading && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
          Uploading...
        </p>
      )}
      {preview && !uploading && (
        <p
          className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate"
          data-testid="file-preview"
        >
          {preview.length > 80 ? `${preview.slice(0, 60)}...` : preview}
        </p>
      )}
    </FieldWrapper>
  );
}

function TagsInput({
  field,
  value,
  onChange,
  errors,
  disabled,
}: FieldRowProps): JSX.Element {
  const id = useId();
  const tags = readTags(value, field.path);
  const [draft, setDraft] = useState("");
  const errMsg = errors?.[field.path];
  const hasError = typeof errMsg === "string" && errMsg.length > 0;

  const commitDraft = (raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    if (tags.includes(trimmed)) {
      setDraft("");
      return true;
    }
    onChange({ ...value, [field.path]: [...tags, trimmed] });
    setDraft("");
    return true;
  };

  const removeAt = (idx: number) => {
    const next = tags.slice();
    next.splice(idx, 1);
    onChange({ ...value, [field.path]: next });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft(draft);
      return;
    }
    if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      removeAt(tags.length - 1);
    }
  };

  return (
    <FieldWrapper id={id} field={field} errorMsg={errMsg}>
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 ${disabled ? "opacity-50" : ""}`}
      >
        {tags.map((tag, idx) => (
          <span key={`${tag}-${idx}`} className={CHIP_CLASS}>
            <span>{tag}</span>
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => {
                if (!disabled) removeAt(idx);
              }}
              disabled={disabled}
              className={CHIP_REMOVE_CLASS}
            >
              x
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-zinc-900 dark:text-zinc-100 outline-none py-1"
        />
      </div>
    </FieldWrapper>
  );
}

function FieldsetGroup({
  field,
  value,
  onChange,
  errors,
  disabled,
  onFileUpload,
}: FieldRowProps): JSX.Element {
  const errMsg = errors?.[field.path];
  const children = field.children ?? [];
  return (
    <fieldset className={`mb-4 ${FIELDSET_CLASS}`} disabled={disabled}>
      <legend className={LEGEND_CLASS}>
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </legend>
      {field.description && <p className={DESCRIPTION_CLASS}>{field.description}</p>}
      <div>
        {children.map((child) => (
          <FieldRow
            key={child.path}
            field={child}
            value={value}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
            onFileUpload={onFileUpload}
          />
        ))}
      </div>
      {typeof errMsg === "string" && errMsg.length > 0 && (
        <p className={ERROR_CLASS}>{errMsg}</p>
      )}
    </fieldset>
  );
}

function FieldWrapper({
  id,
  field,
  errorMsg,
  children,
}: {
  id: string;
  field: FormField;
  errorMsg?: string;
  children: React.ReactNode;
}): JSX.Element {
  const hasError = typeof errorMsg === "string" && errorMsg.length > 0;
  return (
    <div className="mb-4">
      <label htmlFor={id} className={LABEL_CLASS}>
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.description && <p className={DESCRIPTION_CLASS}>{field.description}</p>}
      {children}
      {hasError && <p className={ERROR_CLASS}>{errorMsg}</p>}
    </div>
  );
}

function FieldRow(props: FieldRowProps): JSX.Element | null {
  const { field } = props;
  switch (field.control) {
    case "text":
      return <TextLikeInput {...props} type="text" />;
    case "url":
      return <TextLikeInput {...props} type="url" />;
    case "email":
      return <TextLikeInput {...props} type="email" />;
    case "textarea":
      return <TextareaInput {...props} />;
    case "code":
      return <CodeInput {...props} />;
    case "select":
      return <SelectInput {...props} />;
    case "number":
      return <NumberInput {...props} />;
    case "checkbox":
      return <CheckboxInput {...props} />;
    case "file":
      return <FileInput {...props} />;
    case "tags":
      return <TagsInput {...props} />;
    case "fieldset":
      return <FieldsetGroup {...props} />;
    default:
      return null;
  }
}

export default function SchemaForm(props: SchemaFormProps): JSX.Element {
  const { fields, value, onChange, errors, disabled, onFileUpload } = props;
  return (
    <div>
      {fields.map((field) => (
        <FieldRow
          key={field.path}
          field={field}
          value={value}
          onChange={onChange}
          errors={errors}
          disabled={disabled}
          onFileUpload={onFileUpload}
        />
      ))}
    </div>
  );
}
