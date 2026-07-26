import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getKnowledgeContext } from "@/lib/knowledge";
import { getOpenAIClient, hasOpenAI } from "@/lib/openai";

const SYSTEM_PROMPT = `You are an expert wound care clinical documentation specialist for AmeriWound.
Transform the provided clinical encounter transcript into a perfect, professional wound care note.

Requirements:
- Use standard wound care documentation structure
- Include: Chief Complaint, HPI, Wound Assessment (location, measurements, staging, wound bed, periwound, exudate, odor, pain), Treatment Provided, Dressing Applied, Patient Education, Plan of Care, Follow-up
- Use objective, clinical language appropriate for medical records
- Infer reasonable clinical details only when clearly implied by the transcript
- Apply any provided knowledge base guidelines
- Format with clear section headers`;

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const transcript = String(body.transcript ?? "").trim();
  const imageDescriptions = Array.isArray(body.imageDescriptions)
    ? body.imageDescriptions.map(String)
    : [];

  if (!transcript) {
    return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
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

  const knowledge = await getKnowledgeContext();
  const client = getOpenAIClient()!;

  let userContent = `TRANSCRIPT:\n${transcript}`;
  if (imageDescriptions.length > 0) {
    userContent += `\n\nWOUND IMAGE OBSERVATIONS:\n${imageDescriptions.join("\n")}`;
  }
  if (knowledge) {
    userContent += `\n\nKNOWLEDGE BASE:\n${knowledge}`;
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
  });

  const notes = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ notes });
}
