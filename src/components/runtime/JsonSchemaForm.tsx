// Schema-driven form renderer. Reads JSON Schema (draft-07 subset) and renders
// typed controls with inline validation. Falls back to raw JSON only when
// Developer Mode is enabled by the caller.
//
// Supported: object/array/string/number/integer/boolean, enum, format (email,
// uri, date, date-time, uuid), required, minimum/maximum, minLength/maxLength,
// pattern, default, description, title.

import { useCallback, useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: Array<string | number>;
  format?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  examples?: unknown[];
  additionalProperties?: boolean | JsonSchema;
};

type FieldError = { path: string; message: string };

function getDefault(schema: JsonSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  switch (schema.type) {
    case "object": {
      const out: Record<string, unknown> = {};
      for (const [k, sub] of Object.entries(schema.properties ?? {})) {
        if (sub.default !== undefined) out[k] = sub.default;
      }
      return out;
    }
    case "array":
      return [];
    case "boolean":
      return false;
    case "number":
    case "integer":
      return schema.minimum ?? 0;
    case "string":
      return "";
    default:
      return undefined;
  }
}

function validate(schema: JsonSchema, value: unknown, path = "$"): FieldError[] {
  const errors: FieldError[] = [];
  const isMissing = value === undefined || value === null || value === "";

  if (schema.type === "object" && typeof value === "object" && value && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (obj[key] === undefined || obj[key] === null || obj[key] === "") {
        errors.push({ path: `${path}.${key}`, message: `${key} is required` });
      }
    }
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      errors.push(...validate(sub, obj[k], `${path}.${k}`));
    }
    return errors;
  }

  if (isMissing) return errors;

  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((v, i) =>
      errors.push(...validate(schema.items as JsonSchema, v, `${path}[${i}]`)),
    );
    return errors;
  }

  if (schema.type === "string" && typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength)
      errors.push({ path, message: `Min length ${schema.minLength}` });
    if (schema.maxLength != null && value.length > schema.maxLength)
      errors.push({ path, message: `Max length ${schema.maxLength}` });
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      errors.push({ path, message: `Invalid format` });
    if (schema.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      errors.push({ path, message: `Invalid email` });
    if (schema.format === "uri" && !/^https?:\/\//.test(value))
      errors.push({ path, message: `Must be a URL` });
    if (schema.format === "uuid" && !/^[0-9a-f-]{36}$/i.test(value))
      errors.push({ path, message: `Invalid UUID` });
    if (schema.enum && !schema.enum.includes(value))
      errors.push({ path, message: `Must be one of ${schema.enum.join(", ")}` });
  }

  if ((schema.type === "number" || schema.type === "integer") && typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum)
      errors.push({ path, message: `Min ${schema.minimum}` });
    if (schema.maximum != null && value > schema.maximum)
      errors.push({ path, message: `Max ${schema.maximum}` });
    if (schema.type === "integer" && !Number.isInteger(value))
      errors.push({ path, message: `Must be an integer` });
  }

  return errors;
}

export function validateAgainstSchema(schema: JsonSchema, value: unknown): FieldError[] {
  return validate(schema, value);
}

type FieldProps = {
  name: string;
  schema: JsonSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  required?: boolean;
  errors: FieldError[];
  path: string;
};

function fieldErrorFor(errors: FieldError[], path: string): string | null {
  return errors.find((e) => e.path === path)?.message ?? null;
}

