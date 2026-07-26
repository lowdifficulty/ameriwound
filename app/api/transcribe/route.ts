import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getOpenAIClient, hasOpenAI } from "@/lib/openai";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const transcription = await client.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    language: "en",
  });

  return NextResponse.json({ transcript: transcription.text });
}
