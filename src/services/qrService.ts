import QRCode from "qrcode";

const OPTIONS = {
  errorCorrectionLevel: "M" as const,
  margin: 4, // quiet zone
  color: { dark: "#000000", light: "#FFFFFF" },
};

export async function qrDataUrl(value: string, width = 512): Promise<string> {
  return QRCode.toDataURL(value, { ...OPTIONS, width });
}

export async function qrSvg(value: string): Promise<string> {
  return QRCode.toString(value, { ...OPTIONS, type: "svg", width: 512 });
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export async function downloadQrPng(value: string, filename: string) {
  download(await qrDataUrl(value, 1024), `${filename}.png`);
}

export async function downloadQrSvg(value: string, filename: string) {
  const svg = await qrSvg(value);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  download(url, `${filename}.svg`);
  URL.revokeObjectURL(url);
}