function Field({ name, schema, value, onChange, required, errors, path }: FieldProps) {
  const err = fieldErrorFor(errors, path);
  const title = schema.title ?? name;
  const fieldId = useId();

  if (schema.enum && (schema.type === "string" || !schema.type)) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId} className="text-xs">
          {title} {required && <span className="text-rose-400">*</span>}
        </Label>
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={fieldId} className="h-9 text-xs">
            <SelectValue placeholder={`Select ${title.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {schema.description && (
          <p className="text-[10px] text-muted-foreground">{schema.description}</p>
        )}
        {err && <p className="text-[10px] text-rose-400">{err}</p>}
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 p-2.5">
        <div className="min-w-0">
          <Label htmlFor={fieldId} className="text-xs">
            {title}
          </Label>
          {schema.description && (
            <p className="truncate text-[10px] text-muted-foreground">{schema.description}</p>
          )}
        </div>
        <Switch id={fieldId} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  if (schema.type === "number" || schema.type === "integer") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId} className="text-xs">
          {title} {required && <span className="text-rose-400">*</span>}
        </Label>
        <Input
          id={fieldId}
          type="number"
          className="h-9 text-xs"
          value={value === undefined || value === null ? "" : String(value)}
          step={schema.type === "integer" ? 1 : "any"}
          min={schema.minimum}
          max={schema.maximum}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            onChange(v);
          }}
        />
        {schema.description && (
          <p className="text-[10px] text-muted-foreground">{schema.description}</p>
        )}
        {err && <p className="text-[10px] text-rose-400">{err}</p>}
      </div>
    );
  }

  if (schema.type === "array") {
    const arr = Array.isArray(value) ? value : [];
    const itemSchema = schema.items ?? { type: "string" };
    return (
      <div className="space-y-2 rounded-md border border-border/40 p-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            {title} {required && <span className="text-rose-400">*</span>}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => onChange([...arr, getDefault(itemSchema) ?? ""])}
          >
            <Plus className="h-3 w-3" /> <span className="ms-1 text-[10px]">Add</span>
          </Button>
        </div>
        {schema.description && (
          <p className="text-[10px] text-muted-foreground">{schema.description}</p>
        )}
        {arr.length === 0 ? (
          <p className="text-[10px] italic text-muted-foreground">No items. Click Add.</p>
        ) : (
          <div className="space-y-2">
            {arr.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <Field
                    name={`${name}[${i}]`}
                    schema={itemSchema}
                    value={item}
                    onChange={(v) => {
                      const next = [...arr];
                      next[i] = v;
                      onChange(next);
                    }}
                    errors={errors}
                    path={`${path}[${i}]`}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 mt-1"
                  onClick={() => onChange(arr.filter((_, idx) => idx !== i))}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3 w-3 text-rose-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {err && <p className="text-[10px] text-rose-400">{err}</p>}
      </div>
    );
  }

  if (schema.type === "object") {
    return (
      <div className="space-y-2 rounded-md border border-border/40 p-2.5">
        <Label className="text-xs">{title}</Label>
        {schema.description && (
          <p className="text-[10px] text-muted-foreground">{schema.description}</p>
        )}
        <ObjectFields
          schema={schema}
          value={(value as Record<string, unknown>) ?? {}}
          onChange={onChange}
          errors={errors}
          path={path}
        />
      </div>
    );
  }

  // Default: string
  const isLong = (schema.maxLength ?? 0) > 200 || schema.format === "textarea";
  const Cmp = isLong ? Textarea : Input;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} className="text-xs">
        {title} {required && <span className="text-rose-400">*</span>}
      </Label>
      <Cmp
        id={fieldId}
        className={isLong ? "min-h-[80px] text-xs" : "h-9 text-xs"}
        value={value === undefined || value === null ? "" : String(value)}
        placeholder={schema.examples?.[0] ? String(schema.examples[0]) : undefined}
        type={
          schema.format === "email"
            ? "email"
            : schema.format === "uri"
              ? "url"
              : schema.format === "date"
                ? "date"
                : "text"
        }
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          onChange(e.target.value === "" ? undefined : e.target.value)
        }
      />
      {schema.description && (
        <p className="text-[10px] text-muted-foreground">{schema.description}</p>
      )}
      {err && <p className="text-[10px] text-rose-400">{err}</p>}
    </div>
  );
}

function ObjectFields({
  schema,
  value,
  onChange,
  errors,
  path,
}: {
  schema: JsonSchema;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  errors: FieldError[];
  path: string;
}) {
  const props = Object.entries(schema.properties ?? {});
  if (props.length === 0) {
    return <p className="text-[10px] italic text-muted-foreground">No parameters required.</p>;
  }
  const setKey = (key: string, v: unknown) => {
    const next = { ...value };
    if (v === undefined) delete next[key];
    else next[key] = v;
    onChange(next);
  };
  return (
    <div className="space-y-2.5">
      {props.map(([key, sub]) => (
        <Field
          key={key}
          name={key}
          schema={sub}
          value={value[key]}
          onChange={(v) => setKey(key, v)}
          required={schema.required?.includes(key)}
          errors={errors}
          path={`${path}.${key}`}
        />
      ))}
    </div>
  );
}

export function JsonSchemaForm({
  schema,
  value,
  onChange,
  errors,
}: {
  schema: JsonSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  errors?: FieldError[];
}) {
  const allErrors = errors ?? [];
  if (!schema || schema.type !== "object") {
    return (
      <Field
        name="value"
        schema={schema}
        value={value}
        onChange={onChange}
        errors={allErrors}
        path="$"
      />
    );
  }
  return (
    <ObjectFields
      schema={schema}
      value={(value as Record<string, unknown>) ?? {}}
      onChange={onChange}
      errors={allErrors}
      path="$"
    />
  );
}

export function useSchemaForm(schema: JsonSchema | null | undefined) {
  const initial = useMemo(() => (schema ? getDefault(schema) : {}), [schema]);
  const [value, setValue] = useState<unknown>(initial);
  const errors = useMemo(() => (schema ? validate(schema, value) : []), [schema, value]);
  const reset = useCallback(() => setValue(initial), [initial]);
  return { value, setValue, errors, reset, isValid: errors.length === 0 };
}
