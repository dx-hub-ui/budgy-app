import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Arquivo inválido" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ message: "O avatar deve ter no máximo 5MB" }, { status: 400 });
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Formato de imagem não suportado" }, { status: 400 });
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    const safeExtension = extension ? extension.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const objectName = `avatars/${crypto.randomUUID()}${safeExtension ? `.${safeExtension}` : ""}`;

    const blob = await put(objectName, file, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: false
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Erro ao enviar avatar", error);
    return NextResponse.json({ message: "Não foi possível salvar o avatar" }, { status: 500 });
  }
}
