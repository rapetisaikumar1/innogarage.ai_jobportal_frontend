/**
 * resumeDocx.js
 * Generates a proper OOXML .docx file from a parsed resume text.
 * Uses the `docx` library so the output is readable by Pages, LibreOffice, Word, etc.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  SectionType,
} from 'docx';
import { saveAs } from 'file-saver';

const MONTH_PATTERN = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*';
const YEAR_PATTERN = '(?:19|20)\\d{2}';
const DATE_POINT_PATTERN = `(?:${MONTH_PATTERN}\\s+)?${YEAR_PATTERN}|Present|Current`;
const DATE_RANGE_PATTERN = new RegExp(`(${DATE_POINT_PATTERN})\\s*(?:-|–|to)\\s*(${DATE_POINT_PATTERN})$`, 'i');
const ACCENT_COLOR = '1F3B5B';
const BODY_COLOR = '1F2937';
const MUTED_COLOR = '5B6472';
const RULE_COLOR = 'D7DEE8';

// ── Parse raw resume text into sections (same logic used by JobListings) ────────
export function parseResumeSectionsForDocx(text) {
  if (!text) return { name: '', contact: '', sections: [] };

  const lines = text.split('\n');
  const sectionHeaders =
    /^\s*(PROFESSIONAL\s*SUMMARY|SUMMARY|OBJECTIVE|PROFESSIONAL\s*EXPERIENCE|EXPERIENCE|WORK\s*EXPERIENCE|WORK\s*HISTORY|EMPLOYMENT\s*HISTORY|EDUCATION|CORE\s*SKILLS|SKILLS|KEY\s*SKILLS|TECHNICAL\s*SKILLS|CERTIFICATIONS?|PROJECT\s*HIGHLIGHTS|SELECTED\s*PROJECTS|PROJECTS|ACHIEVEMENTS|AWARDS|LANGUAGES|INTERESTS|REFERENCES|PROFESSIONAL\s*PROFILE|PROFILE|QUALIFICATIONS|CORE\s*COMPETENCIES|AREAS\s*OF\s*EXPERTISE|TECHNOLOGIES)\s*:?\s*$/i;

  const isAllCapsHeading = (line) => {
    const t = line.trim();
    if (t.length < 3 || t.length > 70) return false;
    if (/[.!?;,]$/.test(t)) return false;
    const letters = t.replace(/[^A-Za-z]/g, '');
    if (letters.length < 3) return false;
    const upper = (letters.match(/[A-Z]/g) || []).length;
    return upper / letters.length >= 0.85 && t.split(/\s+/).length <= 8;
  };

  const isContactLine = (line) => {
    const l = line.trim();
    return (
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(l) ||
      /(\+?\(?\d[\d\s\-().]{6,}\d)/.test(l) ||
      /linkedin\.com/i.test(l)
    );
  };

  let sections = [];
  let currentSection = null;
  let headerLines = [];
  let foundFirst = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection) currentSection.lines.push('');
      continue;
    }
    if (/^[─━═\-_~]{3,}$/.test(trimmed)) continue;

    if (sectionHeaders.test(trimmed) || isAllCapsHeading(trimmed)) {
      foundFirst = true;
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: trimmed.replace(/:$/, '').trim().toUpperCase(), lines: [] };
    } else if (!foundFirst) {
      headerLines.push(trimmed);
    } else {
      if (!currentSection) currentSection = { heading: 'DETAILS', lines: [] };
      currentSection.lines.push(trimmed);
    }
  }
  if (currentSection) sections.push(currentSection);

  // Extract name (first non-contact, non-empty header line)
  const name = headerLines.find(l => !isContactLine(l) && l.length < 60) || '';
  const contact = headerLines.filter(l => isContactLine(l) || l !== name).join('  |  ');

  return { name, contact, sections };
}

// ── Build a docx Paragraph from a line of text ──────────────────────────────────
function makeParagraph(text, opts = {}) {
  const {
    bold = false,
    size = 21,
    color = BODY_COLOR,
    spacing = { after: 65 },
    alignment = AlignmentType.LEFT,
    indent = undefined,
  } = opts;

  return new Paragraph({
    alignment,
    spacing,
    indent,
    children: [
      new TextRun({
        text,
        bold,
        size,
        color,
      }),
    ],
  });
}

function makeRun(text, opts = {}) {
  return new TextRun({
    text,
    bold: opts.bold || false,
    size: opts.size || 21,
    color: opts.color || BODY_COLOR,
    italics: opts.italics || false,
    allCaps: opts.allCaps || false,
  });
}

function makeCompositeParagraph(children, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: opts.spacing || { after: 65 },
    indent: opts.indent,
    border: opts.border,
    children,
  });
}

function makeSectionHeading(text) {
  return makeCompositeParagraph(
    [
      makeRun(text.toUpperCase(), {
        bold: true,
        size: 20,
        color: ACCENT_COLOR,
        allCaps: true,
      }),
    ],
    {
      spacing: { before: 220, after: 90 },
      border: {
        bottom: { color: RULE_COLOR, space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
    },
  );
}

function makeBullet(text) {
  const cleaned = text.replace(/^[-•*▪▸➤►◆]\s*/, '').trim();
  return makeCompositeParagraph(
    [
      makeRun('• ', { size: 20, color: ACCENT_COLOR }),
      makeRun(cleaned, { size: 21, color: BODY_COLOR }),
    ],
    {
      spacing: { after: 55 },
      indent: { left: convertInchesToTwip(0.22), hanging: convertInchesToTwip(0.16) },
    },
  );
}

