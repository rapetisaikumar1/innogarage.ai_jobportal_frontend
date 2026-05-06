import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import ResumeDocument, { RESUME_WORD_STYLES } from '../../components/resume/ResumeDocument';
import {
  Search, ExternalLink, Briefcase, RefreshCw, X, FileText, AlertTriangle,
  Clock, Sparkles, MapPin, Building2, Bookmark, ChevronLeft, ChevronRight, Info, CheckCircle2,
  Eye, Download, Crown, Lock
} from 'lucide-react';

/* ── avatar bg palette ── */
const AVATAR_BG = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600',
  'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600', 'bg-teal-600',
  'bg-indigo-600', 'bg-pink-600', 'bg-sky-600', 'bg-lime-600',
];
const avatarBg = (name) => AVATAR_BG[Math.abs([...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_BG.length];

/* ── extract role/title from JD text ── */
const isNotATitle = (s) => {
  if (!s || s.length < 3) return true;
  const lower = s.toLowerCase().trim();
  return /^(this is|we are|our |the company|company description|about |join |apply|click|please|note:|remote|hybrid|onsite|on-site|in-office)/i.test(lower)
    || /^(and |or |but |also |then )/i.test(lower)
    || lower.length < 4;
};

const cleanRoleTitle = (raw) => {
  if (!raw) return raw;
  let t = raw.trim();
  // Strip "Seeking a ...", "Looking for a ..." wrappers → keep what follows
  t = t.replace(/^(?:seeking|looking\s+for|hiring)\s+(?:a|an)\s+/i, '');
  // Strip leading articles
  t = t.replace(/^(?:an?|the)\s+/i, '');
  // Strip leading filler adjectives ONLY when followed by a recognizable title word
  t = t.replace(/^(?:experienced|highly\s+skilled|skilled|seasoned|motivated|talented|dedicated|passionate|detail[- ]?oriented|results[- ]?driven|innovative|creative|dynamic|proactive|enthusiastic|driven|ambitious|proficient|certified|licensed|qualified|accomplished|senior|junior|mid[- ]?level|lead|principal|staff|entry[- ]?level|associate|and\s+(?:innovative|experienced|creative|dynamic|motivated|skilled))\s+/gi, '');
  // One more pass for stacked adjectives
  t = t.replace(/^(?:experienced|highly\s+skilled|skilled|seasoned|motivated|talented|dedicated|passionate|detail[- ]?oriented|results[- ]?driven|innovative|creative|dynamic|proactive|enthusiastic|driven|senior|junior|mid[- ]?level|lead|principal|staff|entry[- ]?level|associate)\s+/gi, '');
  // Strip dangling leading conjunctions after adjective removal
  t = t.replace(/^(?:and|or|but|who|that|&)\s+/i, '');
  // Trim trailing clauses
  t = t.replace(/\s+(?:with\s+(?:strong|extensive|deep|expertise|experience|proficiency|knowledge|a\s+focus)|who\s+will|to\s+join|responsible\s+for|that\s+will|having|capable\s+of)\b.*/i, '');
  t = t.trim().slice(0, 80);
  return t || raw.trim().slice(0, 80);
};

const extractRole = (job) => {
  // 1. Use job_title if it looks valid
  if (job.job_title && !isNotATitle(job.job_title)) {
    const cleaned = cleanRoleTitle(job.job_title);
    if (!isNotATitle(cleaned)) return cleaned;
  }
  // 2. Try explicit role/title patterns in JD
  const jd = job.jd || '';
  const roleMatch = jd.match(/(?:Role|Position|Job\s*Title|Title)\s*[:–\-]\s*(.+)/i);
  if (roleMatch) {
    const candidate = cleanRoleTitle(roleMatch[1].split(/[\n.]/)[0].trim());
    if (!isNotATitle(candidate)) return candidate;
  }
  // 3. Try "hiring/seeking" patterns
  const hiringMatch = jd.match(/(?:hiring|seeking|looking for)\s+(?:a|an)?\s*(.+?)(?:\.|\n|$)/i);
  if (hiringMatch) {
    const candidate = cleanRoleTitle(hiringMatch[1].trim());
    if (!isNotATitle(candidate)) return candidate;
  }
  // 4. Fallback to first meaningful line of JD (skip generic lines)
  const lines = jd.split(/[\n.]/).map(l => l.trim()).filter(l => l.length > 5);
  for (const line of lines) {
    if (!isNotATitle(line)) {
      const candidate = cleanRoleTitle(line);
      if (!isNotATitle(candidate) && candidate.length > 5) return candidate;
    }
  }
  // 5. Final fallback — use raw job_title if it exists at all, else employer
  if (job.job_title && job.job_title.trim().length > 3) return job.job_title.trim().slice(0, 80);
  return job.employer_name || 'View Details';
};

const hasCompleteGeneratedResume = (text) => {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 1200) return false;
  // Only require PROFESSIONAL SUMMARY + an EXPERIENCE section — skills section name varies by resume format
  return /PROFESSIONAL\s+SUMMARY/i.test(clean)
    && /(?:PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|EXPERIENCE)/i.test(clean);
};

const formatDate = (ts) => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    if (diff < 30) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
};

