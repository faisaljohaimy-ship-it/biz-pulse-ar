import { useState, type ReactNode } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { NexusPill } from "@/components/nexus-frame";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
};

export function InlineAddForm({
  fields,
  onSubmit,
  isPending,
  ar,
}: {
  fields: FieldDef[];
  onSubmit: (values: Record<string, string | number>) => void;
  isPending: boolean;
  ar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | number>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""])),
  );

  function reset() {
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""])));
  }

  function submit() {
    const missing = fields.find((f) => f.required && !String(values[f.key] ?? "").trim());
    if (missing) return;
    const out: Record<string, string | number> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (f.type === "number") out[f.key] = Number(v) || 0;
      else out[f.key] = String(v ?? "");
    }
    onSubmit(out);
    reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20"
      >
        <Plus className="h-3.5 w-3.5" /> {ar ? "إضافة" : "Add"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {f.label}
            </span>
            {f.type === "select" ? (
              <select
                value={String(values[f.key] ?? "")}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a1f] px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400/40 focus:outline-none"
              >
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                value={String(values[f.key] ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a1f] px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-full px-3 py-1.5 text-xs text-slate-400 hover:text-white"
        >
          {ar ? "إلغاء" : "Cancel"}
        </button>
        <button
          onClick={submit}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {ar ? "حفظ" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function DeleteButton({
  onDelete,
  isPending,
  ar,
}: {
  onDelete: () => void;
  isPending: boolean;
  ar: boolean;
}) {
  return (
    <button
      onClick={() => {
        if (window.confirm(ar ? "حذف هذا العنصر؟" : "Delete this item?")) onDelete();
      }}
      disabled={isPending}
      className="rounded-md border border-rose-400/30 bg-rose-400/10 p-1.5 text-rose-300 hover:bg-rose-400/20 disabled:opacity-50"
      aria-label={ar ? "حذف" : "Delete"}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}

export function EmptyState({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center">
      {icon && <div className="text-slate-500">{icon}</div>}
      <div className="text-sm text-slate-400">{title}</div>
      {action && <div>{action}</div>}
      <NexusPill tone="cyan">LIVE · empty</NexusPill>
    </div>
  );
}