function isBulletLine(line) {
  return /^[-•*▪▸➤►◆]\s+/.test(line.trim()) || /^\s{2,}[-•]/.test(line);
}

function isJobHeader(line) {
  const text = line.trim();
  if (!text || text.length > 160 || /[.!?]$/.test(text)) return false;
  if (/\|/.test(text) && /\b(?:19|20)\d{2}\b|present|current/i.test(text)) return true;
  if (DATE_RANGE_PATTERN.test(text)) return true;
  return /\b(developer|engineer|architect|consultant|analyst|lead|manager|specialist|administrator|designer)\b/i.test(text)
    && /\b(company|inc|llc|ltd|corp|solutions|technologies|systems|services)\b/i.test(text);
}

function isSubHeadingLine(line) {
  const text = line.trim();
  if (!text || text.length > 80 || /[.!?]$/.test(text) || isBulletLine(text)) return false;
  if (/^(key\s+contributions?|responsibilities|achievements|projects?|technical\s+environment|environment|tools|technologies|platforms?|clients?|deliverables|selected\s+highlights?)\s*:?$/i.test(text)) return true;
  return /^[A-Z][A-Za-z\s/&-]{2,}:$/.test(text);
}

function isLabelValueLine(line) {
  return /^(role|location|client|domain|tools|technologies|stack|platform|environment|focus|team size|employment type)\s*:/i.test(line.trim());
}

function splitJobHeaderLine(line) {
  const text = line.trim();
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
}

function makeJobHeaderParagraph(text) {
  const { primary, meta } = splitJobHeaderLine(text);
  const children = [makeRun(primary || text, { bold: true, size: 22, color: ACCENT_COLOR })];

  if (meta) {
    children.push(makeRun('  ', { size: 18, color: MUTED_COLOR }));
    children.push(makeRun(meta, { size: 18, color: MUTED_COLOR }));
  }

  return makeCompositeParagraph(children, {
    spacing: { before: 120, after: 45 },
  });
}

function makeSubHeadingParagraph(text) {
  return makeCompositeParagraph(
    [makeRun(text.replace(/:$/, '').toUpperCase(), { bold: true, size: 18, color: ACCENT_COLOR, allCaps: true })],
    { spacing: { before: 80, after: 35 } },
  );
}

function makeLabelValueParagraph(text) {
  const separatorIndex = text.indexOf(':');
  if (separatorIndex === -1) return makeParagraph(text);

  const label = text.slice(0, separatorIndex).trim();
  const value = text.slice(separatorIndex + 1).trim();

  return makeCompositeParagraph(
    [
      makeRun(`${label}: `, { bold: true, size: 21, color: ACCENT_COLOR }),
      makeRun(value, { size: 21, color: BODY_COLOR }),
    ],
    { spacing: { after: 55 } },
  );
}

