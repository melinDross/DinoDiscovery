import html2canvas from 'html2canvas';

async function shareOrDownload(
  blob: Blob,
  fileName: string,
  shareData?: { title: string; text: string }
): Promise<void> {
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], ...shareData });
      return;
    } catch {
      // El usuario canceló el share sheet o el navegador lo rechazó en tiempo
      // de ejecución pese a anunciar soporte; seguimos con la descarga clásica.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function captureCertificateAsPng(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2 });
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('No se pudo generar la imagen del certificado');
  }

  await shareOrDownload(blob, fileName);
}

export async function shareDinoImage(imageUrl: string, fileName: string, commonName: string): Promise<void> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  await shareOrDownload(blob, fileName, {
    title: commonName,
    text: `¡Mira el dinosaurio que he descubierto: ${commonName}!`,
  });
}
