import {
  ValuationDomain,
  VisionClassifyInput as VisionClassifyRequest,
  VisionClassifyOutput as VisionClassifyResult,
} from '../domain/ValuationDomain';

export type { VisionClassifyRequest, VisionClassifyResult };

/**
 * VisionAgentService — Adapter / Facade over deep ValuationDomain (M3 F2)
 */
export class VisionAgentService {
  static async classifyAndEstimate(input: VisionClassifyRequest): Promise<VisionClassifyResult> {
    return ValuationDomain.classifyAndEstimate(input);
  }
}