function splitContactLine(contact) {
  return String(contact || '')
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatContactItem(item) {
  return String(item || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
    .trim();
}

function resolveContactItems(contact, contactItems = [], linkedinProfile = '') {
  return [...new Set([
    ...contactItems,
    linkedinProfile,
    ...splitContactLine(contact),
  ].map(formatContactItem).filter(Boolean))];
}

function buildRawLayoutParagraphs(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return new Paragraph({ spacing: { after: 80 } });
      }

      return new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: line,
            size: 21,
            color: BODY_COLOR,
          }),
        ],
      });
    });
}

// ── Main export ──────────────────────────────────────────────────────────────────
export async function downloadResumeAsDocx(resumeText, candidateName, options = {}) {
  const {
    preserveRawLayout = false,
    fileBaseName = null,
    headline = '',
    contactItems = [],
    linkedinProfile = '',
  } = options;
  const { name, contact, sections } = parseResumeSectionsForDocx(resumeText);
  const displayName = candidateName || name || 'Resume';
  const resolvedHeadline = String(headline || '').trim();
  const resolvedContacts = resolveContactItems(contact, contactItems, linkedinProfile);
  const resolvedFileBaseName = (fileBaseName || `${displayName.replace(/\s+/g, '_')}_Resume`).replace(/[^a-zA-Z0-9._-]+/g, '_');

  const docChildren = [];

  if (preserveRawLayout) {
    docChildren.push(...buildRawLayoutParagraphs(resumeText));
  } else {

  // ── Header: Name ─────────────────────────────────────────────────────────────
  docChildren.push(
    makeCompositeParagraph(
      [
        makeRun(displayName, {
          bold: true,
          size: 36,
          color: ACCENT_COLOR,
        }),
      ],
      {
        alignment: AlignmentType.CENTER,
        spacing: { after: 45 },
      },
    ),
  );

  if (resolvedHeadline) {
    docChildren.push(
      makeCompositeParagraph(
        [
          makeRun(resolvedHeadline.toUpperCase(), {
            bold: true,
            size: 18,
            color: ACCENT_COLOR,
            allCaps: true,
          }),
        ],
        {
          alignment: AlignmentType.CENTER,
          spacing: { after: 45 },
        },
      ),
    );
  }

  // ── Header: Contact line ──────────────────────────────────────────────────────
  if (resolvedContacts.length > 0) {
    docChildren.push(
      makeCompositeParagraph(
        [makeRun(resolvedContacts.join('  •  '), { size: 18, color: MUTED_COLOR })],
        {
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        },
      ),
    );
  }

  docChildren.push(
    makeCompositeParagraph(
      [makeRun('', { size: 2, color: RULE_COLOR })],
      {
        spacing: { after: 120 },
        border: {
          bottom: { color: RULE_COLOR, space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
      },
    ),
  );

  // ── Sections ─────────────────────────────────────────────────────────────────
  for (const section of sections) {
    docChildren.push(makeSectionHeading(section.heading));

    for (const line of section.lines) {
      const t = line.trim();
      if (!t) {
        docChildren.push(new Paragraph({ spacing: { after: 20 } }));
        continue;
      }
      if (isBulletLine(t)) {
        docChildren.push(makeBullet(t));
      } else if (isJobHeader(t)) {
        docChildren.push(makeJobHeaderParagraph(t));
      } else if (isSubHeadingLine(t)) {
        docChildren.push(makeSubHeadingParagraph(t));
      } else if (isLabelValueLine(t)) {
        docChildren.push(makeLabelValueParagraph(t));
      } else {
        docChildren.push(makeParagraph(t, { size: 21, color: BODY_COLOR, spacing: { after: 55 } }));
      }
    }
  }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: {
              top: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.85),
              right: convertInchesToTwip(0.85),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${resolvedFileBaseName}.docx`);
}
