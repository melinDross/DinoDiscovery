import { describe, it, expect } from 'vitest';
import { readJsonBody } from './requestBody';

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

describe('readJsonBody', () => {
  it('parses a valid JSON body within the size limit', async () => {
    const result = await readJsonBody(makeRequest('{"a":1}'), 1000);
    expect(result).toEqual({ ok: true, body: { a: 1 } });
  });

  it('rejects up front via Content-Length without reading the body', async () => {
    const request = makeRequest('{"a":1}', { 'content-length': '999999' });
    const result = await readJsonBody(request, 1000);
    expect(result).toEqual({ ok: false, status: 413, message: expect.any(String) });
  });

  it('rejects a body that exceeds the limit even without a Content-Length header', async () => {
    const bigBody = JSON.stringify({ a: 'x'.repeat(2000) });
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: bigBody,
    });
    request.headers.delete('content-length');
    const result = await readJsonBody(request, 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
    }
  });

  it('rejects invalid JSON with a 400', async () => {
    const result = await readJsonBody(makeRequest('not json'), 1000);
    expect(result).toEqual({ ok: false, status: 400, message: expect.any(String) });
  });
});