/* ── parse JD into structured sections ── */
const parseJDSections = (jdText) => {
  if (!jdText) return [];
  const sectionPatterns = /^\s*(About\b|Company\s*Overview|Overview|Position\s*Description|Job\s*Description|Description|Responsibilities|Key\s*Responsibilities|What\s*You|What\s*We|Who\s*You|Your\s*Role|Role\s*Overview|Requirements|Qualifications|Required|Preferred|Desired|Minimum|Nice\s*to\s*Have|Skills|Technical\s*Skills|Key\s*Skills|Core\s*Competencies|Experience|Education|Benefits|Compensation|Salary|How\s*to\s*Apply|Summary|In\s*this|Our\s*Team|The\s*Role|The\s*Position|We\s*are|Location|Job\s*Type|Employment|Duties|Essential\s*Functions|Scope|Objectives?|Mission|Purpose|Why\s*Join|Perks|Culture|Team|About\s*Us|About\s*the|Day\s*to\s*Day|What\s*You.*Bring|What\s*You.*Do|What\s*You.*Need|You\s*Will|You\s*Should|Must\s*Have|Bonus|Additional|Tools|Technology|Tech\s*Stack|Stack|Platforms?|Certifications?|Clearance|Travel|Reports?\s*To|Work\s*Environment|Physical|EEO|Equal)[^\n]*$/im;
  const lines = jdText.split('\n');
  const sections = [];
  let currentSection = { heading: 'Overview', lines: [] };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { if (currentSection.lines.length > 0) currentSection.lines.push(''); continue; }
    const isHeading = sectionPatterns.test(trimmed) || /^[A-Z][A-Z\s&/,\-–]{2,60}:?\s*$/.test(trimmed) || /^[A-Z][^.!?]{2,60}:$/.test(trimmed);
    if (isHeading && currentSection.lines.length > 0) {
      sections.push({ ...currentSection, lines: [...currentSection.lines] });
      currentSection = { heading: trimmed.replace(/:+\s*\*?$/, '').trim(), lines: [] };
    } else if (isHeading && currentSection.lines.length === 0) {
      currentSection.heading = trimmed.replace(/:+\s*\*?$/, '').trim();
    } else {
      currentSection.lines.push(trimmed);
    }
  }
  if (currentSection.lines.length > 0) sections.push(currentSection);
  return sections.map(s => ({ ...s, lines: s.lines.join('\n').trim().split('\n') })).filter(s => s.lines.some(l => l.trim()));
};

/* ── extract skills from JD ── */
const extractSkillsFromJD = (jdText) => {
  if (!jdText) return [];
  const techPatterns = /\b(Java|Python|JavaScript|TypeScript|React|Angular|Vue|Node\.?js|Express|Spring|Django|Flask|AWS|Azure|GCP|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|GraphQL|REST|API|Git|CI\/CD|Agile|Scrum|HTML|CSS|Tailwind|Bootstrap|C\+\+|C#|\.NET|Go|Rust|Swift|Kotlin|PHP|Ruby|Rails|Laravel|TensorFlow|PyTorch|Machine Learning|AI|Data Science|DevOps|Linux|Terraform|Jenkins|Elasticsearch|Kafka|RabbitMQ|Microservices)\b/gi;
  const matches = jdText.match(techPatterns) || [];
  return [...new Set(matches.map(m => m.trim()))].slice(0, 12);
};

/* ── parseTags helper ── */
const parseTags = (str) => {
  if (!str) return [];
  // Handle JSON arrays (from JS search mode)
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean).slice(0, 10);
  } catch {}
  // Fallback: comma/semicolon separated
  return str.split(/[,;]+/).map((s) => s.replace(/^[\s\-•]+/, '').trim()).filter(Boolean).slice(0, 10);
};

const PAGE_SIZE = 8;

