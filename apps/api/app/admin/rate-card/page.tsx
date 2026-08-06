'use client';

import React, { useState, useEffect } from 'react';

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
    <div style={{ padding: 32, fontFamily: 'sans-serif', backgroundColor: '#0F172A', color: '#F8FAFC', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, color: '#10B981', marginBottom: 8 }}>Chokro Admin — Rate Card Console</h1>
      <p style={{ color: '#94A3B8', marginBottom: 32 }}>Manage published rates and material pricing bands</p>

      <form onSubmit={handleAddRate} style={{ background: '#1E293B', padding: 24, borderRadius: 8, marginBottom: 32, maxWidth: 600 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Add / Update Rate Entry</h2>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 4, background: '#0F172A', color: '#FFF' }}>
            {['CLOTHES', 'BOOKS', 'PLASTICS', 'PAPER', 'METAL', 'GLASS', 'FURNITURE', 'APPLIANCES', 'E_WASTE'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as any)} style={{ width: '100%', padding: 10, borderRadius: 4, background: '#0F172A', color: '#FFF' }}>
            <option value="kg">Per kg</option>
            <option value="piece">Per piece</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Price (BDT ৳)</label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 45.00"
            value={priceBdt}
            onChange={(e) => setPriceBdt(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 4, background: '#0F172A', color: '#FFF' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ background: '#10B981', color: '#0F172A', padding: '12px 24px', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'Saving...' : 'Save Rate Entry'}
        </button>
      </form>

      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Rate Card History & Effective Rates</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1E293B', borderRadius: 8 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155', color: '#94A3B8' }}>
            <th style={{ padding: 12 }}>Category</th>
            <th style={{ padding: 12 }}>Condition</th>
            <th style={{ padding: 12 }}>Unit</th>
            <th style={{ padding: 12 }}>Price (BDT ৳)</th>
            <th style={{ padding: 12 }}>Effective From</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: 12 }}>{r.category}</td>
              <td style={{ padding: 12 }}>{r.condition_band}</td>
              <td style={{ padding: 12 }}>{r.unit}</td>
              <td style={{ padding: 12, fontWeight: 'bold', color: '#10B981' }}>৳{r.price_bdt}</td>
              <td style={{ padding: 12, color: '#94A3B8' }}>{new Date(r.effective_from).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
