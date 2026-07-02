// Cloudflare Pages Functions have no default body-size limit of their own
// (only the platform-wide request cap, far larger than anything this app's
// endpoints legitimately need), so a request with a huge JSON body would
// otherwise be read and JSON.parse'd in full before any of our own
// validation gets a chance to reject it. This checks Content-Length up
// front (cheap, no read) and falls back to measuring the actual body if
// that header is missing or a client lies about it.
export type ReadJsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };

export async function readJsonBody(request: Request, maxBytes: number): Promise<ReadJsonBodyResult> {
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > maxBytes) {
    return { ok: false, status: 413, message: 'Cuerpo de la petición demasiado grande' };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, message: 'Cuerpo de la petición inválido' };
  }

  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, status: 413, message: 'Cuerpo de la petición demasiado grande' };
  }

  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, message: 'Cuerpo de la petición inválido' };
  }
}
