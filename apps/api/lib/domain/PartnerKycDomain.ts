// PartnerKycDomain: Automated Partner KYC Document Intelligence & DoE Regulatory Gate (SPEC 15).
import { partnerRepo } from '../repos/partners';
import { userRepo } from '../repos/users';
import { kycExtractionsRepo, KycExtraction } from '../repos/kycExtractions';
import { partnerComplianceAuditsRepo } from '../repos/partnerComplianceAudits';

export interface ExtractKycInput {
  partnerId: string;
  documentUrl: string;
  documentType: 'TRADE_LICENSE' | 'DOE_EWASTE_PERMIT' | 'TIN_CERTIFICATE' | string;
  submittedLicenseNumber?: string | null;
  submittedOrgName?: string | null;
  rawDocumentText?: string | null;
  imageBase64?: string | null;
}

export interface ExtractedEntities {
  licenseNumber: string | null;
  orgName: string | null;
  expiryDate: Date | null;
  expiryDateString: string | null;
  issueDate: Date | null;
  tin: string | null;
  isDoeAuthorized: boolean;
  rawText: string;
}

export interface DiscrepancyResult {
  confidenceScore: number;
  matchStatus: 'EXACT_MATCH' | 'PARTIAL_MATCH' | 'MISMATCH' | 'EXPIRED';
  mismatchedFields: string[];
  isExpired: boolean;
  fieldScores: {
    licenseNumber: number;
    orgName: number;
  };
}

export interface AdjudicateKycInput {
  extractionId: string;
  adminUserId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD';
  notes?: string | null;
  grantEwasteLicense?: boolean;
}

/**
 * Normalized string comparator using Levenshtein distance
 */
function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function stringSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.95;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Parses flexible date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD Month YYYY)
 */
