// Entity editor: title, kind and the text metadata. Saving publishes; a conflict asks for a reload.
import { useEffect, useState } from "react";
import { KINDS, LIST_FIELDS, TEXT_FIELDS, type Entity } from "../../schema/entity";
import { ApiError, getEntity, saveEntity, type Loaded } from "./api";

type ListField = (typeof LIST_FIELDS)[number];

// Lists are edited as comma-separated text, the description as paragraphs split by a blank line.
type Draft = Record<string, string>;

function toDraft(e: Entity): Draft {
  const d: Draft = { title: e.title, kind: e.kind, description: (e.description ?? []).join("\n\n") };
  for (const f of TEXT_FIELDS) d[f] = e[f] ?? "";
  for (const f of LIST_FIELDS) d[f] = (e[f] ?? []).join(", ");
  return d;
}

// Empty fields are removed, never stored as "": the site leaves unknown facts out.
function fromDraft(base: Entity, d: Draft): Entity {
  const e: Record<string, unknown> = { ...base, title: d.title.trim(), kind: d.kind };
  const set = (key: string, value: unknown) => {
    if (value === undefined) delete e[key];
    else e[key] = value;
  };
  for (const f of TEXT_FIELDS) set(f, d[f].trim() || undefined);
  for (const f of LIST_FIELDS) {
    const items = d[f].split(",").map((s) => s.trim()).filter(Boolean);
    set(f, items.length ? items : undefined);
  }
  const paragraphs = d.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  set("description", paragraphs.length ? paragraphs : undefined);
  return e as Entity;
}

const LABELS: Record<string, string> = { creatorRole: "creator role" };

export function EntityEditor({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [version, setVersion] = useState(0);

  useEffect(() => {
    getEntity(id)
      .then((l) => {
        setLoaded(l);
        setDraft(toDraft(l.data));
        setError(null);
        setConflict(false);
      })
      .catch((e: Error) => setError(e.message));
  }, [id, version]);

  const reload = () => setVersion((v) => v + 1);

  if (!draft || !loaded) return error ? <p className="studio-error">{error}</p> : <p className="studio-note">Loading…</p>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(loaded.data));
  const edit = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft({ ...draft, [key]: e.target.value });
    setStatus("idle");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const saved = await saveEntity(fromDraft(loaded.data, draft), loaded.etag);
      setLoaded(saved);
      setDraft(toDraft(saved.data));
      setStatus("saved");
    } catch (err) {
      setError((err as Error).message);
      setConflict(err instanceof ApiError && err.status === 409);
      setStatus("idle");
    }
  };

  const textField = (key: string, hint?: string) => (
    <label className="studio-field" key={key}>
      <span className="studio-label">{LABELS[key] ?? key}</span>
      <input className="studio-input" value={draft[key]} onChange={edit(key)} />
      {hint && <span className="studio-dim">{hint}</span>}
    </label>
  );

  return (
    <form className="studio-form" onSubmit={save}>
      <h2 className="studio-title-2">{loaded.data.title}</h2>
      <p className="studio-dim">
        {id} · {loaded.data.media?.length ?? 0} media (media editing comes in step 3)
      </p>

      <label className="studio-field">
        <span className="studio-label">Title</span>
        <input className="studio-input" value={draft.title} onChange={edit("title")} required />
      </label>
      <label className="studio-field">
        <span className="studio-label">Kind</span>
        <select className="studio-input" value={draft.kind} onChange={edit("kind")}>
          {KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      {TEXT_FIELDS.map((f) => textField(f))}
      {LIST_FIELDS.map((f: ListField) => textField(f, "Comma-separated."))}
      <label className="studio-field">
        <span className="studio-label">Description</span>
        <textarea className="studio-input" rows={12} value={draft.description} onChange={edit("description")} />
        <span className="studio-dim">One paragraph per block; separate paragraphs with a blank line.</span>
      </label>

      {error && (
        <p className="studio-error">
          {error}{" "}
          {conflict && (
            <button type="button" className="studio-button" onClick={reload}>
              Reload
            </button>
          )}
        </p>
      )}
      <div className="studio-actions">
        <button className="studio-button" disabled={!dirty || status === "saving"}>
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        <span className="studio-dim">{status === "saved" ? "Saved." : dirty ? "Unsaved changes." : ""}</span>
      </div>
    </form>
  );
}
