import html2canvas from 'html2canvas';

export async function captureCertificateAsPng(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2 });
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('No se pudo generar la imagen del certificado');
  }

  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
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
