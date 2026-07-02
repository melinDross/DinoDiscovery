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
  // Dynamically imported: html2canvas is only needed at this final
  // "download the card" step, not on initial page load, so it shouldn't sit
  // in the main bundle for every visitor who never gets this far.
  const { default: html2canvas } = await import('html2canvas');

  // useCORS/allowTaint: defensive against the canvas silently "tainting"
  // (which makes toBlob() resolve null / throw with no visible error) if
  // any image this captures is ever served from a different origin than the
  // page — currently true (images load same-origin via /images/[key].ts),
  // but that's an easy invariant to break later without anything here
  // flagging it.
  //
  // backgroundColor: null — html2canvas defaults to an opaque white canvas
  // background. The card's rounded corners are CSS `overflow-hidden`
  // clipping on a rectangular element, not an actual alpha shape, so
  // html2canvas (which rasterizes the full bounding box) was filling the
  // area outside the rounded corners with solid white instead of leaving
  // it transparent — a visible white halo/corner artifact in the
  // downloaded PNG that isn't present on screen. `null` makes the canvas
  // background transparent, matching what's actually visible on screen
  // (nothing outside the card's own shape).
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
  });
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
