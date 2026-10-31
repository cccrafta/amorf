import Field from "@/components/field/Field";
import { loadEntities } from "@/lib/data/entities";

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
