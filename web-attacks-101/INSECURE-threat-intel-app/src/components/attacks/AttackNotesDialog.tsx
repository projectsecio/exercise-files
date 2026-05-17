import { useCallback, useEffect, useState } from "react";

type Props = {
  slug: string;
  title: string;
  open: boolean;
  onClose: () => void;
};

export default function AttackNotesDialog({ slug, title, open, onClose }: Props) {
  const [body, setBody] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attacks/notes?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("Failed to load notes");
      const data = (await res.json()) as { body: string; updatedAt: string | null };
      setBody(data.body ?? "");
      setUpdatedAt(data.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/attacks/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, body }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      const data = (await res.json()) as { updatedAt: string };
      setUpdatedAt(data.updatedAt);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.1] bg-zinc-900 p-6 shadow-2xl">
        <h2 id="notes-dialog-title" className="text-lg font-semibold text-white">
          Lab notes — {title}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Observations, IOCs, and remediation ideas for this scenario.
          {updatedAt && (
            <span className="ml-2">Last saved {new Date(updatedAt).toLocaleString()}</span>
          )}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-400">Loading…</p>
        ) : (
          <textarea
            className="mt-4 h-48 w-full resize-y rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none ring-sky-500/30 focus:ring-2"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Document findings from the attack lab…"
          />
        )}

        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
        </div>
      </div>
    </div>
  );
}
