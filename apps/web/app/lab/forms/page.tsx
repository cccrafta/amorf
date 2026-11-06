import type { Metadata } from "next";
import FormsLab from "@/components/forms-lab/FormsLab";
import { formFaces } from "@/components/forms-lab/faces";
import { loadEntities } from "@/lib/data/entities";

// A spike page (EXP-0014): kept out of search; the field links nowhere to it.
export const metadata: Metadata = { title: "[a}morf — forms lab", robots: { index: false, follow: false } };

// Runs at build time under output: "export": only each entity's face pictures are passed to the client.
export default async function FormsLabPage() {
  const loaded = await loadEntities();
  const forms = (loaded?.objects ?? []).flatMap(o => formFaces(o) ?? []);
  return <FormsLab forms={forms} />;
}
