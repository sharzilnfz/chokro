'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminRateCardPage() {
  const [rates, setRates] = useState<any[]>([]);
  const [category, setCategory] = useState('PLASTICS');
  const [conditionBand, setConditionBand] = useState('GOOD');
  const [unit, setUnit] = useState<'kg' | 'piece'>('kg');
  const [priceBdt, setPriceBdt] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/admin/rate-card');
      const data = await res.json();
      if (data.entries) setRates(data.entries);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceBdt) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/rate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          conditionBand,
          unit,
          priceBdt: parseFloat(priceBdt),
        }),
      });
      if (res.ok) {
        setPriceBdt('');
        fetchRates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#090D16', color: '#F8FAFC', minHeight: '100vh' }}>
      {/* Top Header Nav */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid #1E293B', paddingBottom: 20 }}>
        <div>
          <Link href="/admin" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 4 }}>
            ← Back to Admin Portal
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#10B981' }}>Rate Card Console</h1>
        </div>
        <div style={{ background: '#131C2E', padding: '8px 16px', borderRadius: 20, border: '1px solid #1E293B', fontSize: 12, color: '#94A3B8' }}>
          Effective Pricing Version Live
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 32, alignItems: 'start' }}>
        {/* Form Container */}
        <form onSubmit={handleAddRate} style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', padding: 24, borderRadius: 16 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 20px 0', color: '#F8FAFC' }}>Update Category Rate</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>Category</label>
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value;
                setCategory(val);
                if (val === 'E_WASTE' || val === 'APPLIANCES') setUnit('piece');
              }}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#090D16', border: '1px solid #334155', color: '#F8FAFC', outline: 'none' }}
            >
              {['CLOTHES', 'BOOKS', 'PLASTICS', 'PAPER', 'METAL', 'GLASS', 'FURNITURE', 'APPLIANCES', 'E_WASTE'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>Condition Band</label>
            <select
              value={conditionBand}
              onChange={(e) => setConditionBand(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#090D16', border: '1px solid #334155', color: '#F8FAFC', outline: 'none' }}
            >
              {['EXCELLENT', 'GOOD', 'FAIR', 'SCRAP'].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>Pricing Unit</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setUnit('kg')}
                style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #334155', background: unit === 'kg' ? '#10B981' : '#090D16', color: unit === 'kg' ? '#090D16' : '#94A3B8', fontWeight: 600, cursor: 'pointer' }}
              >
                Per kg
              </button>
              <button
                type="button"
                onClick={() => setUnit('piece')}
                style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #334155', background: unit === 'piece' ? '#10B981' : '#090D16', color: unit === 'piece' ? '#090D16' : '#94A3B8', fontWeight: 600, cursor: 'pointer' }}
              >
                Per piece
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>Price Rate (BDT ৳)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 45.00"
              value={priceBdt}
              onChange={(e) => setPriceBdt(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#090D16', border: '1px solid #334155', color: '#F8FAFC', fontSize: 16, outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', backgroundColor: '#10B981', color: '#090D16', padding: 14, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            {loading ? 'Publishing...' : 'Publish Rate Entry'}
          </button>
        </form>

        {/* Table Container */}
        <div style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, margin: 0, color: '#F8FAFC' }}>Active & Historical Rate Table</h2>
            <span style={{ fontSize: 12, color: '#64748B' }}>{rates.length} entries</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #1E293B', color: '#64748B', background: '#090D16' }}>
                <th style={{ padding: '14px 24px' }}>Category</th>
                <th style={{ padding: '14px 24px' }}>Condition Band</th>
                <th style={{ padding: '14px 24px' }}>Unit</th>
                <th style={{ padding: '14px 24px' }}>Rate (BDT)</th>
                <th style={{ padding: '14px 24px' }}>Effective From</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r, idx) => (
                <tr key={r.id || idx} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: '#F8FAFC' }}>{r.category}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ background: '#1E293B', color: '#94A3B8', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>
                      {r.condition_band}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#94A3B8' }}>{r.unit}</td>
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: '#10B981', fontSize: 16 }}>৳{r.price_bdt}</td>
                  <td style={{ padding: '16px 24px', color: '#64748B', fontSize: 13 }}>
                    {r.effective_from ? new Date(r.effective_from).toLocaleDateString() : 'Active'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
