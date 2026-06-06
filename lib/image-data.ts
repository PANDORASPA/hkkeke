export function imageDataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("圖片 data URL 格式不正確。");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

export function bufferToImageDataUrl(buffer: Buffer, mimeType = "image/png") {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
