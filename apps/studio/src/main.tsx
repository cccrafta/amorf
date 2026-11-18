// Studio entry: header, routes (list, new, editor) and the signed-in email.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { EntityEditor } from "./entities/Editor";
import { EntityList } from "./entities/List";
import { NewEntityForm } from "./entities/New";
import { onLink, usePath } from "./router";
import "./tokens.css";
import "./main.css";

function Page({ path }: { path: string }) {
  if (path === "/") return <EntityList />;
  if (path === "/entities/new") return <NewEntityForm />;
  const edit = path.match(/^\/entities\/([a-z0-9-]+)\/?$/);
  if (edit) return <EntityEditor key={edit[1]} id={edit[1]} />;
  return <p className="studio-note">Nothing here.</p>;
}

function Studio() {
  const path = usePath();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? (r.json() as Promise<{ email: string }>) : null))
      .then((me) => setEmail(me?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  return (
    <main className="studio">
      <header className="studio-header">
        <a className="studio-title" href="/" onClick={onLink}>
          amorf studio
        </a>
        <span className="studio-dim">{email ?? " "}</span>
      </header>
      <Page path={path} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Studio />
  </StrictMode>,
);
