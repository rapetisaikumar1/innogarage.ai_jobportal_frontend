import { forwardRef } from 'react';

const FONT_STACK = '"Aptos", "Calibri", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const MONTH_PATTERN = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*';
const YEAR_PATTERN = '(?:19|20)\\d{2}';
const DATE_POINT_PATTERN = `(?:${MONTH_PATTERN}\\s+)?${YEAR_PATTERN}|Present|Current`;
const DATE_RANGE_PATTERN = new RegExp(`(${DATE_POINT_PATTERN})\\s*(?:-|–|to)\\s*(${DATE_POINT_PATTERN})$`, 'i');

export const RESUME_WORD_STYLES = `
body{margin:0;background:#fff;color:#0f172a;font-family:${FONT_STACK}}
.ats-resume-document{width:100%;box-sizing:border-box;padding:44px 52px 42px;color:#0f172a;font-family:${FONT_STACK};background:#fff}
.resume-header{text-align:center;margin-bottom:22px;padding-bottom:16px;border-bottom:2px solid #d7dee8}
.resume-name{margin:0;font-size:28px;line-height:1.05;font-weight:700;letter-spacing:.03em;color:#0f172a}
.resume-headline{margin:6px 0 0;font-size:11.5px;line-height:1.4;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#1f3b5b}
.resume-contact-row{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:10.6px;line-height:1.4;color:#5b6472}
.resume-section{margin:0 0 18px;page-break-inside:avoid}
.resume-section-heading{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.resume-section-title{margin:0;font-size:10.8px;line-height:1.2;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#1f3b5b}
.resume-section-rule{flex:1;height:1px;background:#d7dee8}
.resume-section-body{font-size:11.35px;line-height:1.62;color:#1f2937}
.resume-paragraph{margin:0 0 6px}
.resume-job-row{display:flex;justify-content:space-between;align-items:baseline;gap:6px 14px;flex-wrap:wrap;margin:10px 0 4px;page-break-inside:avoid}
.resume-job-line{margin:0;font-size:12.2px;font-weight:700;color:#0f172a}
.resume-job-meta{font-size:10.5px;font-weight:600;letter-spacing:.03em;color:#5b6472;white-space:nowrap}
.resume-subheading{margin:8px 0 4px;font-size:10.6px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1f3b5b}
.resume-bullet{display:grid;grid-template-columns:10px 1fr;gap:9px;margin:0 0 6px;padding-left:4px;page-break-inside:avoid}
.resume-bullet-dot{font-size:11px;line-height:1.45;color:#1f3b5b}
.resume-spacer{height:7px}
`;

const cleanHeading = (heading) => String(heading || 'Details').replace(/:+$/, '').trim().toUpperCase();

export const RESUME_TEMPLATES = [
  { id: 'modern', name: 'Modern Professional', accent: '#7c3aed' },
  { id: 'enterprise', name: 'Enterprise Minimal', accent: '#111827' },
  { id: 'tech', name: 'Tech Premium', accent: '#0891b2' },
];

