import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

import html2canvas from 'html2canvas';
import { captureCertificateAsPng } from './certificate';

describe('captureCertificateAsPng', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() });
  });

  it('renders the element to canvas and triggers a download', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    const fakeCanvas = {
      toBlob: (cb: (blob: Blob | null) => void) => cb(fakeBlob),
    } as unknown as HTMLCanvasElement;
    vi.mocked(html2canvas).mockResolvedValue(fakeCanvas);

    const element = document.createElement('div');
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    await captureCertificateAsPng(element, 'certificado-volcanrex.png');

    expect(html2canvas).toHaveBeenCalledWith(element, { scale: 2 });
    expect(clickSpy).toHaveBeenCalled();
  });
});
