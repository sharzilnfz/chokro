import { dropZones, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { createQrToken } from '../qr';
import { withDb, createRepoSeam } from './seam';

export interface CreateDropZoneData {
  institutionId: string;
  name: string;
  acceptedCategories: string[];
  geoLocation?: { lat: number; lng: number } | null;
  id?: string;
  qrToken?: string;
  status?: string;
}

export interface DropZoneRepo {
  create(data: CreateDropZoneData): Promise<typeof dropZones.$inferSelect>;
  findAll(): Promise<Array<typeof dropZones.$inferSelect>>;
  findById(id: string): Promise<typeof dropZones.$inferSelect | undefined | null>;
  findByQrToken(qrToken: string): Promise<typeof dropZones.$inferSelect | undefined | null>;
  resolveByLocation(lat: number, lng: number): Promise<typeof dropZones.$inferSelect | undefined | null>;
}

export const drizzleDropZoneRepo: DropZoneRepo = {
  async create(data: CreateDropZoneData) {
    const tempId = data.id || crypto.randomUUID();
    const qrToken = data.qrToken || createQrToken();
    const values = {
      id: tempId,
      institution_id: data.institutionId,
      name: data.name,
      qr_token: qrToken,
      accepted_categories: data.acceptedCategories,
      geo_location: data.geoLocation || null,
      status: data.status || 'ACTIVE',
    };

    return withDb(async (db) => {
      const rows = await db.insert(dropZones).values(values).returning();
      return rows[0];
    });
  },

  async findAll() {
    return withDb(async (db) => db.select().from(dropZones));
  },

  async findById(id: string) {
    return withDb(async (db) => (await db.select().from(dropZones).where(eq(dropZones.id, id)))[0] ?? null);
  },

  async findByQrToken(qrToken: string) {
    return withDb(async (db) => (await db.select().from(dropZones).where(eq(dropZones.qr_token, qrToken)))[0] ?? null);
  },

  async resolveByLocation(lat: number, lng: number) {
    return withDb(async (db) => {
      const zones = await db.select().from(dropZones);
      return (
        zones.find((z: typeof dropZones.$inferSelect) => {
          const geo = z.geo_location as { lat: number; lng: number } | null;
          return geo && Math.abs(geo.lat - lat) < 0.0001 && Math.abs(geo.lng - lng) < 0.0001;
        }) ?? null
      );
    });
  },
};

export const memoryDropZoneRepo: DropZoneRepo = {
  async create(data: CreateDropZoneData) {
    const tempId = data.id || crypto.randomUUID();
    const qrToken = data.qrToken || createQrToken();
    const values = {
      id: tempId,
      institution_id: data.institutionId,
      name: data.name,
      qr_token: qrToken,
      accepted_categories: data.acceptedCategories,
      geo_location: data.geoLocation || null,
      status: data.status || 'ACTIVE',
    };

    const dropZone = {
      ...values,
      created_at: new Date(),
    };
    memoryStore.dropZones.push(dropZone);
    return dropZone as any;
  },

  async findAll() {
    return [...memoryStore.dropZones];
  },

  async findById(id: string) {
    return memoryStore.dropZones.find((candidate) => candidate.id === id) ?? null;
  },

  async findByQrToken(qrToken: string) {
    return memoryStore.dropZones.find((candidate) => candidate.qr_token === qrToken) ?? null;
  },

  async resolveByLocation(lat: number, lng: number) {
    return (
      memoryStore.dropZones.find((candidate) => {
        const geo = candidate.geo_location as { lat: number; lng: number } | null;
        return geo && Math.abs(geo.lat - lat) < 0.0001 && Math.abs(geo.lng - lng) < 0.0001;
      }) ?? null
    );
  },
};

export const dropZoneRepo: DropZoneRepo = createRepoSeam(drizzleDropZoneRepo, memoryDropZoneRepo);
