import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

import html2canvas from 'html2canvas';
import { captureCertificateAsPng, shareDinoImage } from './certificate';

describe('captureCertificateAsPng', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(html2canvas).toHaveBeenCalledWith(element, { scale: 2, useCORS: true, allowTaint: false });
    expect(clickSpy).toHaveBeenCalled();
  });
});

describe('shareDinoImage', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the dino image and opens the native share sheet when available', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: () => Promise.resolve(fakeBlob) }));
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share: shareSpy });

    await shareDinoImage('/images/abc.png', 'dino-volcanrex.png', 'Volcanrex');

    expect(fetch).toHaveBeenCalledWith('/images/abc.png');
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Volcanrex', text: expect.stringContaining('Volcanrex') })
    );
  });

  it('falls back to downloading the image when the share sheet is unavailable', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: () => Promise.resolve(fakeBlob) }));
    vi.stubGlobal('navigator', { canShare: undefined });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    await shareDinoImage('/images/abc.png', 'dino-volcanrex.png', 'Volcanrex');

    expect(clickSpy).toHaveBeenCalled();
  });
});