/* ── parse resume text into structured sections ── */
const parseResumeSections = (text, candidateName, sheetCandidateName) => {
  if (!text) return { contact: '', sections: [] };
  // Build variations of candidate name to strip from content (both auth name and sheet name)
  const nameVariants = new Set();
  const nameParts = new Set();
  const addName = (raw) => {
    if (!raw) return;
    const n = raw.trim().toLowerCase();
    if (!n) return;
    nameVariants.add(n);
    const parts = n.split(/\s+/);
    parts.forEach(p => { if (p.length >= 2) nameParts.add(p); });
    if (parts.length >= 2) {
      nameVariants.add(parts.join(' '));
      nameVariants.add(parts[0] + ' ' + parts[parts.length - 1]);
      for (let i = 0; i < parts.length; i++)
        for (let j = i + 1; j < parts.length; j++)
          nameVariants.add(parts[i] + ' ' + parts[j]);
    }
  };
  addName(candidateName);
  addName(sheetCandidateName);

  const isNameLine = (line) => {
    const lower = line.trim().toLowerCase().replace(/[.,\-]+$/, '').trim();
    if (!lower) return false;
    for (const v of nameVariants) if (lower === v) return true;
    // Fuzzy: if >=60% of words match known name parts and line is 1-4 words
    if (nameParts.size >= 2) {
      const words = lower.split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 1 && words.length <= 4) {
        const matched = words.filter(w => nameParts.has(w)).length;
        if (matched >= Math.ceil(words.length * 0.6)) return true;
      }
    }
    return false;
  };

  // Heuristic: a line that is ONLY 1-3 capitalized words with no technical keywords is likely a person name
  const looksLikePersonName = (line) => {
    const t = line.trim();
    if (!/^[A-Z][a-zA-Z\-']+(\s+[A-Z][a-zA-Z\-']+){0,3}$/.test(t) && !/^[A-Z\-']+(\s+[A-Z\-']+){0,3}$/.test(t)) return false;
    if (/\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|coordinator|director|lead|admin|officer|scientist|intern|assistant|associate|senior|junior|staff|principal|head|chief|vp|cto|ceo|cfo|coo)\b/i.test(t)) return false;
    return true;
  };
  const stripName = (line) => {
    if (!nameVariants.size) return line;
    let result = line;
    for (const v of nameVariants) {
      const idx = result.toLowerCase().indexOf(v);
      if (idx === 0) {
        result = result.slice(v.length).trim();
      }
    }
    return result;
  };

  const lines = text.split('\n');
  const sectionHeaders = /^\s*(PROFESSIONAL\s*SUMMARY|SUMMARY|OBJECTIVE|PROFESSIONAL\s*EXPERIENCE|EXPERIENCE|WORK\s*EXPERIENCE|EDUCATION|CORE\s*SKILLS|SKILLS|KEY\s*SKILLS|TECHNICAL\s*SKILLS|CERTIFICATIONS|PROJECT\s*HIGHLIGHTS|SELECTED\s*PROJECTS|PROJECTS|ACHIEVEMENTS|AWARDS|LANGUAGES|INTERESTS|REFERENCES|ATS\s*KEYWORDS|CONTACT\s*INFORMATION|PROFESSIONAL\s*PROFILE|PROFILE|QUALIFICATIONS|CORE\s*COMPETENCIES|NOTES?\s*(?:ON\s*)?ADDRESSED\s*GAPS?|ADDITIONAL\s*NOTES?|NOTES?)\s*:?\s*$/i;
  // Also treat any short all-uppercase line as a section heading (handles user's custom section names)
  const isAllCapsHeading = (line) => {
    const t = line.trim();
    if (t.length < 3 || t.length > 70) return false;
    if (/[.!?;,]$/.test(t)) return false;
    if (/[|]/.test(t)) return false; // pipe = job header line, not a section heading
    if (/\b(19|20)\d{2}\b/.test(t)) return false; // has year = job header line
    const letters = t.replace(/[^A-Za-z]/g, '');
    if (letters.length < 3) return false;
    const upperCount = (letters.match(/[A-Z]/g) || []).length;
    return upperCount / letters.length >= 0.85 && t.split(/\s+/).length <= 8;
  };
  const sections = [];
  let currentSection = null;
  const contactLines = [];
  let roleTitle = '';
  let foundFirstSection = false;

  // Detect contact info lines (phone/email) to skip from resume text header
  const isContactInfoLine = (line) => {
    const l = line.trim();
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(l);
    const hasPhone = /(\+?\(?\d[\d\s\-().]{6,}\d)/i.test(l);
    if (hasEmail || hasPhone) {
      // If the line is mostly contact info (phone, email, separators)
      const withoutContact = l
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '')
        .replace(/\(?\+?\d[\d\s\-().]{6,}\d/g, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[|,;\s]/g, '')
        .trim();
      if (withoutContact.length < 5) return true;
      // Remaining text is just a city/state location — still a contact header line
      if (/^[A-Za-z\s]+,?\s*[A-Z]{2}$/.test(withoutContact) || /^[A-Za-z\s]+$/.test(withoutContact) && withoutContact.length < 20) return true;
    }
    return false;
  };

  // Detect location-only header lines to skip (e.g. "Remote (Arizona, USA)" or "Phoenix, AZ")
  const isLocationLine = (line) => {
    if (/^\s*(remote|on-?site|hybrid)?\s*\(?.*(usa|india|uk|canada|germany|australia|arizona|california|texas|new york|florida|illinois|ohio|georgia|north carolina|virginia|washington|massachusetts|colorado|oregon|utah|nevada|michigan|minnesota|maryland|wisconsin|tennessee|missouri|connecticut|iowa|kansas|arkansas|nebraska|idaho|hawaii|alabama|louisiana|oklahoma|kentucky|south carolina|mississippi|pennsylvania|new jersey)[^a-z]*\)?\s*$/i.test(line)) return true;
    // City, ST (2-letter US state abbreviation)
    if (/^\s*[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*$/.test(line.trim())) return true;
    return false;
  };

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) {
      if (currentSection) currentSection.lines.push('');
      continue;
    }
    // Skip decorative divider lines (─, ━, ═, -, etc.)
    if (/^[─━═\-_~]{3,}$/.test(trimmed)) continue;
    // Skip lines that are exactly the candidate name
    if (isNameLine(trimmed)) continue;
    // Skip lines that look like a person name (1-3 capitalized words, no job keywords)
    if (!foundFirstSection && looksLikePersonName(trimmed)) continue;
    // Skip location header lines
    if (!foundFirstSection && isLocationLine(trimmed)) continue;
    // Skip phone/email contact lines in header area (profile info used instead)
    if (!foundFirstSection && isContactInfoLine(trimmed)) continue;
    // Strip candidate name from the beginning of lines
    trimmed = stripName(trimmed);
    if (!trimmed) continue;
    if (sectionHeaders.test(trimmed) || isAllCapsHeading(trimmed)) {
      foundFirstSection = true;
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: trimmed.replace(/:$/, '').trim().toUpperCase(), lines: [] };
    } else if (!foundFirstSection) {
      // Before the first section heading: capture only the role/title line for the header.
      // Discard name lines, contact lines, location lines, and any URL lines entirely.
      const isUrlLine = /^https?:\/\/|^www\.|linkedin\.com|github\.com/i.test(trimmed);
      const hasEmailOrPhone = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)
        || /(\+?\(?\d[\d\s\-().]{6,}\d)/.test(trimmed);
      if (!isUrlLine && !hasEmailOrPhone && !isNameLine(trimmed) && !isLocationLine(trimmed)) {
        // Only capture the FIRST short non-contact line as roleTitle; discard everything else
        if (!roleTitle && trimmed.length <= 100) {
          roleTitle = trimmed;
        }
        // intentionally do NOT push to contactLines — discard silently
      }
    } else {
      if (!currentSection) currentSection = { heading: 'DETAILS', lines: [] };
      currentSection.lines.push(trimmed);
    }
  }
  if (currentSection) sections.push(currentSection);

  // Post-process: strip leading header-like lines from each section's content
  // (AI sometimes duplicates name/contact/location right after section headings)
  for (const section of sections) {
    let cut = 0;
    for (let i = 0; i < Math.min(section.lines.length, 8); i++) {
      const t = section.lines[i].trim();
      if (!t) { cut = i + 1; continue; }
      if (isNameLine(t) || looksLikePersonName(t) || isContactInfoLine(t) || isLocationLine(t)) { cut = i + 1; continue; }
      // City, XX (2-letter US state abbreviation) pattern
      if (/^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}$/.test(t)) { cut = i + 1; continue; }
      // Exact duplicate of captured roleTitle
      if (roleTitle && t.toLowerCase() === roleTitle.toLowerCase()) { cut = i + 1; continue; }
      // Lines containing phone numbers (name + phone combos like "Vinay 512-766-1239")
      if (/(\+?\(?\d[\d\s\-().]{6,}\d)/.test(t) && t.split(/\s+/).length <= 8) { cut = i + 1; continue; }
      // Lines containing email addresses mixed with other short text
      if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t) && t.split(/\s+/).length <= 8) { cut = i + 1; continue; }
      // Standalone job role/title line (short, has job-title keywords, no dates/years, no sentence ending)
      if (t.length <= 100 && !/[.!?]$/.test(t) && t.split(/\s+/).length <= 12 && !/\b\d{4}\b/.test(t) && /\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|coordinator|director|lead|administrator|officer|scientist|intern|assistant|associate|programmer|advisor|strategist|optimizer)\b/i.test(t)) { cut = i + 1; continue; }
      // URL-only lines (LinkedIn, GitHub, portfolio, chatgpt, etc.)
      if (/^(https?:\/\/|www\.|linkedin\.com|github\.com)/i.test(t)) { cut = i + 1; continue; }
      // Pipe-separated header line (e.g. "Phoenix, AZ | 512-766-1239 | email@test.com")
      if (/\|/.test(t)) {
        const hasPhoneInLine = /(\+?\(?\d[\d\s\-().]{6,}\d)/.test(t);
        const hasEmailInLine = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t);
        if (hasPhoneInLine || hasEmailInLine) { cut = i + 1; continue; }
        const parts = t.split(/\s*\|\s*/);
        const allHeader = parts.every(p => {
          const pt = p.trim();
          return !pt || /^[A-Z][a-zA-Z\s]+,?\s*[A-Z]{2}$/.test(pt) || /linkedin|github|http/i.test(pt) || pt.length < 3;
        });
        if (allHeader) { cut = i + 1; continue; }
      }
      break;
    }
    if (cut > 0) section.lines = section.lines.slice(cut);
  }

  // Remove notes sections and CONTACT INFORMATION sections (header already shows contact)
  const filteredSections = sections.filter(s =>
    !/^NOTES?/i.test(s.heading) &&
    !/^ADDITIONAL\s*NOTES?/i.test(s.heading) &&
    !/^ADDRESSED\s*GAPS?/i.test(s.heading) &&
    !/^CONTACT\s*INFORMATION$/i.test(s.heading) &&
    !/^ATS\s*KEYWORDS?/i.test(s.heading)
  );

  return { contact: contactLines.join('\n'), roleTitle, sections: filteredSections };
};

