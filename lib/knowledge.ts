import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface KnowledgeDump {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface KnowledgeStore {
  dumps: KnowledgeDump[];
}

const DATA_PATH = path.join(process.cwd(), "data", "knowledge.json");

export async function getKnowledgeDumps(): Promise<KnowledgeDump[]> {
  const raw = await readFile(DATA_PATH, "utf8");
  const data: KnowledgeStore = JSON.parse(raw);
  return data.dumps;
}

export async function addKnowledgeDump(
  title: string,
  content: string
): Promise<KnowledgeDump> {
  const raw = await readFile(DATA_PATH, "utf8");
  const data: KnowledgeStore = JSON.parse(raw);
  const dump: KnowledgeDump = {
    id: `dump-${Date.now()}`,
    title,
    content,
    createdAt: new Date().toISOString(),
  };
  data.dumps.push(dump);
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
  return dump;
}

export async function deleteKnowledgeDump(id: string): Promise<boolean> {
  const raw = await readFile(DATA_PATH, "utf8");
  const data: KnowledgeStore = JSON.parse(raw);
  const before = data.dumps.length;
  data.dumps = data.dumps.filter((d) => d.id !== id);
  if (data.dumps.length === before) return false;
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
  return true;
}

export async function getKnowledgeContext(): Promise<string> {
  const dumps = await getKnowledgeDumps();
  return dumps.map((d) => `## ${d.title}\n${d.content}`).join("\n\n");
}
