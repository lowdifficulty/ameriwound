export type DemoPhase =
  | "idle"
  | "listening"
  | "transcribing"
  | "analyzing"
  | "generating"
  | "complete";

export type TranscriptLine = {
  speaker: "Doctor" | "Patient" | "System";
  text: string;
};

export function parseTranscript(raw: string): TranscriptLine[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: TranscriptLine[] = [];
  let lastSpeaker: "Doctor" | "Patient" = "Doctor";

  for (const line of lines) {
    if (/^\[.+\]$/.test(line)) {
      out.push({ speaker: "System", text: line });
      continue;
    }
    if (line === "SOAP Notes") break;

    const lower = line.toLowerCase();
    const isPatient =
      lower.startsWith("morning") ||
      lower.startsWith("yeah") ||
      lower.startsWith("pretty good") ||
      lower.startsWith("okay.") ||
      lower.startsWith("okay,") ||
      lower === "okay" ||
      lower.startsWith("maybe a") ||
      lower.startsWith("a one") ||
      lower.startsWith("not really") ||
      lower.startsWith("no.") ||
      lower.startsWith("no,") ||
      lower.startsWith("no smoking") ||
      lower.startsWith("good.") ||
      lower.startsWith("that's fine") ||
      lower.startsWith("just pressure") ||
      lower.startsWith("wow.") ||
      lower.startsWith("makes sense") ||
      lower.startsWith("got it") ||
      lower.startsWith("yes.") ||
      lower.startsWith("yes,") ||
      lower === "yes" ||
      lower.startsWith("i will") ||
      lower.startsWith("thank you") ||
      lower.startsWith("sounds good") ||
      lower.startsWith("no. i think") ||
      lower.startsWith("is that good") ||
      lower.startsWith("right.") ||
      lower.startsWith("i did that once") ||
      lower.startsWith("mostly.") ||
      lower.startsWith("it went good") ||
      lower.startsWith("probably a three") ||
      lower.startsWith("not that i've") ||
      lower.startsWith("i'm still wearing") ||
      lower.startsWith("better.") ||
      lower.startsWith("i will.") ||
      lower.startsWith("a lot of eggs");

    if (isPatient) lastSpeaker = "Patient";
    else if (
      lower.includes("?") ||
      lower.startsWith("all right") ||
      lower.startsWith("good.") ||
      lower.startsWith("let me") ||
      lower.startsWith("i'm going") ||
      lower.startsWith("the wound") ||
      lower.startsWith("today,") ||
      lower.startsWith("overall,") ||
      lower.startsWith("you're") ||
      lower.startsWith("we'll") ||
      lower.startsWith("any questions") ||
      lower.startsWith("perfect.") ||
      lower.startsWith("before we") ||
      lower.startsWith("how have") ||
      lower.startsWith("still taking") ||
      lower.startsWith("the patient") ||
      lower.startsWith("after debridement") ||
      lower.startsWith("i'm changing") ||
      lower.startsWith("i'm opening") ||
      lower.startsWith("i'm placing") ||
      lower.startsWith("i'm recording") ||
      lower.startsWith("i do not") ||
      lower.startsWith("there's a small") ||
      lower.startsWith("this is coming") ||
      lower.startsWith("there's maybe") ||
      lower.startsWith("it does.") ||
      lower.startsWith("based on") ||
      lower.startsWith("so the plan") ||
      lower.startsWith("we've done") ||
      lower.startsWith("verbal consent") ||
      lower.startsWith("bleeding is") ||
      lower.startsWith("continue the") ||
      lower.startsWith("if the dressing") ||
      lower.startsWith("call us") ||
      lower.startsWith("do i leave") ||
      lower.startsWith("what if") ||
      lower.startsWith("you're welcome")
    ) {
      lastSpeaker = "Doctor";
    }

    out.push({ speaker: lastSpeaker, text: line });
  }

  return out;
}

export type SoapInlineImage = {
  id: string;
  after: string;
  src: string;
  alt: string;
  caption: string;
};

export const SOAP_INLINE_IMAGES: SoapInlineImage[] = [
  {
    id: "wound",
    after: "15% thin yellow fibrinous slough",
    src: "/assets/demo/soap-wound.png",
    alt: "Right plantar diabetic foot ulcer before debridement",
    caption: "Pre-debridement wound appearance — July 27, 2026",
  },
  {
    id: "product",
    after:
      "The sterile package was inspected before opening and was intact without visible damage, moisture, or contamination.",
    src: "/assets/demo/soap-product.png",
    alt: "AmchoPlast sterile product packaging",
    caption: "Sterile package integrity verified before opening",
  },
  {
    id: "dressed",
    after: "Distal perfusion remained intact following dressing application.",
    src: "/assets/demo/soap-dressed.png",
    alt: "Wound after dressing and offloading boot application",
    caption: "Post-application dressing and offloading boot",
  },
];

export type SoapBlock =
  | { type: "text"; text: string }
  | { type: "image"; image: SoapInlineImage };

export function buildSoapBlocks(soapText: string): SoapBlock[] {
  const normalized = soapText.replace(/^PATIENT NAME:.*\r?\n+/i, "");
  const blocks: SoapBlock[] = [];
  let remaining = normalized;

  for (const image of SOAP_INLINE_IMAGES) {
    const idx = remaining.indexOf(image.after);
    if (idx === -1) {
      if (remaining) blocks.push({ type: "text", text: remaining });
      return blocks;
    }

    const end = idx + image.after.length;
    blocks.push({ type: "text", text: remaining.slice(0, end) });
    blocks.push({ type: "image", image });
    remaining = remaining.slice(end);
  }

  if (remaining) blocks.push({ type: "text", text: remaining });
  return blocks;
}

export function splitSoapSections(soap: string): { title: string; body: string }[] {
  const chunks = soap.split(/\n(?=[A-Z][A-Z0-9 /\-–—&()]+:?\n)/);
  if (chunks.length <= 1) {
    return [{ title: "Clinical Documentation", body: soap.trim() }];
  }
  return chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const nl = chunk.indexOf("\n");
      if (nl === -1) return { title: chunk, body: "" };
      return {
        title: chunk.slice(0, nl).replace(/:$/, ""),
        body: chunk.slice(nl + 1).trim(),
      };
    });
}
