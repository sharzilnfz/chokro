'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPartnersPage() {
  const [partnerList, setPartnerList] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'APPLIED' | 'VERIFIED' | 'REJECTED'>('ALL');

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/admin/partners');
      const data = await res.json();
      if (data.partners) setPartnerList(data.partners);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleVerify = async (partnerId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, status }),
      });
      if (res.ok) fetchPartners();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPartners = partnerList.filter((p) => (filter === 'ALL' ? true : p.status === filter));

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#090D16', color: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid #1E293B', paddingBottom: 20 }}>
        <div>
          <Link href="/admin" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 4 }}>
            ← Back to Admin Portal
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#38BDF8' }}>Partner Verification Queue</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, background: '#131C2E', padding: 4, borderRadius: 10, border: '1px solid #1E293B' }}>
          {(['ALL', 'APPLIED', 'VERIFIED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: filter === tab ? '#38BDF8' : 'transparent',
                color: filter === tab ? '#090D16' : '#94A3B8',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Table Container */}
      <div style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #1E293B', color: '#64748B', background: '#090D16' }}>
              <th style={{ padding: '16px 24px' }}>Organization</th>
              <th style={{ padding: '16px 24px' }}>Capabilities</th>
              <th style={{ padding: '16px 24px' }}>DoE E-Waste License</th>
              <th style={{ padding: '16px 24px' }}>License Reference</th>
              <th style={{ padding: '16px 24px' }}>Status</th>
              <th style={{ padding: '16px 24px' }}>Verification Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPartners.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1E293B' }}>
                <td style={{ padding: '20px 24px', fontWeight: 600, color: '#F8FAFC' }}>{p.org_name}</td>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(Array.isArray(p.types) ? p.types : [p.types]).map((t: string) => (
                      <span key={t} style={{ background: '#090D16', color: '#38BDF8', border: '1px solid #1E293B', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  {p.e_waste_licensed ? (
                    <span style={{ color: '#10B981', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      ✓ Licensed
                    </span>
                  ) : (
                    <span style={{ color: '#64748B', fontSize: 13 }}>Standard Only</span>
                  )}
                </td>
                <td style={{ padding: '20px 24px', color: '#94A3B8', fontFamily: 'monospace', fontSize: 12 }}>
                  {p.doe_license_doc || '—'}
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      background: p.status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: p.status === 'VERIFIED' ? '#10B981' : p.status === 'REJECTED' ? '#EF4444' : '#F59E0B',
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  {p.status === 'APPLIED' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleVerify(p.id, 'VERIFIED')}
                        style={{ background: '#10B981', color: '#090D16', padding: '8px 16px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerify(p.id, 'REJECTED')}
                        style={{ background: '#1E293B', color: '#EF4444', border: '1px solid #334155', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
