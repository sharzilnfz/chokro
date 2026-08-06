'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#090D16', color: '#F8FAFC', minHeight: '100vh' }}>
      {/* Top Header Nav */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid #1E293B', pb: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20, color: '#090D16' }}>
            C
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#F8FAFC' }}>Chokro Admin Portal</h1>
            <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>Circular Economy Control Center</span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 24 }}>
          <Link href="/admin/rate-card" style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            Rate Card
          </Link>
          <Link href="/admin/partners" style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            Partner Queue
          </Link>
        </nav>
      </header>

      {/* Hero / Stat Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
        <div style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', padding: 24, borderRadius: 16 }}>
          <span style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', tracking: '0.1em' }}>Active Listings</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981', marginTop: 8 }}>1,248</div>
          <span style={{ fontSize: 12, color: '#64748B' }}>+12% this week</span>
        </div>

        <div style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', padding: 24, borderRadius: 16 }}>
          <span style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', tracking: '0.1em' }}>Verified Partners</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#38BDF8', marginTop: 8 }}>42</div>
          <span style={{ fontSize: 12, color: '#64748B' }}>DoE Compliant Org Network</span>
        </div>

        <div style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', padding: 24, borderRadius: 16 }}>
          <span style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', tracking: '0.1em' }}>Green Credits Issued</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#F59E0B', marginTop: 8 }}>৳184,500</div>
          <span style={{ fontSize: 12, color: '#64748B' }}>Append-Only Ledger Verified</span>
        </div>
      </div>

      {/* Modules Grid */}
      <h2 style={{ fontSize: 18, color: '#94A3B8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Management Modules</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <Link href="/admin/rate-card" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', padding: 28, borderRadius: 16, transition: 'all 0.2s ease', cursor: 'pointer' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>📊</div>
            <h3 style={{ fontSize: 20, color: '#F8FAFC', margin: '0 0 8px 0' }}>Rate Card Console</h3>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Set per-kg and per-piece rates across 9 categories. Manage effective_from version history.
            </p>
          </div>
        </Link>

        <Link href="/admin/partners" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#131C2E', border: '1px solid #1E293B', padding: 28, borderRadius: 16, transition: 'all 0.2s ease', cursor: 'pointer' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🛡️</div>
            <h3 style={{ fontSize: 20, color: '#F8FAFC', margin: '0 0 8px 0' }}>Partner Verification Queue</h3>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Review collector and recycler applications. Validate mandatory DoE license documents for e-waste.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