/* ── Extract role title from resume text (matches parseResumeSections logic) ── */
const extractResumeRoleTitle = (resumeText, candidateName, sheetCandidateName) => {
  if (!resumeText) return '';

  // Build name variants from BOTH authUser.fullName AND job.candidate_name
  const nameVariants = new Set();
  const nameParts = new Set(); // individual name words for fuzzy matching
  const addName = (raw) => {
    if (!raw) return;
    const n = raw.trim().toLowerCase();
    if (!n) return;
    nameVariants.add(n);
    const parts = n.split(/\s+/);
    parts.forEach(p => { if (p.length >= 2) nameParts.add(p); });
    if (parts.length >= 2) {
      nameVariants.add(parts.join(' '));
      nameVariants.add(parts[0] + ' ' + parts[parts.length - 1]);
      // All pair combos: first+middle, middle+last, etc.
      for (let i = 0; i < parts.length; i++)
        for (let j = i + 1; j < parts.length; j++)
          nameVariants.add(parts[i] + ' ' + parts[j]);
    }
  };
  addName(candidateName);
  addName(sheetCandidateName);

  // A line is a name if it exactly matches a name variant
  // OR if most of its words are known name parts (fuzzy)
  const isNameLine = (line) => {
    const lower = line.trim().toLowerCase().replace(/[.,\-]+$/, '').trim();
    if (!lower) return false;
    // Exact match
    for (const v of nameVariants) if (lower === v) return true;
    // Fuzzy: if >=60% of words in the line are in nameParts, and line is short (1-4 words)
    if (nameParts.size >= 2) {
      const words = lower.split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 1 && words.length <= 4) {
        const matched = words.filter(w => nameParts.has(w)).length;
        if (matched >= Math.ceil(words.length * 0.6)) return true;
      }
    }
    return false;
  };

  // Heuristic: a line that is ONLY 1-3 capitalized words with no technical keywords is likely a name
  const looksLikePersonName = (line) => {
    const t = line.trim();
    // Must be 1-4 words, each capitalized or ALL CAPS, no digits, no special chars except hyphen
    if (!/^[A-Z][a-zA-Z\-']+(\s+[A-Z][a-zA-Z\-']+){0,3}$/.test(t) && !/^[A-Z\-']+(\s+[A-Z\-']+){0,3}$/.test(t)) return false;
    // Must NOT contain common job-title keywords
    if (/\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|coordinator|director|lead|admin|officer|scientist|intern|assistant|associate|senior|junior|staff|principal|head|chief|vp|cto|ceo|cfo|coo)\b/i.test(t)) return false;
    return true;
  };

  const isContactInfoLine = (line) => {
    const l = line.trim();
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(l);
    const hasPhone = /(\+?\(?\d[\d\s\-().]{6,}\d)/i.test(l);
    if (hasEmail || hasPhone) {
      const rest = l.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '').replace(/\(?\+?\d[\d\s\-().]{6,}\d/g, '').replace(/[|,;\s]/g, '').trim();
      if (rest.length < 5) return true;
    }
    return false;
  };
  const isLocationLine = (line) => /^\s*(remote|on-?site|hybrid)?\s*\(?.*(?:usa|india|uk|canada|germany|australia|arizona|california|texas|new york|florida|illinois|ohio|georgia|north carolina|virginia|washington|massachusetts|colorado|oregon|utah|nevada|michigan|minnesota|maryland|wisconsin|tennessee|missouri|connecticut|iowa|kansas|arkansas|nebraska|idaho|hawaii|alabama|louisiana|oklahoma|kentucky|south carolina|mississippi|pennsylvania|new jersey)[^a-z]*\)?\s*$/i.test(line);
  const sectionHeaders = /^\s*(PROFESSIONAL\s*SUMMARY|SUMMARY|OBJECTIVE|PROFESSIONAL\s*EXPERIENCE|EXPERIENCE|WORK\s*EXPERIENCE|EDUCATION|CORE\s*SKILLS|SKILLS|KEY\s*SKILLS|TECHNICAL\s*SKILLS|CERTIFICATIONS|PROJECT\s*HIGHLIGHTS|SELECTED\s*PROJECTS|PROJECTS|ACHIEVEMENTS|AWARDS|LANGUAGES|INTERESTS|REFERENCES|ATS\s*KEYWORDS|CONTACT\s*INFORMATION|PROFESSIONAL\s*PROFILE|PROFILE|QUALIFICATIONS|CORE\s*COMPETENCIES)\s*:?\s*$/i;

  for (const line of resumeText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isNameLine(trimmed)) continue;
    if (looksLikePersonName(trimmed)) continue;
    if (isLocationLine(trimmed)) continue;
    if (isContactInfoLine(trimmed)) continue;
    if (sectionHeaders.test(trimmed)) break; // hit first section, no title found
    // Check for explicit (job title: ...) pattern
    const titleMatch = trimmed.match(/^\(?\s*(?:job\s*title\s*[:–\-]?)\s*(.+?)\s*\)?$/i);
    if (titleMatch) return titleMatch[1].trim();
    // If it looks like a title line (short, no email/phone)
    if (trimmed.length <= 80 && !/@/.test(trimmed) && !/^\(?\+/.test(trimmed)) {
      return trimmed;
    }
  }
  return '';
};

