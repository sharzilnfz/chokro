import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, evidenceRecords, eq } from '@chokro/db';
import { withDb } from '../repos/seam';

export interface StoredEvidence {
  id: string;
  uploaderId?: string | null;
  storagePath: string;
  url: string;
  mimeType: string;
  byteSize: number;
  createdAt: Date;
}

export interface StoreEvidenceInput {
  buffer: Buffer;
  mimeType: string;
  uploaderId?: string | null;
  filename?: string;
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/evidence');

function ensureUploadDir(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

export const evidenceStorage = {
  /**
   * Persists an evidence image/document to local storage and creates an immutable evidence_records row.
   */
  async store(input: StoreEvidenceInput): Promise<StoredEvidence> {
    const dir = ensureUploadDir();
    const hash = crypto.createHash('sha256').update(input.buffer).digest('hex').slice(0, 16);
    const ext = input.mimeType.includes('png')
      ? '.png'
      : input.mimeType.includes('webp')
      ? '.webp'
      : input.mimeType.includes('pdf')
      ? '.pdf'
      : '.jpg';

    const filename = `${Date.now()}-${hash}${ext}`;
    const filePath = path.join(dir, filename);
    const publicUrl = `/uploads/evidence/${filename}`;

    fs.writeFileSync(filePath, input.buffer);

    return withDb(async () => {
      const [record] = await db
        .insert(evidenceRecords)
        .values({
          uploader_id: input.uploaderId || null,
          storage_path: filePath,
          url: publicUrl,
          mime_type: input.mimeType,
          byte_size: input.buffer.length,
        })
        .returning();

      return {
        id: record.id,
        uploaderId: record.uploader_id,
        storagePath: record.storage_path,
        url: record.url,
        mimeType: record.mime_type,
        byteSize: record.byte_size,
        createdAt: record.created_at,
      };
    });
  },

  /**
   * Resolves a stored evidence record by ID.
   */
  async findById(id: string): Promise<StoredEvidence | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(evidenceRecords)
        .where(eq(evidenceRecords.id, id))
        .limit(1);

      if (!rows[0]) return null;
      const record = rows[0];
      return {
        id: record.id,
        uploaderId: record.uploader_id,
        storagePath: record.storage_path,
        url: record.url,
        mimeType: record.mime_type,
        byteSize: record.byte_size,
        createdAt: record.created_at,
      };
    });
  },
};
