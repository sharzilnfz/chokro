import { ValuationDomain, CommodityPriceData, RateDriftInfo } from '../domain/ValuationDomain';
import { RateBenchmark } from '../repos/benchmarks';

export type { CommodityPriceData, RateDriftInfo };

/**
 * CommodityBenchmarkService — Adapter / Facade over ValuationDomain (M3 F1)
 */
export class CommodityBenchmarkService {
  static async fetchLatestFxRate(): Promise<number> {
    return ValuationDomain.fetchFxRate();
  }

  static async fetchLiveCommodityQuote(symbol = 'HG=F'): Promise<number | null> {
    return ValuationDomain.fetchLiveCommodityQuote(symbol);
  }

  static async fetchLatestCommodityPrices(fxRate?: number): Promise<CommodityPriceData[]> {
    return ValuationDomain.fetchLatestCommodityPrices(fxRate);
  }

  static async syncBenchmarks(fxRate?: number): Promise<RateBenchmark[]> {
    return ValuationDomain.syncBenchmarks(fxRate);
  }

  static calculateDrift(localPriceBdt: number, benchmarkBdt: number): RateDriftInfo {
    return ValuationDomain.calculateDrift(localPriceBdt, benchmarkBdt);
  }
}
