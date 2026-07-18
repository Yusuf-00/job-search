'use client';

import { useEffect } from 'react';
import { SearchHit } from '../lib/search/providers/search-provider.interface';

const PAY_PERIOD_LABEL: Record<string, string> = {
  HOURLY: '/hr',
  WEEKLY: '/wk',
  MONTHLY: '/mo',
  YEARLY: '/yr',
};

function buildSalaryLabel(hit: SearchHit): string {
  if (!hit.hasSalaryData) return 'Salary not listed';

  const period = hit.rawPayPeriod?.toUpperCase() ?? 'YEARLY';
  const suffix = PAY_PERIOD_LABEL[period] ?? '/yr';

  const rawMin = hit.rawSalaryMin ?? hit.rawSalaryMedian;
  const rawMax = hit.rawSalaryMax ?? hit.rawSalaryMedian;

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  const rawLabel =
    rawMin !== null && rawMax !== null
      ? rawMin === rawMax
        ? `${fmt(rawMin)}${suffix}`
        : `${fmt(rawMin)} – ${fmt(rawMax)}${suffix}`
      : null;

  const annualMin = hit.normalizedSalaryMinAnnual;
  const annualMax = hit.normalizedSalaryMaxAnnual;
  const annualLabel =
    period !== 'YEARLY' && annualMin !== null && annualMax !== null
      ? ` (≈ ${annualMin === annualMax ? fmt(annualMin) : `${fmt(annualMin)} – ${fmt(annualMax)}`}/yr)`
      : '';

  return rawLabel ? `${rawLabel}${annualLabel}` : 'Salary not listed';
}

interface JobDetailModalProps {
  hit: SearchHit;
  onClose: () => void;
}

export default function JobDetailModal({ hit, onClose }: JobDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const salaryLabel = buildSalaryLabel(hit);
  const location = [hit.city, hit.state].filter(Boolean).join(', ') || 'Location unspecified';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '5vh 16px',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)',
          maxWidth: 640,
          width: '100%',
          padding: '24px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            border: 'none',
            background: 'none',
            fontSize: '20px',
            lineHeight: 1,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          ×
        </button>

        <h2 id="job-detail-title" style={{ fontSize: '20px', fontWeight: 700, marginRight: '24px' }}>
          {hit.displayTitle}
        </h2>
        <p style={{ margin: '8px 0 4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {hit.companyName} — {location}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{salaryLabel}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '16px 0' }}>
          {hit.workType && (
            <span
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {hit.workType.replace(/_/g, ' ')}
            </span>
          )}
          {hit.remoteAllowed && (
            <span
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              Remote
            </span>
          )}
        </div>

        {hit.skills?.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Skills</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {hit.skills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontSize: '12px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Description</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {hit.displayDescription || hit.description || 'No description provided.'}
          </p>
        </div>
      </div>
    </div>
  );
}
