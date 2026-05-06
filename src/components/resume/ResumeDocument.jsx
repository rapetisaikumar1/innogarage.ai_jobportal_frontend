import { forwardRef } from 'react';

export const RESUME_WORD_STYLES = `
body{margin:0;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif}
.ats-resume-document{width:100%;box-sizing:border-box;padding:38px 48px;color:#111827;font-family:Arial,Helvetica,sans-serif;background:#fff}
.resume-header{text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1.5px solid #111827}
.resume-name{margin:0;font-size:24px;line-height:1.1;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#111827}
.resume-headline{margin:7px 0 0;font-size:12px;line-height:1.3;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#374151}
.resume-contact{margin:7px 0 0;font-size:10.5px;line-height:1.4;color:#4b5563}
.resume-section{margin:0 0 13px;page-break-inside:avoid}
.resume-section-title{margin:0 0 4px;padding-bottom:4px;border-bottom:1.5px solid #111827;font-size:13px;line-height:1.2;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#111827}
.resume-section-body{font-size:11.5px;line-height:1.46;color:#111827}
.resume-paragraph{margin:0 0 4px}
.resume-job-line{margin:8px 0 3px;font-size:11.8px;font-weight:800;color:#4c1d95}
.resume-subheading{margin:5px 0 2px;font-size:11.7px;font-weight:800;color:#111827}
.resume-bullet{display:flex;gap:8px;margin:0 0 3px;padding-left:8px;page-break-inside:avoid;font-weight:700}
.resume-bullet-dot{width:5px;height:5px;border-radius:999px;background:#111827;flex:0 0 auto;margin-top:6px}
.resume-spacer{height:5px}
`;

const cleanHeading = (heading) => String(heading || 'Details').replace(/:+$/, '').trim().toUpperCase();

export const RESUME_TEMPLATES = [
  { id: 'modern', name: 'Modern Professional', accent: '#7c3aed' },
  { id: 'enterprise', name: 'Enterprise Minimal', accent: '#111827' },
  { id: 'tech', name: 'Tech Premium', accent: '#0891b2' },
];

const getTemplateTheme = (template = 'modern') => {
  if (template === 'enterprise') return { accent: '#111827', headingBg: '#ffffff', headingColor: '#111827', border: '#111827' };
  if (template === 'tech') return { accent: '#0891b2', headingBg: '#ecfeff', headingColor: '#155e75', border: '#0891b2' };
  return { accent: '#7c3aed', headingBg: '#f5f3ff', headingColor: '#4c1d95', border: '#7c3aed' };
};

const isBulletLine = (line) => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line) || /^[•○◦▪●]\s*/.test(line);

const stripBullet = (line) => line
  .replace(/^[-*]\s+/, '')
  .replace(/^\d+[.)]\s+/, '')
  .replace(/^[•○◦▪●]\s*/, '')
  .trim();

const isJobHeaderLine = (line) => {
  const text = line.trim();
  if (!text || text.length > 160 || /[.!?]$/.test(text)) return false;
  if (/\|/.test(text) && /\b(19|20)\d{2}\b|present|current/i.test(text)) return true;
  if (/\b(19|20)\d{2}\b\s*(?:-|–|to)\s*(?:\b(19|20)\d{2}\b|present|current)/i.test(text)) return true;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i.test(text)) return true;
  return /\b(developer|engineer|architect|consultant|analyst|lead|manager|specialist|administrator|designer)\b/i.test(text)
    && /\b(company|inc|llc|ltd|corp|solutions|technologies|systems|services|dentsu|adobe)\b/i.test(text);
};

const isSubHeadingLine = (line) => {
  const text = line.trim();
  if (!text || text.length > 80 || /[.!?]$/.test(text) || isBulletLine(text)) return false;
  if (/^(key\s+contributions?|responsibilities|achievements|projects?|technical\s+environment|environment|tools|technologies|platforms?|clients?|deliverables)\s*:?$/i.test(text)) return true;
  return /^[A-Z][A-Za-z\s/&-]{2,}:$/.test(text);
};

const normalizeLine = (line) => String(line || '').replace(/\s+/g, ' ').trim();

