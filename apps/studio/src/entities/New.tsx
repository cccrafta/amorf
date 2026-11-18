// New entity: id, title and kind. The id is derived from the title until edited, and never changes after.
import { useState } from "react";
import { KINDS, type NewEntity } from "../../schema/entity";
import { navigate } from "../router";
import { createEntity } from "./api";

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function NewEntityForm() {
  const [title, setTitle] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [kind, setKind] = useState<NewEntity["kind"]>("building");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slug = id ?? slugify(title);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createEntity({ id: slug, title: title.trim(), kind });
      navigate(`/entities/${slug}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="studio-form" onSubmit={submit}>
      <h2 className="studio-label">New entity</h2>
      <label className="studio-field">
        <span className="studio-label">Title</span>
        <input className="studio-input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </label>
      <label className="studio-field">
        <span className="studio-label">Id</span>
        <input className="studio-input" value={slug} onChange={(e) => setId(e.target.value)} required />
        <span className="studio-dim">Lowercase words joined by hyphens. It names the folder and never changes.</span>
      </label>
      <label className="studio-field">
        <span className="studio-label">Kind</span>
        <select className="studio-input" value={kind} onChange={(e) => setKind(e.target.value as NewEntity["kind"])}>
          {KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      {error && <p className="studio-error">{error}</p>}
      <div className="studio-actions">
        <button className="studio-button" disabled={busy || !slug || !title.trim()}>
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