export function parseFlexibleDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const slashDashMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashDashMatch) {
    const day = parseInt(slashDashMatch[1], 10);
    const month = parseInt(slashDashMatch[2], 10) - 1;
    const year = parseInt(slashDashMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // Native parse fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  return null;
}

export const PartnerKycDomain = {
  /**
   * Entity extraction using regular expressions and heuristics
   */
  extractEntitiesFromText(rawText: string): ExtractedEntities {
    let licenseNumber: string | null = null;
    let orgName: string | null = null;
    let expiryDate: Date | null = null;
    let expiryDateString: string | null = null;
    let issueDate: Date | null = null;
    let tin: string | null = null;

    // 1. License Number extraction
    const licenseNumberPatterns = [
      /\b(TRAD\/(?:DNCC|DSCC|[A-Z0-9]+)\/[A-Z0-9/-]+)\b/i,
      /\b(DOE\/(?:E-WASTE|[A-Z0-9]+)\/[A-Z0-9/-]+)\b/i,
      /\b(DOE-[A-Z0-9/-]+)\b/i,
      /\b(TRAD-[A-Z0-9/-]+)\b/i,
      /\b(TL-[A-Z0-9/-]+)\b/i,
      /(?:Trade\s+License|DoE\s+Permit|Permit|License|Licence|Registration)(?:\s+Number|\s+No\.?|\s+#)?[:\s]+([A-Z0-9/-]{5,40})/i,
    ];

    for (const pattern of licenseNumberPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        licenseNumber = match[1].trim();
        break;
      }
    }

    // 2. Organization Name extraction
    const orgPatterns = [
      /(?:Organization|Enterprise|Business|Company|Proprietor|M\/S|Name\s+of\s+(?:Enterprise|Business|Company|Organization|Establishment))[:\s-]*([A-Za-z0-9&.,' -]+?)(?=(?:\s+(?:Expiry|Expiration|Valid|Issue|TIN|License|Date|Zone)|\n|$))/i,
      /M\/S[.:\s]+([A-Za-z0-9&.,' -]+?)(?=(?:\s+(?:Expiry|Expiration|Valid|Issue|TIN|License|Date)|\n|$))/i,
      /([A-Za-z0-9&.,' -]+?(?:Recycling|Recyclers|Enterprises?|Solutions|Traders|Ltd\.?|Limited|Corporation|Industries|Corp\.?))\b/i,
    ];

    for (const pattern of orgPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length > 2 && !candidate.toLowerCase().includes('license') && !candidate.toLowerCase().includes('validity')) {
          orgName = candidate;
          break;
        }
      }
    }

    // 3. Expiry Date extraction
    const expiryPatterns = [
      /(?:Expiry(?:\s+Date)?|Expiration(?:\s+Date)?|Valid\s+Up\s+To|Valid\s+Until|Valid\s+Till|Validity(?:\s+Date)?|Expires|Expired\s+On|Valid\s+Through)[:\s-]*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i,
      /(?:Valid\s+to|Valid\s+date)[:\s-]*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i,
    ];

    for (const pattern of expiryPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        expiryDateString = match[1].trim();
        expiryDate = parseFlexibleDate(expiryDateString);
        if (expiryDate) break;
      }
    }

    // 4. Issue Date extraction
    const issueMatch = rawText.match(/(?:Issue\s+Date|Issued\s+On|Date\s+of\s+Issue|Date\s+of\s+Registration)[:\s-]*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);
    if (issueMatch && issueMatch[1]) {
      issueDate = parseFlexibleDate(issueMatch[1].trim());
    }

    // 5. TIN extraction
    const tinMatch = rawText.match(/(?:TIN|e-TIN|Taxpayer\s+Identification\s+Number)[:\s-]*(\d{10,12})/i);
    if (tinMatch && tinMatch[1]) {
      tin = tinMatch[1].trim();
    }

    // 6. DoE Authorization check
    const isDoeAuthorized = /Department\s+of\s+Environment|DoE|E-Waste\s+Management\s+Rules\s+2021|Hazardous\s+Waste|DOE\/E-WASTE|E-Waste\s+Recycling\s+Permit/i.test(rawText);

    return {
      licenseNumber,
      orgName,
      expiryDate,
      expiryDateString,
      issueDate,
      tin,
      isDoeAuthorized,
      rawText,
    };
  },

  /**
   * Discrepancy Matrix & Expiration Evaluation
   */
  evaluateDiscrepancies(
    submitted: { licenseNumber?: string | null; orgName?: string | null },
    extracted: ExtractedEntities,
    now: Date = new Date()
  ): DiscrepancyResult {
    const mismatchedFields: string[] = [];

    // Expiration check
    let isExpired = false;
    if (extracted.expiryDate) {
      isExpired = extracted.expiryDate.getTime() < now.getTime();
    }

    // License number comparison
    let licenseScore = 1.0;
    if (submitted.licenseNumber && extracted.licenseNumber) {
      licenseScore = stringSimilarity(submitted.licenseNumber, extracted.licenseNumber);
      if (licenseScore < 0.8) {
        mismatchedFields.push('license_number');
      }
    } else if (submitted.licenseNumber && !extracted.licenseNumber) {
      licenseScore = 0.0;
      mismatchedFields.push('license_number');
    }

    // Org Name comparison
    let orgScore = 1.0;
    if (submitted.orgName && extracted.orgName) {
      orgScore = stringSimilarity(submitted.orgName, extracted.orgName);
      if (orgScore < 0.7) {
        mismatchedFields.push('org_name');
      }
    } else if (submitted.orgName && !extracted.orgName) {
      orgScore = 0.0;
      mismatchedFields.push('org_name');
    }

    // Combined confidence score
    let confidenceScore = Math.round(((licenseScore * 0.6) + (orgScore * 0.4)) * 100) / 100;
    if (confidenceScore > 1.0) confidenceScore = 1.0;
    if (confidenceScore < 0.0) confidenceScore = 0.0;

    let matchStatus: DiscrepancyResult['matchStatus'] = 'PENDING_MATCH';
    if (isExpired) {
      matchStatus = 'EXPIRED';
    } else if (mismatchedFields.length === 0 && confidenceScore >= 0.85) {
      matchStatus = 'EXACT_MATCH';
    } else if (confidenceScore >= 0.50) {
      matchStatus = 'PARTIAL_MATCH';
    } else {
      matchStatus = 'MISMATCH';
    }

    return {
      confidenceScore,
      matchStatus,
      mismatchedFields,
      isExpired,
      fieldScores: {
        licenseNumber: licenseScore,
        orgName: orgScore,
      },
    };
  },

  /**
   * Run OCR text detection via Google Cloud Vision API with degraded fallback
   */
  async runOcrTextDetection(input: {
    documentUrl: string;
    imageBase64?: string | null;
    rawDocumentText?: string | null;
  }): Promise<{ rawText: string; provider: 'GOOGLE_VISION' | 'LOCAL_FALLBACK' }> {
    // If rawDocumentText is passed (e.g. for testing / degraded mode), use it
    if (input.rawDocumentText) {
      return {
        rawText: input.rawDocumentText,
        provider: 'LOCAL_FALLBACK',
      };
    }

    // If Google Vision API key is configured and image base64 / URL provided
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (apiKey && (input.imageBase64 || input.documentUrl)) {
      try {
        let imagePayload: any = {};
        if (input.imageBase64) {
          const cleanBase64 = input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          imagePayload = { content: cleanBase64 };
        } else {
          imagePayload = { source: { imageUri: input.documentUrl } };
        }

        const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: imagePayload,
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }, { type: 'TEXT_DETECTION' }],
              },
            ],
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = await res.json();
          const fullText = data.responses?.[0]?.fullTextAnnotation?.text ||
            data.responses?.[0]?.textAnnotations?.[0]?.description;
          if (fullText) {
            return {
              rawText: fullText,
              provider: 'GOOGLE_VISION',
            };
          }
        }
      } catch {
        console.warn('[KYC_OCR_DEGRADED_MODE] Falling back to local heuristic text parser');
      }
    }

    // Fallback: heuristic mock/offline extraction from documentUrl or metadata
    console.warn('[KYC_OCR_DEGRADED_MODE] Falling back to local heuristic text parser');
    return {
      rawText: input.documentUrl || 'Government of Bangladesh Department of Environment Trade License',
      provider: 'LOCAL_FALLBACK',
    };
  },

  /**
   * Main pipeline: Ingests document -> OCR -> Entity Parsing -> Discrepancy Matrix -> Persistence
   */
  async extractAndVerify(input: ExtractKycInput) {
    const partner = await partnerRepo.findById(input.partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    // 1. Ingest document via OCR or local fallback
    const { rawText, provider } = await this.runOcrTextDetection({
      documentUrl: input.documentUrl,
      imageBase64: input.imageBase64,
      rawDocumentText: input.rawDocumentText,
    });

    // 2. Extract structured entities
    const entities = this.extractEntitiesFromText(rawText);

    // 3. Discrepancy matrix & Expiration check
    const submittedLicense = input.submittedLicenseNumber ?? null;
    const submittedOrg = input.submittedOrgName ?? partner.org_name;

    const discrepancy = this.evaluateDiscrepancies(
      { licenseNumber: submittedLicense, orgName: submittedOrg },
      entities
    );

    // 4. Persist extraction record
    const extraction = await kycExtractionsRepo.create({
      partner_id: input.partnerId,
      document_url: input.documentUrl,
      document_type: input.documentType,
      ocr_provider: provider,
      raw_extracted_text: rawText,
      extracted_org_name: entities.orgName,
      extracted_license_number: entities.licenseNumber,
      extracted_expiry_date: entities.expiryDate,
      confidence_score: discrepancy.confidenceScore,
      match_status: discrepancy.matchStatus,
      mismatched_fields: discrepancy.mismatchedFields,
      is_expired: discrepancy.isExpired,
    });

    return {
      extractionId: extraction.id,
      matchStatus: extraction.match_status,
      confidenceScore: Number(extraction.confidence_score),
      extractedFields: {
        orgName: entities.orgName,
        licenseNumber: entities.licenseNumber,
        expiryDate: entities.expiryDate ? entities.expiryDate.toISOString() : null,
        issueDate: entities.issueDate ? entities.issueDate.toISOString() : null,
        tin: entities.tin,
        isDoeAuthorized: entities.isDoeAuthorized,
      },
      isExpired: discrepancy.isExpired,
      degradedMode: provider === 'LOCAL_FALLBACK',
      mismatchedFields: discrepancy.mismatchedFields,
      rawText: extraction.raw_extracted_text,
      extraction,
    };
  },

  /**
   * Retrieve KYC adjudication worklist with diffs
   */
  async getAdjudicationQueue(status?: string) {
    const rows = await kycExtractionsRepo.findQueue(status);

    return rows.map(({ extraction, partner }) => {
      const submittedOrg = partner.org_name;
      const extractedOrg = extraction.extracted_org_name;
      const extractedLicense = extraction.extracted_license_number;
      const mismatchedFields = (extraction.mismatched_fields as string[]) || [];

      return {
        id: extraction.id,
        partnerId: partner.id,
        partnerOrgName: partner.org_name,
        partnerStatus: partner.status,
        partnerTypes: partner.types,
        documentUrl: extraction.document_url,
        documentType: extraction.document_type,
        ocrProvider: extraction.ocr_provider,
        rawExtractedText: extraction.raw_extracted_text,
        extractedOrgName: extractedOrg,
        extractedLicenseNumber: extractedLicense,
        extractedExpiryDate: extraction.extracted_expiry_date,
        confidenceScore: Number(extraction.confidence_score),
        matchStatus: extraction.match_status,
        mismatchedFields,
        isExpired: extraction.is_expired,
        adjudicatedBy: extraction.adjudicated_by,
        adjudicatedAt: extraction.adjudicated_at,
        adjudicationNotes: extraction.adjudication_notes,
        createdAt: extraction.created_at,
        diffs: {
          orgNameMismatch: mismatchedFields.includes('org_name') || (Boolean(extractedOrg) && normalizeString(submittedOrg) !== normalizeString(extractedOrg)),
          licenseMismatch: mismatchedFields.includes('license_number'),
          isExpired: extraction.is_expired,
        },
      };
    });
  },

  /**
   * Admin Adjudication: Approve/Reject/Request Re-upload with DoE capability gating & immutable audit log
   */
  async adjudicate(input: AdjudicateKycInput) {
    const extraction = await kycExtractionsRepo.findById(input.extractionId);
    if (!extraction) {
      throw new Error('KYC extraction not found');
    }

    const partner = await partnerRepo.findById(extraction.partner_id);
    if (!partner) {
      throw new Error('Partner not found');
    }

    const previousStatus = partner.status;
    let targetStatus: string;
    let targetEwasteLicensed = partner.e_waste_licensed;

    if (input.decision === 'APPROVE') {
      targetStatus = 'VERIFIED';
      if (input.grantEwasteLicense !== undefined) {
        targetEwasteLicensed = Boolean(input.grantEwasteLicense);
      }
      await partnerRepo.updateVerification(partner.id, 'VERIFIED', targetEwasteLicensed, input.notes || null);
      await userRepo.updateRole(partner.user_id, 'PARTNER');
    } else if (input.decision === 'REJECT') {
      targetStatus = 'REJECTED';
      targetEwasteLicensed = false;
      await partnerRepo.updateVerification(partner.id, 'REJECTED', false, input.notes || 'KYC verification rejected');
      await userRepo.updateRole(partner.user_id, 'INDIVIDUAL');
    } else {
      // REQUEST_REUPLOAD
      targetStatus = 'APPLIED';
      await partnerRepo.updateVerification(partner.id, 'APPLIED', false, input.notes || 'Please re-upload a clear copy of your license');
    }

    // Update extraction status
    const updatedExtraction = await kycExtractionsRepo.updateAdjudication(extraction.id, {
      adjudicated_by: input.adminUserId,
      adjudicated_at: new Date(),
      adjudication_notes: input.notes || null,
      match_status: input.decision === 'APPROVE' ? 'EXACT_MATCH' : (input.decision === 'REJECT' ? 'MISMATCH' : extraction.match_status),
    });

    // Write immutable compliance audit log
    const auditRecord = await partnerComplianceAuditsRepo.create({
      partner_id: partner.id,
      extraction_id: extraction.id,
      previous_status: previousStatus,
      new_status: targetStatus,
      granted_capabilities: {
        e_waste_licensed: targetEwasteLicensed,
        types: partner.types,
        capability_flags: partner.capability_flags,
      },
      actor_id: input.adminUserId,
      reason: input.notes || `KYC Adjudication decision: ${input.decision}`,
    });

    const updatedPartner = await partnerRepo.findById(partner.id);

    return {
      extraction: updatedExtraction,
      partner: updatedPartner,
      audit: auditRecord,
    };
  },
};