const renderHighlightedText = (text, keywords = []) => {
  const cleanKeywords = [...new Set((keywords || [])
    .map((keyword) => String(keyword || '').trim())
    .filter((keyword) => keyword.length >= 3))]
    .sort((a, b) => b.length - a.length)
    .slice(0, 24);

  if (!cleanKeywords.length) return text;

  const escaped = cleanKeywords.map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = String(text).split(matcher).filter(Boolean);

  return parts.map((part, index) => (
    cleanKeywords.some((keyword) => keyword.toLowerCase() === part.toLowerCase())
      ? <mark key={`${part}-${index}`} style={{ background: '#fef3c7', color: '#111827', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
      : <span key={`${part}-${index}`}>{part}</span>
  ));
};

const ResumeDocument = forwardRef(function ResumeDocument({
  displayName,
  headline,
  contactItems = [],
  linkedinProfile,
  sections = [],
  rawText = '',
  template = 'modern',
  highlightKeywords = [],
}, ref) {
  const cleanName = (displayName || 'Resume').trim();
  // Only show LinkedIn/GitHub URLs — never chatgpt.com or other non-professional URLs
  const safeLinkedin = linkedinProfile && /linkedin\.com|github\.com/i.test(linkedinProfile) ? linkedinProfile : null;
  const contacts = [...contactItems, safeLinkedin].filter(Boolean);
  const hasSections = Array.isArray(sections) && sections.length > 0;
  const theme = getTemplateTheme(template);

  return (
    <div
      ref={ref}
      className="ats-resume-document"
      style={{
        width: '100%',
        maxWidth: '794px',
        minHeight: '1123px',
        margin: '0 auto',
        padding: '38px 48px',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#111827',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <header className="resume-header" style={{ textAlign: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: `1.5px solid ${theme.border}` }}>
        <h1 className="resume-name" style={{ margin: 0, fontSize: '24px', lineHeight: 1.1, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#111827' }}>
          {cleanName}
        </h1>
        {headline && (
          <p className="resume-headline" style={{ margin: '7px 0 0', fontSize: '12px', lineHeight: 1.3, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.accent }}>
            {headline}
          </p>
        )}
        {contacts.length > 0 && (
          <p className="resume-contact" style={{ margin: '7px 0 0', fontSize: '10.5px', lineHeight: 1.4, color: '#4b5563' }}>
            {contacts.join(' | ')}
          </p>
        )}
      </header>

      {hasSections ? sections.map((section, sectionIndex) => (
        <section key={`${section.heading}-${sectionIndex}`} className="resume-section" style={{ margin: '0 0 13px', pageBreakInside: 'avoid' }}>
          <h2 className="resume-section-title" style={{ margin: '0 0 4px', padding: template === 'enterprise' ? '0 0 4px' : '4px 7px', borderBottom: `1.5px solid ${theme.border}`, fontSize: '13px', lineHeight: 1.2, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: theme.headingColor, background: template === 'enterprise' ? 'transparent' : theme.headingBg }}>
            {cleanHeading(section.heading)}
          </h2>
          <div className="resume-section-body" style={{ fontSize: '11.5px', lineHeight: 1.46, color: '#111827' }}>
            {(section.lines || []).map((line, lineIndex) => {
              const text = normalizeLine(line);
              if (!text) return <div key={lineIndex} className="resume-spacer" style={{ height: '5px' }} />;

              if (isBulletLine(text)) {
                return (
                  <div key={lineIndex} className="resume-bullet" style={{ display: 'flex', gap: '8px', margin: '0 0 3px', paddingLeft: '8px', pageBreakInside: 'avoid', fontWeight: 700 }}>
                    <span className="resume-bullet-dot" style={{ width: '5px', height: '5px', borderRadius: '999px', background: '#111827', flex: '0 0 auto', marginTop: '6px' }} />
                    <span style={{ fontWeight: 700 }}>{renderHighlightedText(stripBullet(text), highlightKeywords)}</span>
                  </div>
                );
              }

              if (isJobHeaderLine(text)) {
                return <p key={lineIndex} className="resume-job-line" style={{ margin: '8px 0 3px', fontSize: '11.8px', fontWeight: 800, color: theme.accent }}>{renderHighlightedText(text, highlightKeywords)}</p>;
              }

              if (isSubHeadingLine(text)) {
                return <p key={lineIndex} className="resume-subheading" style={{ margin: '5px 0 2px', fontSize: '11.7px', fontWeight: 800, color: '#111827' }}>{text.replace(/:$/, '')}</p>;
              }

              return <p key={lineIndex} className="resume-paragraph" style={{ margin: '0 0 4px' }}>{renderHighlightedText(text, highlightKeywords)}</p>;
            })}
          </div>
        </section>
      )) : (
          <div className="resume-section-body" style={{ fontSize: '11.5px', lineHeight: 1.46, whiteSpace: 'pre-line' }}>
          {rawText}
        </div>
      )}
    </div>
  );
});

export default ResumeDocument;