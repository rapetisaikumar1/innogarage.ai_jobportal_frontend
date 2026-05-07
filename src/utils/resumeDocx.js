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
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  SectionType,
  UnderlineType,
} from 'docx';
import { saveAs } from 'file-saver';

// ── Parse raw resume text into sections (same logic used by JobListings) ────────
function parseResumeSectionsForDocx(text) {
  if (!text) return { name: '', contact: '', sections: [] };

  const lines = text.split('\n');
  const sectionHeaders =
    /^\s*(PROFESSIONAL\s*SUMMARY|SUMMARY|OBJECTIVE|PROFESSIONAL\s*EXPERIENCE|EXPERIENCE|WORK\s*EXPERIENCE|EDUCATION|CORE\s*SKILLS|SKILLS|KEY\s*SKILLS|TECHNICAL\s*SKILLS|CERTIFICATIONS?|PROJECT\s*HIGHLIGHTS|SELECTED\s*PROJECTS|PROJECTS|ACHIEVEMENTS|AWARDS|LANGUAGES|INTERESTS|REFERENCES|PROFESSIONAL\s*PROFILE|PROFILE|QUALIFICATIONS|CORE\s*COMPETENCIES)\s*:?\s*$/i;

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
    size = 20, // half-points (20 = 10pt)
    color = '000000',
    spacing = { after: 60 },
    alignment = AlignmentType.LEFT,
    indent = undefined,
    underline = false,
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
        underline: underline ? { type: UnderlineType.SINGLE } : undefined,
      }),
    ],
  });
}

function makeSectionHeading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: '2563EB', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22,
        color: '1E3A5F',
        allCaps: true,
      }),
    ],
  });
}

function makeBullet(text) {
  const cleaned = text.replace(/^[-•*▪▸➤►◆]\s*/, '').trim();
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.15) },
    children: [
      new TextRun({ text: '• ', bold: false, size: 20, color: '2563EB' }),
      new TextRun({ text: cleaned, size: 20, color: '111827' }),
    ],
  });
}

function isBulletLine(line) {
  return /^[-•*▪▸➤►◆]\s+/.test(line.trim()) || /^\s{2,}[-•]/.test(line);
}

function isJobHeader(line) {
  // Lines that look like job titles + dates: "Acme Corp  |  Jan 2020 – Dec 2022"
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current)\b/i.test(line) &&
    line.length < 120;
}

// ── Main export ──────────────────────────────────────────────────────────────────
export async function downloadResumeAsDocx(resumeText, candidateName) {
  const { name, contact, sections } = parseResumeSectionsForDocx(resumeText);
  const displayName = candidateName || name || 'Resume';

  const docChildren = [];

  // ── Header: Name ─────────────────────────────────────────────────────────────
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: displayName,
          bold: true,
          size: 36,
          color: '1E3A5F',
        }),
      ],
    }),
  );

  // ── Header: Contact line ──────────────────────────────────────────────────────
  if (contact) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: contact, size: 18, color: '4B5563' })],
      }),
    );
  }

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
        // Bold job-header lines (company name + date range)
        docChildren.push(
          makeParagraph(t, { bold: true, size: 20, color: '111827', spacing: { before: 120, after: 40 } }),
        );
      } else {
        docChildren.push(makeParagraph(t, { size: 20, color: '374151', spacing: { after: 40 } }));
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
  saveAs(blob, `${displayName.replace(/\s+/g, '_')}_Resume.docx`);
}
