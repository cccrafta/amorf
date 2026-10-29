export type FieldObject = {
  id: string;
  t: string;
  k: string;
  y: string;
  place: string;
  src: string;
  p: string[];
  media: { kind: string; cap: string; img?: string; src?: string; poster?: string }[];
  notes: { txt: string; by: string }[];
  tags: string[];
};

export type FieldAssoc = [string, string, string];

export type FieldNoteSeed = {
  id: string;
  obj: string;
  by: string;
  walk: string | null;
  txt: string;
};

// Placeholder content only — schema mirrors the original artifact's OBJECTS
// shape so plate()/yearOf() kind and date branches all stay exercised.
export const OBJECTS: FieldObject[] = [
  {
    id: "o01", t: "Sample entry, photographic", k: "photograph", y: "1958", place: "unrecorded", src: "placeholder",
    p: ["Placeholder paragraph one for a photographic entry.", "Placeholder paragraph two, second pass of the same entry."],
    media: [{ kind: "detail", cap: "Placeholder detail caption." }, { kind: "material", cap: "Placeholder material caption." }],
    notes: [{ txt: "Placeholder annotation for entry one.", by: "annotation · aa" }],
    tags: ["tag-a", "tag-b", "tag-c", "tag-d", "tag-e"],
  },
  {
    id: "o02", t: "Sample entry, built", k: "building", y: "1921–1940", place: "placeholder city", src: "placeholder architect",
    p: ["Placeholder paragraph describing a building entry.", "Second placeholder paragraph, more detail."],
    media: [
      { kind: "drawing", cap: "Placeholder drawing caption." },
      { kind: "detail", cap: "Placeholder detail caption." },
      { kind: "photograph", cap: "Placeholder photograph caption." },
    ],
    notes: [
      { txt: "Placeholder annotation, first hand.", by: "annotation · bb" },
      { txt: "Placeholder annotation, second hand.", by: "annotation · anonymous" },
    ],
    tags: ["tag-a", "tag-f", "tag-g", "tag-h", "tag-i"],
  },
  {
    id: "o03", t: "Sample entry, fragment", k: "fragment", y: "", place: "", src: "editorial placeholder",
    p: ["Placeholder paragraph for an undated fragment entry."],
    media: [{ kind: "drawing", cap: "Placeholder drawing caption." }],
    notes: [{ txt: "Placeholder annotation for the fragment.", by: "annotation · cc" }],
    tags: ["tag-b", "tag-j", "tag-k", "tag-l"],
  },
  {
    id: "o04", t: "Sample entry, built (rule)", k: "building", y: "1963–1966", place: "placeholder town", src: "placeholder architect two",
    p: ["Placeholder paragraph, a built entry with a rule.", "Placeholder second paragraph."],
    media: [
      { kind: "detail", cap: "Placeholder detail caption." },
      { kind: "photograph", cap: "Placeholder photograph caption." },
      { kind: "drawing", cap: "Placeholder drawing caption." },
    ],
    notes: [
      { txt: "Placeholder annotation.", by: "annotation · aa" },
      { txt: "Placeholder second annotation.", by: "annotation · dd" },
    ],
    tags: ["tag-c", "tag-m", "tag-n", "tag-o"],
  },
  {
    id: "o05", t: "Sample entry, material technique", k: "material", y: "", place: "placeholder region", src: "technique, unattributed",
    p: ["Placeholder paragraph on a material technique, undated."],
    media: [
      { kind: "drawing", cap: "Placeholder drawing caption." },
      { kind: "material", cap: "Placeholder material caption." },
    ],
    notes: [{ txt: "Placeholder annotation for the technique.", by: "annotation · anonymous" }],
    tags: ["tag-d", "tag-p", "tag-q"],
  },
  {
    id: "o06", t: "Sample entry, built (annual)", k: "building", y: "1907 (present structure)", place: "placeholder town two", src: "placeholder community",
    p: ["Placeholder paragraph, a periodically-remade building.", "Second placeholder paragraph."],
    media: [
      { kind: "photograph", cap: "Placeholder photograph caption." },
      { kind: "material", cap: "Placeholder material caption." },
      { kind: "drawing", cap: "Placeholder drawing caption." },
    ],
    notes: [
      { txt: "Placeholder annotation.", by: "annotation · bb" },
      { txt: "Placeholder editorial note.", by: "annotation · editorial" },
    ],
    tags: ["tag-a", "tag-p", "tag-r", "tag-s"],
  },
  {
    id: "o07", t: "Sample entry, document", k: "document", y: "12th century", place: "placeholder site", src: "placeholder archive",
    p: ["Placeholder paragraph for a documentary entry with a century-form date."],
    media: [{ kind: "detail", cap: "Placeholder detail caption." }],
    notes: [{ txt: "Placeholder annotation for the document.", by: "annotation · cc" }],
    tags: ["tag-e", "tag-t", "tag-u"],
  },
  {
    id: "o08", t: "Sample entry, material samples", k: "material", y: "", place: "laboratory, placeholder", src: "test series",
    p: ["Placeholder paragraph describing a set of test samples."],
    media: [
      { kind: "material", cap: "Placeholder material caption." },
      { kind: "detail", cap: "Placeholder detail caption." },
    ],
    notes: [{ txt: "Placeholder annotation, editorial.", by: "annotation · editorial" }],
    tags: ["tag-b", "tag-v", "tag-w"],
  },
  {
    id: "o09", t: "Sample entry, drawing", k: "drawing", y: "1988", place: "placeholder studio", src: "placeholder draughtsman",
    p: ["Placeholder paragraph for a drawing entry."],
    media: [{ kind: "drawing", cap: "Placeholder drawing caption." }],
    notes: [{ txt: "Placeholder annotation for the drawing.", by: "annotation · dd" }],
    tags: ["tag-c", "tag-x", "tag-y"],
  },
  {
    id: "o10", t: "Sample entry, sound", k: "sound", y: "2004", place: "placeholder field site", src: "placeholder recordist",
    p: ["Placeholder paragraph for a sound entry."],
    media: [{ kind: "detail", cap: "Placeholder detail caption." }],
    notes: [{ txt: "Placeholder annotation for the recording.", by: "annotation · aa" }],
    tags: ["tag-d", "tag-z", "tag-aa"],
  },
  {
    id: "o11", t: "Yakhchāl (یخچال), ice pit", k: "building", y: "Safavid era", place: "Iranian plateau", src: "unattributed",
    p: [
      "A conical mud-brick shell tapering to a capped apex, sunk over a pit deeper than it is tall. Thick earth walls hold high thermal mass, delaying the desert day's heat by hours — long enough that ice cut in winter, or formed overnight from shaded meltwater, keeps through summer in the shadow below.",
      "Read against the same decades: 1609, Galileo turns a telescope on the night sky. 1613, Amsterdam widens its canals. 1631–32, the Shah Mosque in Isfahan is finished after decades of construction. 1666, Newton's work on gravity begins taking shape.",
    ],
    media: [
      { kind: "photograph", cap: "Exterior, conical mud-brick shell tapering to a capped apex, stepped courses visible.", img: "/entries/yakhchal/yakhchal-exterior.png" },
      { kind: "detail", cap: "Interior dome and oculus, spiral brick coursing drawing light down into the pit.", img: "/entries/yakhchal/yakhchal-dome-oculus.jpg" },
      { kind: "material", cap: "Basin and descending stair, mud-brick walls curving to the floor of the pit.", img: "/entries/yakhchal/yakhchal-basin-stair.jpg" },
      { kind: "photograph", cap: "Entrance and interior, paired views of the vent and the coursed ceiling above the stair.", img: "/entries/yakhchal/yakhchal-entrance-interior.png" },
    ],
    notes: [{ txt: "Mass functions as timing: thick earth walls delay the day's heat by hours, long enough for night air to do the work.", by: "annotation · editorial" }],
    tags: ["thermal-architecture", "civic-infrastructure", "mud-brick", "ritual", "desert-preservation"],
  },
  {
    id: "o12", t: "Interview with Eduardo Souto de Moura", k: "film", y: "2023", place: "", src: "INDESEM",
    p: ["A filmed conversation with the architect, recorded in 2023."],
    media: [{ kind: "video", cap: "Interview, 2023.", src: "/media/souto-de-moura-2023.mp4", poster: "/media/souto-de-moura-2023.jpg" }],
    notes: [],
    tags: ["interview", "souto de moura", "architecture", "film"],
  },
];

