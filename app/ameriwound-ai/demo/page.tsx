import { readFile } from "node:fs/promises";
import path from "node:path";
import { DemoExperience } from "./DemoExperience";
import "../demo.css";

export const metadata = {
  title: "Live Demo — AmeriWound AI",
  description: "Interactive demo of AI wound care transcription and SOAP note generation",
};

async function loadDemoContent() {
  const root = path.join(process.cwd(), "data");
  const [transcript, soap] = await Promise.all([
    readFile(path.join(root, "demo-transcript.txt"), "utf8"),
    readFile(path.join(root, "demo-soap-notes.txt"), "utf8"),
  ]);
  return { transcript, soap };
}

export default async function DemoPage() {
  const { transcript, soap } = await loadDemoContent();
  return <DemoExperience transcriptRaw={transcript} soapRaw={soap} />;
}
