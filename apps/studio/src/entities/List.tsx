// Entity list: every id in entities/index.json with its title, kind and media count.
import { useEffect, useState } from "react";
import type { EntitySummary } from "../../schema/entity";
import { onLink } from "../router";
import { listEntities } from "./api";

export function EntityList() {
  const [list, setList] = useState<EntitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listEntities()
      .then(setList)
      .catch((e: Error) => setError(e.message));
  }, []);

  const q = query.trim().toLowerCase();
  const shown = (list ?? []).filter((e) => !q || e.id.includes(q) || e.title?.toLowerCase().includes(q));

  return (
    <section>
      <div className="studio-bar">
        <h2 className="studio-label">Entities {list && `(${list.length})`}</h2>
        <input
          className="studio-input studio-search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <a className="studio-button" href="/entities/new" onClick={onLink}>
          New entity
        </a>
      </div>
      {error && <p className="studio-error">{error}</p>}
      {!list && !error && <p className="studio-note">Loading…</p>}
      {list?.length === 0 && <p className="studio-note">No entities yet.</p>}
      <table className="studio-table">
        <tbody>
          {shown.map((e) => (
            <tr key={e.id}>
              <td>
                <a href={`/entities/${e.id}`} onClick={onLink}>
                  {e.title ?? e.id}
                </a>
                {e.missing && <span className="studio-error"> entity.json missing</span>}
              </td>
              <td className="studio-dim">{e.kind}</td>
              <td className="studio-dim">{e.year}</td>
              <td className="studio-dim studio-num">{e.media} media</td>
              <td className="studio-dim">{e.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
