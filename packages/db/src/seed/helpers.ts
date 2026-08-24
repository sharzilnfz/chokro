// Idempotent record upserts shared by the seed scenarios.
import { db, partners, dropZones, listings } from '../index';
import { and, eq } from 'drizzle-orm';

export async function upsertPartnerRecord(spec: {
    userId: string;
    orgName: string;
    types: string[];
    eWasteLicensed: boolean;
    doeLicenseDoc?: string | null;
    status: string;
    vehicleLabel?: string;
    vehicleCapacityKg?: string;
    baseLat?: number;
    baseLng?: number;
    serviceRadiusKm?: number;
    capabilityFlags?: Record<string, boolean>;
  }) {
    const [existing] = await db.select().from(partners).where(eq(partners.user_id, spec.userId)).limit(1);
    if (existing) {
      const [updated] = await db
        .update(partners)
        .set({
          org_name: spec.orgName,
          types: spec.types,
          e_waste_licensed: spec.eWasteLicensed,
          doe_license_doc: spec.doeLicenseDoc || null,
          status: spec.status,
          vehicle_label: spec.vehicleLabel,
          vehicle_capacity_kg: spec.vehicleCapacityKg,
          base_lat: spec.baseLat,
          base_lng: spec.baseLng,
          service_radius_km: spec.serviceRadiusKm,
          capability_flags: spec.capabilityFlags || {},
        })
        .where(eq(partners.id, existing.id))
        .returning();
      return updated;
    }
    const [inserted] = await db
      .insert(partners)
      .values({
        user_id: spec.userId,
        org_name: spec.orgName,
        types: spec.types,
        e_waste_licensed: spec.eWasteLicensed,
        doe_license_doc: spec.doeLicenseDoc || null,
        status: spec.status,
        vehicle_label: spec.vehicleLabel,
        vehicle_capacity_kg: spec.vehicleCapacityKg,
        base_lat: spec.baseLat,
        base_lng: spec.baseLng,
        service_radius_km: spec.serviceRadiusKm,
        capability_flags: spec.capabilityFlags || {},
      })
      .returning();
    return inserted;
  }

export async function upsertDropZoneRecord(spec: {
    institutionId: string;
    name: string;
    qrToken: string;
    acceptedCategories: string[];
    geoLocation: { lat: number; lng: number; address: string };
    maxCapacityKg: string;
    currentFillKg: string;
    status: string;
    contractedPartnerId: string;
  }) {
    const [existing] = await db.select().from(dropZones).where(eq(dropZones.qr_token, spec.qrToken)).limit(1);
    if (existing) {
      const [updated] = await db
        .update(dropZones)
        .set({
          institution_id: spec.institutionId,
          name: spec.name,
          geo_location: spec.geoLocation,
          accepted_categories: spec.acceptedCategories,
          max_capacity_kg: spec.maxCapacityKg,
          current_fill_kg: spec.currentFillKg,
          status: spec.status,
          contracted_partner_id: spec.contractedPartnerId,
        })
        .where(eq(dropZones.id, existing.id))
        .returning();
      return updated;
    }
    const [inserted] = await db
      .insert(dropZones)
      .values({
        institution_id: spec.institutionId,
        name: spec.name,
        qr_token: spec.qrToken,
        accepted_categories: spec.acceptedCategories,
        geo_location: spec.geoLocation,
        max_capacity_kg: spec.maxCapacityKg,
        current_fill_kg: spec.currentFillKg,
        status: spec.status,
        contracted_partner_id: spec.contractedPartnerId,
      })
      .returning();
    return inserted;
  }

export async function upsertListingRecord(spec: {
    ownerId: string;
    category: string;
    unit: string;
    declaredWeight?: string;
    pieceCount?: number;
    declaredCondition: string;
    priceBdt: string;
    status: string;
    lat: number;
    lng: number;
    thana: string;
    zilla: string;
    photos: string[];
  }) {
    const [existing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.owner_id, spec.ownerId), eq(listings.category, spec.category), eq(listings.price_bdt, spec.priceBdt)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(listings)
        .set({
          unit: spec.unit,
          declared_weight: spec.declaredWeight,
          piece_count: spec.pieceCount,
          declared_condition: spec.declaredCondition,
          status: spec.status,
          lat: spec.lat,
          lng: spec.lng,
          thana: spec.thana,
          zilla: spec.zilla,
          photos: spec.photos,
        })
        .where(eq(listings.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(listings)
      .values({
        owner_id: spec.ownerId,
        category: spec.category,
        unit: spec.unit,
        declared_weight: spec.declaredWeight,
        piece_count: spec.pieceCount,
        declared_condition: spec.declaredCondition,
        price_bdt: spec.priceBdt,
        status: spec.status,
        lat: spec.lat,
        lng: spec.lng,
        thana: spec.thana,
        zilla: spec.zilla,
        photos: spec.photos,
      })
      .returning();
    return inserted;
  }
