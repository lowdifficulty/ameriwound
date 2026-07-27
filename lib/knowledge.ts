import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface KnowledgeHistoryEntry {
  title: string;
  content: string;
  savedAt: string;
}

export interface KnowledgeDump {
  id: string;
  title: string;
  content: string;
  contentFile?: string;
  createdAt: string;
  updatedAt: string;
  history: KnowledgeHistoryEntry[];
  trainedAt: string | null;
}

interface KnowledgeStore {
  dumps: KnowledgeDump[];
}

const DATA_PATH = path.join(process.cwd(), "data", "knowledge.json");

function normalizeDump(raw: KnowledgeDump): KnowledgeDump {
  return {
    ...raw,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    history: raw.history ?? [],
    trainedAt: raw.trainedAt ?? null,
  };
}

async function readStore(): Promise<KnowledgeStore> {
  const raw = await readFile(DATA_PATH, "utf8");
  const data: KnowledgeStore = JSON.parse(raw);
  data.dumps = data.dumps.map(normalizeDump);
  return data;
}

async function writeStore(data: KnowledgeStore): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function resolveDumpContent(dump: KnowledgeDump): Promise<string> {
  if (dump.content?.trim()) return dump.content;
  if (dump.contentFile) {
    const filePath = path.join(process.cwd(), "data", dump.contentFile);
    return readFile(filePath, "utf8");
  }
  return "";
}

export async function getKnowledgeDumps(): Promise<KnowledgeDump[]> {
  const data = await readStore();
  const resolved = await Promise.all(
    data.dumps.map(async (dump) => ({
      ...dump,
      content: await resolveDumpContent(dump),
    })),
  );
  return resolved;
}

export async function addKnowledgeDump(
  title: string,
  content: string,
): Promise<KnowledgeDump> {
  const data = await readStore();
  const now = new Date().toISOString();
  const dump: KnowledgeDump = {
    id: `dump-${Date.now()}`,
    title,
    content,
    createdAt: now,
    updatedAt: now,
    history: [],
    trainedAt: null,
  };
  data.dumps.push(dump);
  await writeStore(data);
  return dump;
}

export async function updateKnowledgeDump(
  id: string,
  title: string,
  content: string,
): Promise<KnowledgeDump | null> {
  const data = await readStore();
  const idx = data.dumps.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  const existing = data.dumps[idx];
  const previousContent = await resolveDumpContent(existing);

  existing.history = [
    {
      title: existing.title,
      content: previousContent,
      savedAt: new Date().toISOString(),
    },
    ...existing.history,
  ].slice(0, 20);

  existing.title = title;
  existing.content = content;
  existing.contentFile = undefined;
  existing.updatedAt = new Date().toISOString();
  data.dumps[idx] = existing;
  await writeStore(data);

  return { ...existing, content };
}

export async function markKnowledgeTrained(id: string): Promise<KnowledgeDump | null> {
  const data = await readStore();
  const dump = data.dumps.find((d) => d.id === id);
  if (!dump) return null;
  dump.trainedAt = new Date().toISOString();
  dump.updatedAt = dump.trainedAt;
  await writeStore(data);
  return { ...dump, content: await resolveDumpContent(dump) };
}

export async function deleteKnowledgeDump(id: string): Promise<boolean> {
  const data = await readStore();
  const before = data.dumps.length;
  data.dumps = data.dumps.filter((d) => d.id !== id);
  if (data.dumps.length === before) return false;
  await writeStore(data);
  return true;
}

export async function getKnowledgeContext(): Promise<string> {
  const dumps = await getKnowledgeDumps();
  return dumps.map((d) => `## ${d.title}\n${d.content}`).join("\n\n");
}

export async function ensureKnowledgeSeed(): Promise<void> {
  const specPath = path.join(process.cwd(), "data", "knowledge-dumps", "woundcare-soap-spec.md");
  try {
    await readFile(specPath, "utf8");
  } catch {
    await mkdir(path.dirname(specPath), { recursive: true });
    await writeFile(
      specPath,
      "# WoundCare SOAP Notes AI Generator\n\nSeed file missing — add content via admin.\n",
      "utf8",
    );
  }
}
