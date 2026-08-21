// Unit tests for MediaDomain.parseUploadRequest — the transport parser behind
// POST /api/v1/media/upload. Exercises multipart, JSON data-URI/base64, and raw
// binary bodies directly against the domain interface, with no HTTP round-trip.
import { MediaDomain } from '../lib/domain/MediaDomain';
import { BadRequestError } from '../lib/database';

// A minimal valid PNG header buffer; content is irrelevant to the parser.
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function multipartRequest(fields: Record<string, string>, file?: { name: string; type: string; body: Buffer }) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) {
    formData.append('file', new Blob([new Uint8Array(file.body)], { type: file.type }), file.name);
  }
  return new Request('http://localhost/api/v1/media/upload', { method: 'POST', body: formData });
}

describe('MediaDomain.parseUploadRequest', () => {
  // Multipart form-data: file bytes, name, MIME type, and metadata fields.
  it('parses a multipart upload with purpose and listing metadata', async () => {
    const req = multipartRequest(
      { purpose: 'LISTING', listingId: 'listing-1', category: 'PLASTICS' },
      { name: 'sample-item.jpg', type: 'image/jpeg', body: pngBytes },
    );

    const parsed = await MediaDomain.parseUploadRequest(req);

    expect(parsed.buffer.equals(pngBytes)).toBe(true);
    expect(parsed.originalFilename).toBe('sample-item.jpg');
    expect(parsed.mimeType).toBe('image/jpeg');
    expect(parsed.purpose).toBe('LISTING');
    expect(parsed.listingId).toBe('listing-1');
    expect(parsed.category).toBe('PLASTICS');
  });

  // snake_case listing_id is accepted alongside camelCase in multipart fields.
  it('accepts snake_case listing_id in multipart uploads', async () => {
    const req = multipartRequest(
      { listing_id: 'listing-2' },
      { name: 'photo.png', type: 'image/png', body: pngBytes },
    );

    const parsed = await MediaDomain.parseUploadRequest(req);

    expect(parsed.listingId).toBe('listing-2');
    expect(parsed.mimeType).toBe('image/png');
  });

  // Multipart without a file part is rejected.
  it('rejects multipart form data with no file', async () => {
    const req = multipartRequest({ purpose: 'LISTING' });

    await expect(MediaDomain.parseUploadRequest(req)).rejects.toThrow(BadRequestError);
    await expect(MediaDomain.parseUploadRequest(multipartRequest({}))).rejects.toThrow('No file provided');
  });

  // JSON data-URI: MIME type comes from the URI header, bytes from base64.
  it('parses a JSON data-URI payload including its mime type', async () => {
    const dataUri = `data:image/png;base64,${pngBytes.toString('base64')}`;
    const req = new Request('http://localhost/api/v1/media/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dataUri, filename: 'photo.png', purpose: 'DISPUTE_PROOF' }),
    });

    const parsed = await MediaDomain.parseUploadRequest(req);

    expect(parsed.buffer.equals(pngBytes)).toBe(true);
    expect(parsed.mimeType).toBe('image/png');
    expect(parsed.originalFilename).toBe('photo.png');
    expect(parsed.purpose).toBe('DISPUTE_PROOF');
  });

  // Plain base64 without a data-URI prefix defaults to JPEG.
  it('parses a JSON base64 payload defaulting to image/jpeg', async () => {
    const req = new Request('http://localhost/api/v1/media/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ base64: pngBytes.toString('base64') }),
    });

    const parsed = await MediaDomain.parseUploadRequest(req);

    expect(parsed.buffer.equals(pngBytes)).toBe(true);
    expect(parsed.mimeType).toBe('image/jpeg');
    expect(parsed.originalFilename).toBe('image.jpg');
  });

  // JSON without any image payload key is rejected.
  it('rejects JSON bodies with no image payload', async () => {
    const req = new Request('http://localhost/api/v1/media/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filename: 'photo.png' }),
    });

    await expect(MediaDomain.parseUploadRequest(req)).rejects.toThrow('No image payload provided');
  });

  // Any other content type is treated as a raw binary stream.
  it('parses a raw binary body using the content-type as mime', async () => {
    const req = new Request('http://localhost/api/v1/media/upload', {
      method: 'POST',
      headers: { 'content-type': 'image/webp' },
      body: new Uint8Array(pngBytes),
    });

    const parsed = await MediaDomain.parseUploadRequest(req);

    expect(parsed.buffer.equals(pngBytes)).toBe(true);
    expect(parsed.mimeType).toBe('image/webp');
    expect(parsed.originalFilename).toBe('image.jpg');
  });

  // Empty raw binary bodies are rejected.
  it('rejects an empty raw binary body', async () => {
    const req = new Request('http://localhost/api/v1/media/upload', {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      body: new Uint8Array(0),
    });

    await expect(MediaDomain.parseUploadRequest(req)).rejects.toThrow('Empty media payload');
  });
});
