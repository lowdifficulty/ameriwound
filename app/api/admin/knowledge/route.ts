import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  addKnowledgeDump,
  deleteKnowledgeDump,
  getKnowledgeDumps,
  markKnowledgeTrained,
  updateKnowledgeDump,
} from "@/lib/knowledge";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dumps = await getKnowledgeDumps();
  return NextResponse.json({ dumps });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === "learn") {
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }
    const dump = await markKnowledgeTrained(id);
    if (!dump) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ dump });
  }

  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!title || !content) {
    return NextResponse.json(
      { error: "Title and content are required." },
      { status: 400 },
    );
  }

  const dump = await addKnowledgeDump(title, content);
  return NextResponse.json({ dump });
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!id || !title || !content) {
    return NextResponse.json(
      { error: "ID, title, and content are required." },
      { status: 400 },
    );
  }

  const dump = await updateKnowledgeDump(id, title, content);
  if (!dump) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ dump });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }

  const deleted = await deleteKnowledgeDump(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
