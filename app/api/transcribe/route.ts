import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const maxDuration = 120;

async function getDemoTranscript(): Promise<string> {
  const filePath = path.join(process.cwd(), "data", "demo-transcript.txt");
  const raw = await readFile(filePath, "utf8");
  return raw.trim();
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    const transcript = await getDemoTranscript();
    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription failed:", error);
    const message =
      error instanceof Error ? error.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
