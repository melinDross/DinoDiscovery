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
  // Dynamically imported: only needed at this final "download the card"
  // step, not on initial page load, so it shouldn't sit in the main bundle
  // for every visitor who never gets this far.
  //
  // modern-screenshot, not html2canvas: html2canvas re-implements CSS
  // rendering itself (manually redrawing gradients/transforms/filters onto
  // a canvas), which is exactly why it kept producing bugs here that only
  // showed up in the captured output, never live — the rotated habitat-tag
  // label rendering blank, and a white-corner artifact around the card's
  // rounded corners (see git history / CLAUDE.md for both). modern-screenshot
  // instead serializes the DOM into an SVG <foreignObject> and lets the
  // *browser's real rendering engine* draw it, then rasterizes that — so
  // CSS features render exactly as they do live, by construction, instead
  // of via a second, imperfect reimplementation.
  const { domToBlob } = await import('modern-screenshot');

  // backgroundColor: null keeps the canvas transparent outside the card's
  // own rounded-corner shape, matching what's visible on screen (see the
  // html2canvas-era white-corner bug this avoided by construction above).
  const blob = await domToBlob(element, {
    scale: 2,
    backgroundColor: null,
    type: 'image/png',
  });
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
