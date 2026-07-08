import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Lead = {
  id: string;
  kind: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  team_size: string | null;
  notes: string | null;
  source: string | null;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsAdmin,
});

function LeadsAdmin() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const q = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as Lead[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  const filtered = filter === "all" ? rows : rows.filter((r) => r.kind === filter);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex gap-2">
          {["all", "demo", "contact", "book"].map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? "bg-primary text-primary-foreground" : "border border-white/10 text-muted-foreground"}`}
            >
              {k}
            </button>
          ))}
          <button onClick={load} className="rounded-full border border-white/10 px-3 py-1 text-xs">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center text-sm text-muted-foreground">
          No leads yet. (Requires admin role to view.)
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Kind</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Company</th>
                <th className="p-3">Notes</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {r.kind}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">
                    <a href={`mailto:${r.email}`} className="text-primary hover:underline">
                      {r.email}
                    </a>
                  </td>
                  <td className="p-3">{r.company ?? "-"}</td>
                  <td
                    className="p-3 max-w-xs truncate text-xs text-muted-foreground"
                    title={r.notes ?? ""}
                  >
                    {r.notes ?? "-"}
                  </td>
                  <td className="p-3">
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                      className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs"
                    >
                      <option value="new">new</option>
                      <option value="contacted">contacted</option>
                      <option value="qualified">qualified</option>
                      <option value="won">won</option>
                      <option value="lost">lost</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
