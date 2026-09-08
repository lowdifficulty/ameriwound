import { NextRequest, NextResponse } from "next/server";
import { toFile } from "openai/uploads";
import { isAuthenticated } from "@/lib/auth";
import { getOpenAIClient, hasOpenAI } from "@/lib/openai";

export const maxDuration = 120;

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

    if (!hasOpenAI()) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Add it to your environment variables.",
        },
        { status: 503 }
      );
    }

    const client = getOpenAIClient()!;
    const file = await toFile(
      await audio.arrayBuffer(),
      audio.name || "recording.webm",
      { type: audio.type || "audio/webm" }
    );

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });

    return NextResponse.json({ transcript: transcription.text });
  } catch (error) {
    console.error("Transcription failed:", error);
    const message =
      error instanceof Error ? error.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
