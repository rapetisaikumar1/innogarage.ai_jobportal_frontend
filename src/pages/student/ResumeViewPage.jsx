import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { ArrowLeft, Download } from 'lucide-react';

/* ── Section accent colors (cycle through) ── */
const SECTION_COLORS = [
  { border: '#1e40af', bg: '#eff6ff', text: '#1e40af' },   // blue
  { border: '#7c3aed', bg: '#f5f3ff', text: '#7c3aed' },   // violet
  { border: '#059669', bg: '#ecfdf5', text: '#059669' },   // emerald
  { border: '#dc2626', bg: '#fef2f2', text: '#dc2626' },   // red
  { border: '#d97706', bg: '#fffbeb', text: '#d97706' },   // amber
  { border: '#0891b2', bg: '#ecfeff', text: '#0891b2' },   // cyan
];

const ResumeViewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const resumeRef = useRef(null);

  const { sections = [], candidateName = '' } = location.state || {};
  const displayName = authUser?.fullName || candidateName || 'Resume';

  const handleDownloadPDF = () => {
    const el = resumeRef.current;
    if (!el) return;
    html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `${displayName.replace(/\s+/g, '_')}_Resume.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
  };

  const handleDownloadWord = () => {
    const el = resumeRef.current;
    if (!el) return;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body{font-family:Georgia,serif;margin:40px 50px;color:#333}
h1{font-size:22px;color:#1e3a5f;text-align:center;margin:0}
.contact{text-align:center;font-size:11px;color:#4a5568;margin:8px 0 20px}
h2{font-size:14px;color:#1e3a5f;text-transform:uppercase;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin:18px 0 8px}
p,li{font-size:12px;line-height:1.6}
ul{margin:4px 0;padding-left:20px}
</style></head><body>${el.innerHTML}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    saveAs(blob, `${displayName.replace(/\s+/g, '_')}_Resume.doc`);
  };

  if (!sections.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No resume data available</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-8 px-4">
      {/* Top bar */}
      <div className="max-w-[800px] mx-auto mb-5 flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition-colors"
            style={{ background: '#dc2626' }}
            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}>
            <Download size={15} /> PDF
          </button>
          <button onClick={handleDownloadWord}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition-colors"
            style={{ background: '#2563eb' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}>
            <Download size={15} /> Word
          </button>
        </div>
      </div>

      {/* Resume Document */}
      <div className="max-w-[800px] mx-auto">
        <div ref={resumeRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header with gradient */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '32px 48px 28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', textAlign: 'center', textTransform: 'capitalize', fontFamily: 'Georgia, serif', margin: 0 }}>
              {displayName}
            </h1>

            {(authUser?.phone || authUser?.email || authUser?.linkedinProfile) && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#93c5fd', marginTop: '10px', lineHeight: '1.6' }}>
                {[authUser?.phone, authUser?.email].filter(Boolean).join('  •  ')}
                {authUser?.linkedinProfile && (
                  <>
                    <br />
                    {authUser.linkedinProfile}
                  </>
                )}
              </p>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '24px 48px 40px', fontFamily: 'Georgia, serif' }}>
            {sections.map((section, si) => {
              const color = SECTION_COLORS[si % SECTION_COLORS.length];
              return (
                <div key={si} style={{ marginBottom: '20px' }}>
                  {/* Section heading with colored left border */}
                  <div style={{
                    borderLeft: `4px solid ${color.border}`,
                    background: color.bg,
                    padding: '8px 14px',
                    marginBottom: '10px',
                    borderRadius: '0 6px 6px 0',
                  }}>
                    <h2 style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      letterSpacing: '0.1em',
                      color: color.text,
                      margin: 0,
                      textTransform: 'uppercase',
                    }}>
                      {section.heading}
                    </h2>
                  </div>

                  {/* Section content */}
                  <div style={{ color: '#333', fontSize: '12.5px', lineHeight: '1.7', paddingLeft: '4px' }}>
                    {section.lines.map((line, li) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={li} style={{ height: '8px' }} />;
                      const isBullet = /^[-•*○◦▪●]/.test(trimmed) || /^(\d+[.)])/.test(trimmed);
                      if (isBullet) {
                        const text = trimmed.replace(/^[-•*○◦▪●]\s*/, '').replace(/^(\d+[.)])\s*/, '');
                        return (
                          <div key={li} style={{ display: 'flex', gap: '8px', paddingLeft: '12px', paddingTop: '2px', paddingBottom: '2px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color.border, display: 'inline-block', flexShrink: 0, marginTop: '7px' }} />
                            <span>{text}</span>
                          </div>
                        );
                      }
                      const isBoldLine = /^[A-Z].*\d{4}/.test(trimmed) ||
                        /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/i.test(trimmed) ||
                        /–\s*(Present|Current)/i.test(trimmed);
                      if (isBoldLine) {
                        return <p key={li} style={{ fontWeight: '600', marginTop: '6px', color: '#1e3a5f' }}>{trimmed}</p>;
                      }
                      return <p key={li} style={{ paddingTop: '2px', paddingBottom: '2px', margin: 0 }}>{trimmed}</p>;
                    })}
                  </div>

                  {/* Subtle divider line after section */}
                  {si < sections.length - 1 && (
                    <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: '16px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeViewPage;
