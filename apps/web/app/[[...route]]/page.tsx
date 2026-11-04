import Field from "@/components/field/Field";
import { slugOf } from "@/components/field/route-path";
import { OBJECTS, SEEDED_WALKS } from "@/lib/field-data";
import { loadEntities } from "@/lib/data/entities";

// Every view has its own prerendered address (/, /entities/<id>, /plan, /walks/<name>) so a shared link is a real page;
// once mounted, Field moves between them with the History API (components/field/route.ts) and never remounts.
export const dynamicParams = false;

export async function generateStaticParams() {
  const loaded = await loadEntities();
  const ids = [...OBJECTS, ...(loaded?.objects ?? [])].map(o => o.id);
  return [
    { route: [] as string[] },
    { route: ["plan"] },
    ...ids.map(id => ({ route: ["entities", id] })),
    ...SEEDED_WALKS.map(w => ({ route: ["walks", slugOf(w.name)] })),
  ];
}

// Runs at build time under output: "export": entities are fetched from R2 once and baked into the page.
export default async function Home() {
  const loaded = await loadEntities();
  return (
    <Field
      wearStrength={1}
      planEdges={true}
      frictionEvery={8}
      showOthers={true}
      fieldNotes={true}
      inkColor="#E4DFD2"
      entities={loaded?.objects}
      assoc={loaded?.assoc}
    />
  );
}