export const ASSOC: FieldAssoc[] = [
  ["o01", "o02", "placeholder reason, entries one and two"],
  ["o01", "o06", "placeholder reason, entries one and six"],
  ["o02", "o04", "placeholder reason, entries two and four"],
  ["o02", "o03", "placeholder reason, entries two and three"],
  ["o03", "o04", "placeholder reason, entries three and four"],
  ["o04", "o10", "placeholder reason, entries four and ten"],
  ["o05", "o06", "placeholder reason, entries five and six"],
  ["o05", "o08", "placeholder reason, entries five and eight"],
  ["o06", "o09", "placeholder reason, entries six and nine"],
  ["o06", "o07", "placeholder reason, entries six and seven"],
  ["o08", "o10", "placeholder reason, entries eight and ten"],
  ["o09", "o01", "placeholder reason, entries nine and one"],
  ["o02", "o11", "both hold their record in mass rather than in image"],
  ["o04", "o12", "a built work discussed by its architect"],
];

export const NOTE_SEED: FieldNoteSeed[] = [
  { id: "n01", obj: "o02", by: "aa", walk: "A short placeholder route", txt: "Placeholder trace text, first." },
  { id: "n02", obj: "o02", by: "anonymous", walk: null, txt: "Placeholder trace text, second." },
  { id: "n03", obj: "o04", by: "bb", walk: "A short placeholder route", txt: "Placeholder trace text, third." },
  { id: "n04", obj: "o04", by: "cc", walk: null, txt: "Placeholder trace text, fourth." },
  { id: "n05", obj: "o10", by: "dd", walk: null, txt: "Placeholder trace text, fifth." },
  { id: "n06", obj: "o07", by: "anonymous", walk: "Another placeholder route", txt: "Placeholder trace text, sixth." },
  { id: "n07", obj: "o09", by: "aa", walk: null, txt: "Placeholder trace text, seventh." },
  { id: "n08", obj: "o06", by: "bb", walk: "Abandoned placeholder route", txt: "Placeholder trace text, eighth." },
];

// Initial seeded walks, referenced by NOTE_SEED's `walk` field above.
export const SEEDED_WALKS = [
  { name: "A short placeholder route", steps: ["o01", "o02", "o04", "o03"] },
  { name: "Another placeholder route", steps: ["o07", "o05", "o08"] },
  { name: "Abandoned placeholder route", steps: ["o06", "o09"] },
];
