import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('modern-screenshot', () => ({
  domToBlob: vi.fn(),
}));

import { domToBlob } from 'modern-screenshot';
import { captureCertificateAsPng, shareDinoImage } from './certificate';

describe('captureCertificateAsPng', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the element to a blob and triggers a download', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    vi.mocked(domToBlob).mockResolvedValue(fakeBlob);

    const element = document.createElement('div');
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    await captureCertificateAsPng(element, 'certificado-volcanrex.png');

    expect(domToBlob).toHaveBeenCalledWith(element, {
      scale: 2,
      backgroundColor: null,
      type: 'image/png',
    });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('throws a clear error when rendering produces no blob', async () => {
    vi.mocked(domToBlob).mockResolvedValue(null as unknown as Blob);
    const element = document.createElement('div');

    await expect(captureCertificateAsPng(element, 'certificado-volcanrex.png')).rejects.toThrow(
      'No se pudo generar la imagen del certificado'
    );
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
