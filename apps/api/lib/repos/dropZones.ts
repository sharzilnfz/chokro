import { db, dropZones, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { databaseOrTestStore } from '../database';
import { createQrToken } from '../qr';

export interface CreateDropZoneData {
  institutionId: string;
  name: string;
  acceptedCategories: string[];
  geoLocation?: { lat: number; lng: number } | null;
  id?: string;
  qrToken?: string;
  status?: string;
}

export const dropZoneRepo = {
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

    return databaseOrTestStore(
      async () => (await db.insert(dropZones).values(values).returning())[0],
      () => {
        const dropZone = {
          ...values,
          created_at: new Date(),
        };
        memoryStore.dropZones.push(dropZone);
        return dropZone;
      },
    );
  },

  async findAll() {
    return databaseOrTestStore(
      () => db.select().from(dropZones),
      () => [...memoryStore.dropZones],
    );
  },

  async findById(id: string) {
    return databaseOrTestStore(
      async () => (await db.select().from(dropZones).where(eq(dropZones.id, id)))[0] || null,
      () => memoryStore.dropZones.find((candidate) => candidate.id === id) || null,
    );
  },

  async findByQrToken(qrToken: string) {
    return databaseOrTestStore(
      async () => (await db.select().from(dropZones).where(eq(dropZones.qr_token, qrToken)))[0] || null,
      () => memoryStore.dropZones.find((candidate) => candidate.qr_token === qrToken) || null,
    );
  },

  async resolveByLocation(lat: number, lng: number) {
    return databaseOrTestStore(
      async () => {
        const zones = await db.select().from(dropZones);
        return (
          zones.find((z) => {
            const geo = z.geo_location as { lat: number; lng: number } | null;
            return geo && Math.abs(geo.lat - lat) < 0.0001 && Math.abs(geo.lng - lng) < 0.0001;
          }) || null
        );
      },
      () => {
        return (
          memoryStore.dropZones.find((candidate) => {
            const geo = candidate.geo_location as { lat: number; lng: number } | null;
            return geo && Math.abs(geo.lat - lat) < 0.0001 && Math.abs(geo.lng - lng) < 0.0001;
          }) || null
        );
      },
    );
  },
};