const getTemplateTheme = () => {
  // Single fixed enterprise theme — same for all users
  return {
    accent: '#1f3b5b',
    body: '#1f2937',
    headingColor: '#1f3b5b',
    border: '#d7dee8',
    dot: '#94a3b8',
    muted: '#5b6472',
    strong: '#0f172a',
  };
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
  if (/\|/.test(text) && /\b(?:19|20)\d{2}\b|present|current/i.test(text)) return true;
  if (DATE_RANGE_PATTERN.test(text)) return true;
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

const isLabelValueLine = (line) => /^(role|location|client|domain|tools|technologies|stack|platform|environment|focus|team size|employment type)\s*:/i.test(line.trim());

const formatContactItem = (item) => String(item || '')
  .replace(/^https?:\/\//i, '')
  .replace(/^www\./i, '')
  .replace(/\/$/, '')
  .trim();

const splitJobHeaderLine = (line) => {
  const text = normalizeLine(line);
  if (!text) return { primary: '', meta: '' };

  const dateMatch = text.match(DATE_RANGE_PATTERN);
  if (dateMatch && typeof dateMatch.index === 'number') {
    const primary = text.slice(0, dateMatch.index).replace(/[|,·•\-–]+\s*$/, '').trim();
    const meta = text.slice(dateMatch.index).replace(/^[|,·•\-–]+\s*/, '').trim();
    if (primary) return { primary, meta };
  }

  const pipeParts = text.split('|').map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length >= 2) {
    return {
      primary: pipeParts.slice(0, -1).join(' | '),
      meta: pipeParts[pipeParts.length - 1],
    };
  }

  return { primary: text, meta: '' };
};

const renderHighlightedText = (text, keywords = []) => {
  void keywords;
  return text;
};

const renderLabelValueLine = (text, key, keywords, theme) => {
  const separatorIndex = text.indexOf(':');
  if (separatorIndex === -1) return null;

  const label = text.slice(0, separatorIndex).trim();
  const value = text.slice(separatorIndex + 1).trim();
  if (!value) return null;

  return (
    <p key={key} className="resume-paragraph" style={{ margin: '0 0 6px', color: theme.body }}>
      <span style={{ fontWeight: 700, color: theme.accent }}>{label}:</span>{' '}
      {renderHighlightedText(value, keywords)}
    </p>
  );
};

const ResumeDocument = forwardRef(function ResumeDocument({
  displayName,
  headline,
  contactItems = [],
  linkedinProfile,
  sections = [],
  rawText = '',
  template,       // kept for API compatibility; ignored — always uses enterprise style
  highlightKeywords = [],
  preserveRawLayout = false,
}, ref) {
  const cleanName = (displayName || 'Resume').trim();
  const safeLinkedin = linkedinProfile && /linkedin\.com|github\.com/i.test(linkedinProfile) ? linkedinProfile : null;
  const contacts = [...new Set([...contactItems, safeLinkedin]
    .filter(Boolean)
    .map(formatContactItem)
    .filter(Boolean))];
  const hasSections = Array.isArray(sections) && sections.length > 0;
  const theme = getTemplateTheme();

  return (
    <div
      ref={ref}
      className="ats-resume-document"
      style={{
        width: '100%',
        maxWidth: '794px',
        minHeight: '1123px',
        margin: '0 auto',
        padding: '44px 52px 42px',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: theme.strong,
        fontFamily: FONT_STACK,
      }}
    >
      {preserveRawLayout ? (
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: '11.35px',
            lineHeight: 1.65,
            color: theme.body,
          }}
        >
          {rawText}
        </div>
      ) : (
        <>
          <header className="resume-header" style={{ textAlign: 'center', marginBottom: '22px', paddingBottom: '16px', borderBottom: `2px solid ${theme.border}` }}>
            <h1 className="resume-name" style={{ margin: 0, fontSize: '28px', lineHeight: 1.05, fontWeight: 700, letterSpacing: '0.03em', color: theme.strong }}>
              {cleanName}
            </h1>
            {headline && (
              <p className="resume-headline" style={{ margin: '6px 0 0', fontSize: '11.5px', lineHeight: 1.4, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.accent }}>
                {headline}
              </p>
            )}
            {contacts.length > 0 && (
              <div className="resume-contact-row" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 14px', marginTop: '8px', fontSize: '10.6px', lineHeight: 1.4, color: theme.muted }}>
                {contacts.map((contact, index) => (
                  <span key={`${contact}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
                    {index > 0 && (
                      <span aria-hidden style={{ width: '4px', height: '4px', borderRadius: '999px', background: theme.dot }} />
                    )}
                    <span style={{ whiteSpace: 'nowrap' }}>{contact}</span>
                  </span>
                ))}
              </div>
            )}
          </header>

          {hasSections ? sections.map((section, sectionIndex) => (
            <section key={`${section.heading}-${sectionIndex}`} className="resume-section" style={{ margin: '0 0 18px', pageBreakInside: 'avoid' }}>
              <div className="resume-section-heading" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <h2 className="resume-section-title" style={{ margin: 0, fontSize: '10.8px', lineHeight: 1.2, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.headingColor }}>
                  {cleanHeading(section.heading)}
                </h2>
                <span className="resume-section-rule" style={{ flex: 1, height: '1px', background: theme.border }} />
              </div>
              <div className="resume-section-body" style={{ fontSize: '11.35px', lineHeight: 1.62, color: theme.body }}>
                {(section.lines || []).map((line, lineIndex) => {
                  const text = normalizeLine(line);
                  if (!text) return <div key={lineIndex} className="resume-spacer" style={{ height: '7px' }} />;

                  if (isBulletLine(text)) {
                    return (
                      <div key={lineIndex} className="resume-bullet" style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: '9px', margin: '0 0 6px', paddingLeft: '4px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <span className="resume-bullet-dot" style={{ fontSize: '11px', lineHeight: 1.45, color: theme.accent }}>•</span>
                        <span>{renderHighlightedText(stripBullet(text), highlightKeywords)}</span>
                      </div>
                    );
                  }

                  if (isJobHeaderLine(text)) {
                    const { primary, meta } = splitJobHeaderLine(text);
                    return (
                      <div key={lineIndex} className="resume-job-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px 14px', flexWrap: 'wrap', margin: '10px 0 4px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <p className="resume-job-line" style={{ margin: 0, fontSize: '12.2px', fontWeight: 700, color: theme.strong, flex: '1 1 320px' }}>
                          {renderHighlightedText(primary, highlightKeywords)}
                        </p>
                        {meta && (
                          <span className="resume-job-meta" style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.03em', color: theme.muted, whiteSpace: 'nowrap' }}>
                            {meta}
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (isSubHeadingLine(text)) {
                    return <p key={lineIndex} className="resume-subheading" style={{ margin: '8px 0 4px', fontSize: '10.6px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.accent }}>{text.replace(/:$/, '')}</p>;
                  }

                  if (isLabelValueLine(text)) {
                    return renderLabelValueLine(text, lineIndex, highlightKeywords, theme);
                  }

                  return <p key={lineIndex} className="resume-paragraph" style={{ margin: '0 0 6px' }}>{renderHighlightedText(text, highlightKeywords)}</p>;
                })}
              </div>
            </section>
          )) : (
            <div className="resume-section-body" style={{ fontSize: '11.35px', lineHeight: 1.62, whiteSpace: 'pre-line', color: theme.body }}>
              {rawText}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default ResumeDocument;