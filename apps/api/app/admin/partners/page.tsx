'use client';

import React, { useState, useEffect } from 'react';

export default function AdminPartnersPage() {
  const [partnerList, setPartnerList] = useState<any[]>([]);

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

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', backgroundColor: '#0F172A', color: '#F8FAFC', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, color: '#10B981', marginBottom: 8 }}>Chokro Admin — Partner Verification Queue</h1>
      <p style={{ color: '#94A3B8', marginBottom: 32 }}>Review partner credentials and DoE licensing compliance</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1E293B', borderRadius: 8 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155', color: '#94A3B8' }}>
            <th style={{ padding: 12 }}>Organization</th>
            <th style={{ padding: 12 }}>Types</th>
            <th style={{ padding: 12 }}>E-Waste Licensed</th>
            <th style={{ padding: 12 }}>DoE Document</th>
            <th style={{ padding: 12 }}>Status</th>
            <th style={{ padding: 12 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {partnerList.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: 12, fontWeight: 'bold' }}>{p.org_name}</td>
              <td style={{ padding: 12 }}>{Array.isArray(p.types) ? p.types.join(', ') : p.types}</td>
              <td style={{ padding: 12, color: p.e_waste_licensed ? '#10B981' : '#F59E0B' }}>
                {p.e_waste_licensed ? 'YES (DoE Verified)' : 'NO'}
              </td>
              <td style={{ padding: 12, color: '#94A3B8' }}>{p.doe_license_doc || 'None'}</td>
              <td style={{ padding: 12, fontWeight: 'bold' }}>{p.status}</td>
              <td style={{ padding: 12 }}>
                {p.status === 'APPLIED' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleVerify(p.id, 'VERIFIED')}
                      style={{ background: '#10B981', color: '#0F172A', padding: '6px 12px', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerify(p.id, 'REJECTED')}
                      style={{ background: '#EF4444', color: '#FFF', padding: '6px 12px', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}
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
  );
}