const JobListings = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringSearch, setTriggeringSearch] = useState(false);
  const [appliedLinks, setAppliedLinks] = useState(new Set());
  const [adminAppliedLinks, setAdminAppliedLinks] = useState(new Set());
  const [showDaysPopup, setShowDaysPopup] = useState(false);
  const [daysInput, setDaysInput] = useState('1');
  const [search, setSearch] = useState('');
  const [detailJob, setDetailJob] = useState(null);
  const [resumeJob, setResumeJob] = useState(null);
  const [resumeConfirmJob, setResumeConfirmJob] = useState(null);
  const [creatingResume, setCreatingResume] = useState(false);
  const [resumeViewMode, setResumeViewMode] = useState(false);
  const resumeRef = useRef(null);
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [waitingForJobs, setWaitingForJobs] = useState(false);
  const [usage, setUsage] = useState({ plan: 'free', used: 0, max: 5, label: 'Free' });

  const handleMarkApplied = async (job) => {
    const link = job.job_apply_link;
    if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) return;
    // Open the apply link FIRST (synchronous — avoids popup blocker)
    const win = window.open(link, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked — fallback to direct navigation
      const a = document.createElement('a');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    // Optimistically mark as applied
    setAppliedLinks(prev => {
      const next = new Set(prev);
      next.add(link);
      return next;
    });
    // Save to backend (fire-and-forget)
    try {
      await api.post('/jobs/external/mark-applied', {
        jobLink: link,
        employerName: job.employer_name,
        matchScore: job.match_score,
        jobTitle: extractRole(job),
      });
    } catch { /* best effort */ }
  };

  const fetchAppliedStatus = async () => {
    try {
      const { data } = await api.get('/jobs/external-applied-status');
      const apps = data.applications || [];
      setAppliedLinks(new Set(apps.map(a => a.jobLink)));
      setAdminAppliedLinks(new Set(apps.filter(a => a.appliedById).map(a => a.jobLink)));
    } catch { /* ignore */ }
  };

  const fetchUsage = async () => {
    try {
      const { data } = await api.get('/jobs/usage');
      setUsage(data);
    } catch { /* ignore */ }
  };

  const fetchMatchedJobs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/jobs/matched');
      setJobs(data.jobs || []);
    } catch (error) {
      toast.error('Failed to load job listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatchedJobs(); fetchAppliedStatus(); fetchUsage(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMatchedJobs(), fetchAppliedStatus(), fetchUsage()]);
    setRefreshing(false);
    toast.success('Job listings refreshed!');
  };

  const handleTriggerJobSearch = async (days) => {
    setShowDaysPopup(false);

    // Check limit on frontend too
    if (usage.used >= usage.max) {
      toast.error(`You've reached your ${usage.label} plan limit (${usage.max} searches/day). Upgrade for more!`);
      return;
    }

    setTriggeringSearch(true);
    setWaitingForJobs(true);
    try {
      const { data } = await api.post('/jobs/search', { days: String(days) });
      toast.success(data.message || 'Job search triggered!');
      // Update usage count locally
      setUsage(prev => ({ ...prev, used: prev.used + 1 }));

      if (Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        await fetchAppliedStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to trigger job search');
    } finally {
      setWaitingForJobs(false);
      setTriggeringSearch(false);
    }
  };

  const syncUpdatedJob = (updatedJob) => {
    if (!updatedJob) return;

    setJobs(prev => prev.map((job) => {
      const sameLink = updatedJob.job_apply_link && job.job_apply_link === updatedJob.job_apply_link;
      const sameId = updatedJob.id && job.id && job.id === updatedJob.id;
      return sameLink || sameId ? { ...job, ...updatedJob } : job;
    }));

    setDetailJob(prev => {
      if (!prev) return prev;
      const sameLink = updatedJob.job_apply_link && prev.job_apply_link === updatedJob.job_apply_link;
      const sameId = updatedJob.id && prev.id && prev.id === updatedJob.id;
      return sameLink || sameId ? { ...prev, ...updatedJob } : prev;
    });
  };

  const handleResumeClick = (job, options = {}) => {
    if (!job) return;
    if (options.closeDetails) setDetailJob(null);

    if (hasCompleteGeneratedResume(job.resume_text)) {
      setResumeJob(job);
      return;
    }

    setResumeConfirmJob(job);
  };

  const handleGenerateResume = async () => {
    if (!resumeConfirmJob || creatingResume) return;

    setCreatingResume(true);
    try {
      const { data } = await api.post('/jobs/resume/generate', resumeConfirmJob);
      const updatedJob = data.job;

      if (updatedJob) {
        syncUpdatedJob(updatedJob);
        setResumeJob(updatedJob);
      }

      toast.success(data.message || 'ATS resume created successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ATS resume');
    } finally {
      setCreatingResume(false);
      setResumeConfirmJob(null);
    }
  };

  const filteredJobs = useMemo(() => {
    let filtered = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((j) =>
        j.employer_name?.toLowerCase().includes(q) ||
        j.jd?.toLowerCase().includes(q) ||
        j.job_title?.toLowerCase().includes(q) ||
        j.match_summary?.toLowerCase().includes(q) ||
        j.strong_matches?.toLowerCase().includes(q)
      );
    }
    if (filterType === 'applied') filtered = filtered.filter((j) => !!(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    if (filterType === 'admin_apply') filtered = filtered.filter((j) => !!(j.job_apply_link && adminAppliedLinks.has(j.job_apply_link)));
    // Sort by score (highest first), then push applied jobs to the bottom
    const sorted = [...filtered].sort((a, b) => (parseInt(b.match_score) || 0) - (parseInt(a.match_score) || 0));
    const notApplied = sorted.filter(j => !(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    const applied = sorted.filter(j => !!(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    return [...notApplied, ...applied];
  }, [jobs, search, filterType, appliedLinks, adminAppliedLinks]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterType]);

  const toggleRow = (id) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginatedJobs.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedJobs.map(j => j.id)));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* Days Popup */}
      {showDaysPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white/70 backdrop-blur-2xl rounded-xl shadow-xl border border-white/50 p-6 w-[340px] space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Search Jobs</h3>
            <p className="text-sm text-gray-500">How many days of job listings do you want?</p>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="30" value={daysInput} onChange={(e) => setDaysInput(e.target.value)}
                className="input-field text-center text-lg font-semibold w-20" />
              <span className="text-sm text-gray-500">day{daysInput !== '1' ? 's' : ''}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowDaysPopup(false)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => handleTriggerJobSearch(daysInput || '1')} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors flex items-center justify-center gap-2">
                <Sparkles size={14} /> Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATS Resume Confirmation */}
      {resumeConfirmJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45" onClick={() => { if (!creatingResume) setResumeConfirmJob(null); }}>
          <div className="bg-white/85 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 p-6 w-[420px] space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create ATS Resume?</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  This will create a full ATS-friendly resume for
                  <span className="font-semibold text-gray-800"> {extractRole(resumeConfirmJob)}</span>
                  {resumeConfirmJob.employer_name ? <span> at <span className="font-semibold text-gray-800">{resumeConfirmJob.employer_name}</span></span> : null}.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-sm text-violet-900 leading-relaxed">
              The resume will use your uploaded profile resume as the source and tailor the full resume to this job description. Once created, it will be saved and reused for future viewing/downloads.
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setResumeConfirmJob(null)}
                disabled={creatingResume}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateResume}
                disabled={creatingResume}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {creatingResume ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {creatingResume ? 'Creating...' : 'Create Resume'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Modal */}
      {resumeJob && (() => {
        const resumeText = resumeJob.resume_text || '';
        const candidateName = resumeJob.candidate_name || '';
        const { sections } = parseResumeSections(resumeText, authUser?.fullName || candidateName, resumeJob.candidate_name);
        const jdRole = extractRole(resumeJob);

        const handleDownloadPDF = () => {
          const el = resumeRef.current;
          if (!el) return;
          html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `${(authUser?.fullName || candidateName).replace(/\s+/g, '_')}_Resume.pdf`,
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
${RESUME_WORD_STYLES}
</style></head><body>${el.innerHTML}</body></html>`;
          const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
          saveAs(blob, `${(authUser?.fullName || candidateName).replace(/\s+/g, '_')}_Resume.doc`);
        };

        const handleViewFullPage = () => {
          setResumeJob(null);
          setResumeViewMode(false);
          navigate('/dashboard/resume-view', {
            state: {
              sections,
              candidateName: authUser?.fullName || candidateName,
              headline: jdRole,
              resumeText,
            },
          });
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setResumeJob(null); setResumeViewMode(false); }}>
            <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 w-[660px] max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Close button */}
              <div className="flex justify-end px-4 pt-3 pb-0 shrink-0">
                <button onClick={() => { setResumeJob(null); setResumeViewMode(false); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Resume Document */}
              <div className="overflow-y-auto flex-1 px-8 pb-4">
                {resumeText ? (
                  <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                    <ResumeDocument
                      ref={resumeRef}
                      displayName={authUser?.fullName || candidateName || 'Resume'}
                      headline={jdRole}
                      contactItems={[authUser?.phone, authUser?.email].filter(Boolean)}
                      linkedinProfile={authUser?.linkedinProfile}
                      sections={sections}
                      rawText={resumeText}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertTriangle className="text-gray-300 mb-3" size={32} />
                    <h3 className="text-base font-semibold text-gray-600">No resume data available</h3>
                    <p className="text-sm text-gray-400 mt-1">Resume data will appear after the job search workflow processes this listing</p>
                  </div>
                )}
              </div>

              {/* Bottom Action Buttons — View / PDF / Word */}
              {resumeText && (
                <div className="flex items-center justify-center gap-3 px-8 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                  <button onClick={handleViewFullPage}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors shadow-sm">
                    <Eye size={15} /> View
                  </button>
                  <button onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors shadow-sm"
                    style={{ background: '#dc2626' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                    onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}>
                    <Download size={15} /> PDF
                  </button>
                  <button onClick={handleDownloadWord}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors shadow-sm"
                    style={{ background: '#2563eb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}>
                    <Download size={15} /> Word
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Detail Modal */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailJob(null)}>
          <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 w-[700px] max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{extractRole(detailJob)}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{detailJob.employer_name}</p>
                {(detailJob.job_city || detailJob.job_state || detailJob.job_country || detailJob.job_employment_type) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {[detailJob.job_city, detailJob.job_state, detailJob.job_country].filter(Boolean).join(', ')}
                    {detailJob.job_employment_type && <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-medium">{detailJob.job_employment_type}</span>}
                  </p>
                )}
              </div>
              <button onClick={() => setDetailJob(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {/* Technologies & Skills */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technologies & Skills</h3>
                {extractSkillsFromJD(detailJob.jd).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {extractSkillsFromJD(detailJob.jd).map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg border border-gray-200">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No specific technologies detected</p>
                )}
              </div>

              {/* Match Score */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resume Match Score</h3>
                  <span className={`text-sm font-bold ${parseInt(detailJob.match_score) >= 80 ? 'text-emerald-600' : parseInt(detailJob.match_score) >= 60 ? 'text-blue-600' : parseInt(detailJob.match_score) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {parseInt(detailJob.match_score) > 0 ? `${detailJob.match_score}%` : '—'}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${parseInt(detailJob.match_score) >= 80 ? 'bg-emerald-500' : parseInt(detailJob.match_score) >= 60 ? 'bg-blue-500' : parseInt(detailJob.match_score) > 0 ? 'bg-amber-500' : 'bg-gray-200'}`}
                    style={{ width: `${Math.min(parseInt(detailJob.match_score) || 0, 100)}%` }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 italic">Based on your resume, skills &amp; experience provided in the portal</p>
              </div>

              {/* Strong Matches */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />Strong Matches
                </h3>
                {parseTags(detailJob.strong_matches).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {parseTags(detailJob.strong_matches).map((t, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200">{t}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">—</p>
                )}
              </div>

              {/* Partial Matches */}
              {parseTags(detailJob.partial_matches).length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />Related / Partial Matches
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {parseTags(detailJob.partial_matches).map((t, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-200">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />Missing Skills
                </h3>
                {parseTags(detailJob.missing_skills).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {parseTags(detailJob.missing_skills).map((t, i) => (
                      <span key={i} className="px-2.5 py-1 bg-red-50 text-red-600 text-[11px] font-semibold rounded-lg border border-red-200">{t}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-600 font-medium">None — great match!</p>
                )}
              </div>

              {/* Summary */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Summary</h3>
                {detailJob.match_summary ? (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{detailJob.match_summary}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">—</p>
                )}
              </div>

              {/* Job Description */}
              {parseJDSections(detailJob.jd).length > 0 ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Job Description</h3>
                  <div className="space-y-4">
                    {parseJDSections(detailJob.jd).map((section, si) => (
                      <div key={si}>
                        <h4 className="text-sm font-bold text-gray-800 mb-1.5 pb-1 border-b border-gray-100">{section.heading}</h4>
                        <div className="text-sm text-gray-600 leading-relaxed">
                          {section.lines.map((line, li) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={li} className="h-1.5" />;
                            const isBullet = /^[-•*○◦▪]/.test(trimmed) || /^(\d+[\.\)])/.test(trimmed);
                            if (isBullet) {
                              const text = trimmed.replace(/^[-•*○◦▪]\s*/, '').replace(/^(\d+[\.\)])\s*/, '');
                              return <div key={li} className="flex gap-2 pl-2 py-0.5"><span className="text-gray-400 shrink-0 mt-[3px] text-[8px]">●</span><span>{text}</span></div>;
                            }
                            // Sub-headings or bold-looking lines
                            const isSubHeading = /^[A-Z].*:$/.test(trimmed) || (/^[A-Z]/.test(trimmed) && trimmed.length < 60 && !/[.!?]$/.test(trimmed) && trimmed.split(' ').length <= 6);
                            if (isSubHeading) {
                              return <p key={li} className="font-semibold text-gray-700 mt-2 mb-0.5">{trimmed}</p>;
                            }
                            return <p key={li} className="py-0.5">{trimmed}</p>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : detailJob.jd ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Job Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{detailJob.jd}</p>
                </div>
              ) : null}
            </div>
            {/* Footer — Apply & Resume buttons */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-white">
              <button
                onClick={() => handleResumeClick(detailJob, { closeDetails: true })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
              >
                <FileText size={15} />
                Resume
              </button>
              {detailJob.job_apply_link?.startsWith('http') && (
                <button
                  onClick={() => { handleMarkApplied(detailJob); setDetailJob(null); }}
                  disabled={detailJob.job_apply_link && appliedLinks.has(detailJob.job_apply_link)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    appliedLinks.has(detailJob.job_apply_link)
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-violet-600 text-white hover:bg-violet-700 border border-violet-600'
                  }`}
                >
                  {appliedLinks.has(detailJob.job_apply_link) ? (
                    <><CheckCircle2 size={15} /> Applied</>
                  ) : (
                    <><ExternalLink size={15} /> Apply</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting for Jobs Card */}
      {waitingForJobs && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 px-8 py-8 w-[420px] text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Sparkles size={28} className="text-violet-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Searching for jobs...</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Thank you for your patience! We're finding the best job matches for you. This page will update automatically once new jobs are ready.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Job Listings</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Showing {paginatedJobs.length} of {filteredJobs.length} jobs{totalPages > 1 && ` · Page ${page}/${totalPages}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Plan Badge + Usage */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
            usage.plan === 'ultra' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            usage.plan === 'pro' ? 'bg-violet-50 border-violet-200 text-violet-700' :
            usage.plan === 'basic' ? 'bg-blue-50 border-blue-200 text-blue-700' :
            'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <Crown size={12} />
            <span>{usage.label}</span>
            <span className="text-[10px] font-semibold opacity-70">
              {usage.plan === 'ultra' ? '∞' : `${usage.used}/${usage.max}`}
            </span>
          </div>
          <button
            onClick={() => {
              if (usage.used >= usage.max && usage.plan !== 'ultra') {
                toast.error(`Search limit reached (${usage.max}/${usage.max}). Upgrade your plan!`);
                return;
              }
              setShowDaysPopup(true);
            }}
            disabled={triggeringSearch}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 ${
              usage.used >= usage.max && usage.plan !== 'ultra'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {usage.used >= usage.max && usage.plan !== 'ultra' ? (
              <><Lock size={14} /> Limit Reached</>
            ) : (
              <>
                <Sparkles size={14} className={triggeringSearch ? 'animate-pulse' : ''} />
                {triggeringSearch ? 'Searching...' : 'My Jobs'}
              </>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={(loading || refreshing) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search + Filter Row */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="flex-1 bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 px-4 py-2.5 flex items-center gap-2 shadow-sm">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800"
            placeholder="Search company, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
          )}
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-xl px-4 py-2.5 text-sm text-gray-600 font-medium outline-none cursor-pointer hover:border-white/70 hover:bg-white/70 transition-all shadow-sm"
        >
          <option value="all">All Jobs</option>
          <option value="applied">Applied</option>
          <option value="admin_apply">Admin Apply</option>
        </select>
      </div>

      {/* Job Table */}
      <div className="flex-1 overflow-hidden bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 shadow-md shadow-blue-100/20 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
            <Briefcase className="mx-auto text-gray-300 mb-3" size={32} />
            <h3 className="text-base font-semibold text-gray-600">No jobs found</h3>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <tbody>
                  {paginatedJobs.map((job, idx) => {
                    const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                    const dateLabel = formatDate(job.timestamp);
                    const role = extractRole(job);
                    const score = parseInt(job.match_score) || 0;
                    const isApplied = job.job_apply_link && appliedLinks.has(job.job_apply_link);

                    return (
                      <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                        {/* # */}
                        <td className="pl-5 pr-2 py-3.5 w-10">
                          <span className="text-sm text-gray-400 font-medium">{globalIdx}</span>
                        </td>
                        {/* Checkbox */}
                        <td className="px-2 py-3.5 w-10">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(job.id)}
                            onChange={() => toggleRow(job.id)}
                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                        </td>
                        {/* Avatar + Info */}
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl ${avatarBg(job.employer_name)} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm`}>
                              {job.employer_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-[13px] text-gray-900 truncate leading-snug">{job.employer_name}</h3>
                                {dateLabel && <span className="text-[11px] text-gray-400 shrink-0">{dateLabel}</span>}
                              </div>
                              <p className="text-[12px] text-gray-500 truncate mt-0.5 max-w-md font-medium">{role}</p>
                            </div>
                          </div>
                        </td>
                        {/* Score */}
                        <td className="px-4 py-3.5 text-right w-24">
                          {score > 0 && (
                            <div className="text-right">
                              <span className={`text-lg font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-violet-600' : score >= 40 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {score}%
                              </span>
                              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Resume Match</p>
                            </div>
                          )}
                        </td>
                        {/* Action Buttons */}
                        <td className="pl-4 pr-5 py-3.5 w-80">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResumeClick(job)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                              <FileText size={13} /> Resume
                            </button>
                            <button
                              onClick={() => setDetailJob(job)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                              <Info size={13} /> Details
                            </button>
                            {isApplied ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-semibold rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50">
                                <CheckCircle2 size={13} /> Applied
                              </span>
                            ) : job.job_apply_link?.startsWith('http') ? (
                              <button
                                onClick={() => handleMarkApplied(job)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-sm">
                                <ExternalLink size={13} /> Apply
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === '...' ? (
                        <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm">...</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setPage(item)}
                          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                            page === item
                              ? 'bg-violet-600 text-white'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Thank You Message */}
            {filteredJobs.length > 0 && (
              <div className="mx-4 my-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Thank you for your patience! 🌟</p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">Job match scores are calculated based on the <span className="font-semibold text-violet-700">resume &amp; skills</span> you provided in the portal. Keep your profile updated for the best matches!</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobListings;
