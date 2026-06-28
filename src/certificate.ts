import html2canvas from 'html2canvas';

export async function captureCertificateAsPng(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2 });
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('No se pudo generar la imagen del certificado');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
