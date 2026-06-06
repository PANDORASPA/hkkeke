import { NextRequest, NextResponse } from "next/server";
import { uploadGeneratedImage } from "@/lib/google-drive";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const fileName = String(form.get("fileName") || "generated.png");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadGeneratedImage(buffer, fileName);
    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上傳成品到 Google Drive 失敗。" },
      { status: 500 }
    );
  }
}
