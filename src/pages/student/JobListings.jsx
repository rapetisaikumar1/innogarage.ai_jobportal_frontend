import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getTokenForRole } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import ResumeDocument, { RESUME_TEMPLATES } from '../../components/resume/ResumeDocument';
import { downloadResumeAsDocx } from '../../utils/resumeDocx';
import {
  STUDENT_PORTAL_MODE,
  buildPortalRequestConfig,
  getPortalEndpoint,
  getPortalResumeViewPath,
  getPortalRolePrefix,
  getPortalStorageKey,
  isAdminPortalView,
} from '../../utils/studentPortalView';
import {
  Search, ExternalLink, Briefcase, RefreshCw, X, FileText, AlertTriangle,
  Clock, Sparkles, MapPin, Building2, Bookmark, ChevronLeft, ChevronRight, Info, CheckCircle2,
  Eye, Download, Crown, Lock, Palette, PenLine, Save, Sun, Moon, GripVertical, BarChart3, Zap,
  ArrowUpDown, ArrowUp, ArrowDown
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

const parseListField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'object') return Object.values(value).flat().filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    if (parsed && typeof parsed === 'object') return Object.values(parsed).flat().filter(Boolean);
  } catch { /* plain string fallback */ }
  return String(value).split(/[,|\n]/).map(item => item.trim()).filter(Boolean);
};

const getJobRecencyTime = (job) => {
  const candidates = [job?.saved_at, job?.timestamp, job?.createdAt, job?.posted];
  for (const value of candidates) {
    const time = new Date(value || '').getTime();
    if (Number.isFinite(time) && time > 0) return time;
  }
  return 0;
};

const buildLocalResumeInsights = (job, resumeText) => {
  const strong = parseListField(job?.strong_matches);
  const missing = parseListField(job?.missing_skills);
  const jdWords = String(job?.jd || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !/^(with|that|this|from|will|your|have|role|team|work|job|and|the|for|are|our)$/.test(word));
  const ranked = [...new Set([...strong, ...jdWords.map(word => word.replace(/\b\w/g, char => char.toUpperCase()))])].slice(0, 28);
  const normalizedResume = String(resumeText || '').toLowerCase();
  const matchedKeywords = ranked.filter(keyword => normalizedResume.includes(String(keyword).toLowerCase())).slice(0, 14);
  const missingKeywords = missing.length ? missing.slice(0, 10) : ranked.filter(keyword => !matchedKeywords.includes(keyword)).slice(0, 10);
  const baseScore = parseInt(job?.match_score, 10) || 0;

  return {
    score: baseScore,
    coverage: ranked.length ? Math.round((matchedKeywords.length / ranked.length) * 100) : baseScore,
    jdKeywords: ranked,
    matchedKeywords,
    missingKeywords,
    actionVerbs: ['Architected', 'Delivered', 'Optimized', 'Led', 'Implemented', 'Integrated'],
    suggestions: [
      missingKeywords.length ? `Add genuine evidence for ${missingKeywords.slice(0, 3).join(', ')} where applicable.` : 'Keyword coverage looks strong.',
      'Keep bullets concise, action-led, and tied to measurable delivery outcomes.',
      'Use standard ATS headings and a single-column layout for clean parsing.',
    ],
  };
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

const JOBS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const readJobsCache = (storageKey) => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const { jobs, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) { sessionStorage.removeItem(storageKey); return null; }
    return jobs;
  } catch { return null; }
};

const writeJobsCache = (jobs, storageKey) => {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ jobs, expiry: Date.now() + JOBS_CACHE_TTL_MS }));
  } catch { /* storage full — ignore */ }
};

const clearJobsCache = (storageKey) => { try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ } };

const JobListings = ({
  portalMode = STUDENT_PORTAL_MODE.STUDENT,
  studentId = null,
  viewerUser = null,
  embedded = false,
}) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const portalUser = viewerUser || authUser;
  const getPortalUrl = useCallback(
    (endpointKey) => getPortalEndpoint(endpointKey, { portalMode, studentId }),
    [portalMode, studentId]
  );
  const requestConfig = useCallback(
    (config = {}) => buildPortalRequestConfig(portalMode, config),
    [portalMode]
  );
  const jobsCacheKey = useMemo(
    () => getPortalStorageKey('cachedMatchedJobs', { portalMode, studentId }),
    [portalMode, studentId]
  );
  const pendingAppliedKey = useMemo(
    () => getPortalStorageKey('pendingApplied', { portalMode, studentId }),
    [portalMode, studentId]
  );
  const waitingForJobsKey = useMemo(
    () => getPortalStorageKey('waitingForJobs', { portalMode, studentId }),
    [portalMode, studentId]
  );
  const isCompactView = embedded;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringSearch, setTriggeringSearch] = useState(false);
  const [appliedLinks, setAppliedLinks] = useState(new Set());
  const [adminAppliedLinks, setAdminAppliedLinks] = useState(new Set());
  const [showDaysPopup, setShowDaysPopup] = useState(false);
  const [daysInput, setDaysInput] = useState('7');
  const [search, setSearch] = useState('');
  const [detailJob, setDetailJob] = useState(null);
  const [resumeJob, setResumeJob] = useState(null);
  const [resumeConfirmJob, setResumeConfirmJob] = useState(null);
  const [creatingResume, setCreatingResume] = useState(false);
  const [resumeViewMode, setResumeViewMode] = useState(false);
  // Fixed to enterprise template — same layout for all users
  const resumeTemplate = 'enterprise';
  const [resumeDarkMode, setResumeDarkMode] = useState(false);
  const [resumeEditMode, setResumeEditMode] = useState(false);
  const [resumeDraft, setResumeDraft] = useState('');
  const [resumeSectionOrder, setResumeSectionOrder] = useState([]);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState(null);
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [savingResumeDraft, setSavingResumeDraft] = useState(false);
  const resumeRef = useRef(null);
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('default'); // 'default' | 'score-desc' | 'score-asc'
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [waitingForJobs, setWaitingForJobs] = useState(false);
  const [streamedCount, setStreamedCount] = useState(null); // null = show all; number = stream reveal limit
  const streamTimerRef = useRef(null);
  const [usage, setUsage] = useState({ plan: 'free', used: 0, max: 5, label: 'Free' });
  const [searchStatusMsg, setSearchStatusMsg] = useState('');
  const [newJobKeys, setNewJobKeys] = useState(new Set()); // tracks jobs that just arrived (for slide-in animation)
  const streamAbortRef = useRef(null); // AbortController for SSE fetch

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
    // Store in sessionStorage immediately so Dashboard/MyApplications pick it up
    // even if the user navigates before the API call completes (race condition fix)
    try {
      const entry = {
        jobLink: link,
        employerName: job.employer_name || '',
        jobTitle: extractRole(job),
        matchScore: job.match_score ? String(job.match_score) : null,
        appliedAt: new Date().toISOString(),
        status: 'APPLIED',
        appliedMethod: 'MANUAL',
      };
      const pending = JSON.parse(sessionStorage.getItem(pendingAppliedKey) || '[]');
      if (!pending.find(p => p.jobLink === link)) {
        sessionStorage.setItem(pendingAppliedKey, JSON.stringify([entry, ...pending]));
      }
    } catch { /* ignore sessionStorage errors */ }
    // Save to backend — if it fails, remove from sessionStorage so counts stay accurate
    try {
      await api.post(getPortalUrl('markExternalApplied'), {
        jobLink: link,
        employerName: job.employer_name,
        matchScore: job.match_score,
        jobTitle: extractRole(job),
      }, requestConfig());
    } catch {
      // API failed — revert optimistic sessionStorage entry so counts don't stay inflated
      try {
        const pending = JSON.parse(sessionStorage.getItem(pendingAppliedKey) || '[]');
        sessionStorage.setItem(pendingAppliedKey, JSON.stringify(pending.filter(p => p.jobLink !== link)));
      } catch { /* ignore */ }
      // Also revert the optimistic UI mark
      setAppliedLinks(prev => { const next = new Set(prev); next.delete(link); return next; });
    }
  };

  const fetchAppliedStatus = useCallback(async () => {
    try {
      const { data } = await api.get(getPortalUrl('externalAppliedStatus'), requestConfig({ params: { t: Date.now() } }));
      const apps = data.applications || [];
      const apiLinks = new Set(apps.map(a => a.jobLink));
      // Merge pendingApplied from sessionStorage — covers the case where the user
      // navigated back before the mark-applied API call was confirmed by the server
      const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes
      const now = Date.now();
      const pending = (() => { try { return JSON.parse(sessionStorage.getItem(pendingAppliedKey) || '[]'); } catch { return []; } })()
        .filter(p => p.appliedAt && (now - new Date(p.appliedAt).getTime()) < PENDING_TTL_MS);
      // Clean up any pending entries that the API now confirms
      const stillPending = pending.filter(p => !apiLinks.has(p.jobLink));
      if (stillPending.length !== pending.length) {
        try { sessionStorage.setItem(pendingAppliedKey, JSON.stringify(stillPending)); } catch { /* ignore */ }
      }
      const allAppliedLinks = new Set([...apiLinks, ...stillPending.map(p => p.jobLink)]);
      setAppliedLinks(allAppliedLinks);
      setAdminAppliedLinks(new Set(apps.filter(a => a.appliedById).map(a => a.jobLink)));
    } catch { /* ignore */ }
  }, [getPortalUrl, pendingAppliedKey, requestConfig]);

  const fetchUsage = useCallback(async () => {
    try {
      const { data } = await api.get(getPortalUrl('usage'), requestConfig({ params: { t: Date.now() } }));
      setUsage(data);
    } catch { /* ignore */ }
  }, [getPortalUrl, requestConfig]);

  const fetchMatchedJobs = useCallback(async ({ forceRefresh = false } = {}) => {
    try {
      // Serve stale cache immediately so the page feels instant
      if (!forceRefresh) {
        const cached = readJobsCache(jobsCacheKey);
        if (cached && cached.length > 0) {
          setJobs(cached);
          setLoading(false);
          // Revalidate with ?refresh=1 to always bypass server cache
          api.get(getPortalUrl('matchedJobs'), requestConfig({ params: { refresh: '1' } })).then(({ data }) => {
            const fresh = data.jobs || [];
            setJobs(fresh);
            if (fresh.length > 0) { writeJobsCache(fresh, jobsCacheKey); }
            else { clearJobsCache(jobsCacheKey); } // DB is empty — clear stale frontend cache
          }).catch(() => {});
          return;
        }
      }
      setLoading(true);
      const { data } = await api.get(getPortalUrl('matchedJobs'), requestConfig({ params: { refresh: forceRefresh ? '1' : undefined } }));
      const fetchedJobs = data.jobs || [];
      setJobs(fetchedJobs);
      if (fetchedJobs.length > 0) {
        writeJobsCache(fetchedJobs, jobsCacheKey);
        setWaitingForJobs(false);
        sessionStorage.removeItem(waitingForJobsKey);
      } else {
        clearJobsCache(jobsCacheKey); // DB empty — don't cache empty result but don't keep stale
      }
    } catch (error) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [getPortalUrl, jobsCacheKey, requestConfig, waitingForJobsKey]);

  useEffect(() => {
    if (sessionStorage.getItem(waitingForJobsKey) === 'true') {
      setWaitingForJobs(true);
    }
    fetchMatchedJobs();
    fetchAppliedStatus();
    fetchUsage();
  }, [fetchAppliedStatus, fetchMatchedJobs, fetchUsage, waitingForJobsKey]);

  useEffect(() => {
    setResumeDraft(resumeJob?.resume_text || '');
    setResumeEditMode(false);
    // template is fixed — no reset needed
    setResumeDarkMode(false);
    setResumeSectionOrder([]);
    setDraggedSectionIndex(null);
    setResumeAnalysis(null);
  }, [resumeJob?.id, resumeJob?.resume_text]);

  useEffect(() => {
    if (!resumeJob?.jd || !resumeJob?.resume_text) return;
    let active = true;
    setAnalyzingResume(true);
    api.post(getPortalUrl('matchScore'), {
      jd: resumeJob.jd,
      resume_text: resumeJob.resume_text,
      match_score: resumeJob.match_score,
      skills: portalUser?.keySkills || [],
    }, requestConfig())
      .then(({ data }) => { if (active) setResumeAnalysis(data); })
      .catch(() => { if (active) setResumeAnalysis(null); })
      .finally(() => { if (active) setAnalyzingResume(false); });

    return () => { active = false; };
  }, [getPortalUrl, portalUser?.keySkills, requestConfig, resumeJob?.id, resumeJob?.resume_text, resumeJob?.jd, resumeJob?.match_score]);

  const handleRefresh = async () => {
    setRefreshing(true);
    clearJobsCache(jobsCacheKey);
    await Promise.all([fetchMatchedJobs({ forceRefresh: true }), fetchAppliedStatus(), fetchUsage()]);
    setRefreshing(false);
    toast.success('Jobs refreshed.');
  };

  /**
   * Streaming Job Search Pipeline
   * ─────────────────────────────
   * Opens an SSE connection to GET /api/jobs/search/stream.
   * The backend processes jobs source-by-source and emits each qualifying job (score ≥ 60)
   * immediately as it is found. Each arriving job is prepended to the jobs list with a
   * slide-in animation so the user sees results appear one by one in real time.
   */
  const handleTriggerJobSearch = async (days) => {
    setShowDaysPopup(false);

    if (usage.used >= usage.max && usage.plan !== 'ultra') {
      toast.error(`You've reached your ${usage.label} plan limit (${usage.max} searches/day). Upgrade for more!`);
      return;
    }

    // Abort any previous stream still running
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    const controller = new AbortController();
    streamAbortRef.current = controller;

    setTriggeringSearch(true);
    setWaitingForJobs(true);
    setSearchStatusMsg('Starting job search based on your profile…');
    sessionStorage.setItem(waitingForJobsKey, 'true');
    clearJobsCache(jobsCacheKey);

    const arrivedThisSession = []; // accumulate jobs found during this stream

    try {
      const token = getTokenForRole(getPortalRolePrefix(portalMode));
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(
        `${apiBase}${getPortalUrl('searchStream')}?days=${encodeURIComponent(String(days))}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Server error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        // SSE events are separated by double newline
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop() || '';

        for (const chunk of parts) {
          // Skip heartbeat lines (start with ':')
          const dataLine = chunk.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          const jsonStr = dataLine.slice(6).trim();
          if (!jsonStr) continue;

          let msg;
          try { msg = JSON.parse(jsonStr); } catch { continue; }

          if (msg.type === 'job') {
            const job = msg.job;
            arrivedThisSession.push(job);

            // Append the new job to the FRONT of the existing list immediately
            setJobs(prev => {
              const updated = [job, ...prev];
              writeJobsCache(updated, jobsCacheKey);
              return updated;
            });

            // Mark this job as newly arrived so the row animates in
            const jobKey = job.id || job.job_apply_link;
            setNewJobKeys(prev => new Set([...prev, jobKey]));
            // Remove animation marker after animation completes (~600ms)
            setTimeout(() => {
              setNewJobKeys(prev => {
                const next = new Set(prev);
                next.delete(jobKey);
                return next;
              });
            }, 700);

          } else if (msg.type === 'status') {
            setSearchStatusMsg(msg.message);

          } else if (msg.type === 'done') {
            setUsage(prev => ({ ...prev, used: prev.used + 1 }));
            if (msg.count > 0) {
              toast.success(msg.message || `Found ${msg.count} matching jobs!`);
            } else {
              toast.info(msg.message || 'No new matching jobs found for your profile.');
            }
            fetchAppliedStatus();

          } else if (msg.type === 'error') {
            if (msg.limitReached) {
              toast.error(msg.message);
            } else {
              toast.error(msg.message || 'Job search failed. Please try again.');
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return; // navigated away — silent
      toast.error(error.message || 'Failed to trigger job search');
    } finally {
      setWaitingForJobs(false);
      sessionStorage.removeItem(waitingForJobsKey);
      setTriggeringSearch(false);
      setSearchStatusMsg('');
      streamAbortRef.current = null;
    }
  };

  // Cleanup on unmount: stop any running stream + interval timers
  useEffect(() => () => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    if (streamAbortRef.current) streamAbortRef.current.abort();
  }, []);

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
      const { data } = await api.post(getPortalUrl('resumeGenerate'), resumeConfirmJob, requestConfig());
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

  const handleSaveResumeDraft = async () => {
    if (!resumeJob || savingResumeDraft) return;
    setSavingResumeDraft(true);
    try {
      const { data } = await api.post(getPortalUrl('resumeSave'), {
        id: resumeJob.id,
        job_apply_link: resumeJob.job_apply_link,
        resume_text: resumeDraft,
      }, requestConfig());
      if (data.job) {
        syncUpdatedJob(data.job);
        setResumeJob(data.job);
      }
      setResumeEditMode(false);
      toast.success(data.message || 'Resume edits saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save resume edits');
    } finally {
      setSavingResumeDraft(false);
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
    if (filterType === 'applied') {
      filtered = filtered.filter((j) => !!(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    } else if (filterType === 'student_apply') {
      filtered = filtered.filter((j) => !!(
        j.job_apply_link
        && appliedLinks.has(j.job_apply_link)
        && !adminAppliedLinks.has(j.job_apply_link)
      ));
    } else if (filterType === 'admin_apply') {
      filtered = filtered.filter((j) => !!(j.job_apply_link && adminAppliedLinks.has(j.job_apply_link)));
    }
    if (sortOrder === 'default') {
      filtered = [...filtered].sort((a, b) => getJobRecencyTime(b) - getJobRecencyTime(a));
    } else if (sortOrder === 'score-desc') {
      filtered = [...filtered].sort((a, b) => (parseInt(b.match_score) || 0) - (parseInt(a.match_score) || 0));
    } else if (sortOrder === 'score-asc') {
      filtered = [...filtered].sort((a, b) => (parseInt(a.match_score) || 0) - (parseInt(b.match_score) || 0));
    }
    return filtered;
  }, [jobs, search, filterType, sortOrder, appliedLinks, adminAppliedLinks]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters or sort change
  useEffect(() => { setPage(1); }, [search, filterType, sortOrder]);

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
    <div className={embedded ? 'flex h-full min-h-0 flex-col' : 'flex flex-col h-[calc(100vh-4rem)]'}>

      {/* Days Popup */}
      {showDaysPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-[340px] space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Find Jobs</h3>
            <p className="text-sm text-gray-500">Choose how many days back you want the live search to scan.</p>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="30" value={daysInput} onChange={(e) => setDaysInput(e.target.value)}
                className="input-field text-center text-lg font-semibold w-20" />
              <span className="text-sm text-gray-500">day{daysInput !== '1' ? 's' : ''}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowDaysPopup(false)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => handleTriggerJobSearch(daysInput || '1')} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2">
                <Sparkles size={14} /> Find Jobs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATS Resume Confirmation */}
      {resumeConfirmJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => { if (!creatingResume) setResumeConfirmJob(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-7 w-[440px]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Generate ATS Resume</h3>
                <p className="text-xs text-gray-400 mt-0.5">Tailored to this specific job description</p>
              </div>
            </div>

            {/* Job info */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Position</p>
              <p className="text-sm font-bold text-gray-900">{extractRole(resumeConfirmJob)}</p>
              {resumeConfirmJob.employer_name && <p className="text-sm text-gray-500 mt-0.5">{resumeConfirmJob.employer_name}</p>}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2.5 mb-6">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-[10px] font-bold">i</span>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your uploaded profile resume will be used as the base. The AI will preserve all your original content and add job-specific enhancements. The result is saved and can be downloaded as PDF or Word.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setResumeConfirmJob(null)}
                disabled={creatingResume}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateResume}
                disabled={creatingResume}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {creatingResume ? <RefreshCw size={15} className="animate-spin" /> : <FileText size={15} />}
                {creatingResume ? 'Generating...' : 'Generate Resume'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Modal */}
      {resumeJob && (() => {
        const resumeText = resumeJob.resume_text || '';
        const effectiveResumeText = resumeDraft || resumeText;
        const candidateName = resumeJob.candidate_name || '';
        const { sections } = parseResumeSections(effectiveResumeText, portalUser?.fullName || candidateName, resumeJob.candidate_name);
        const orderedSections = resumeSectionOrder.length === sections.length
          ? resumeSectionOrder.map(index => sections[index]).filter(Boolean)
          : sections;
        const jdRole = extractRole(resumeJob);
        const intelligence = resumeAnalysis || buildLocalResumeInsights(resumeJob, effectiveResumeText);
        const jdKeywords = intelligence.jdKeywords || intelligence.keywords || [];
        const matchedKeywords = intelligence.matchedKeywords || [];
        const missingKeywords = intelligence.missingKeywords || intelligence.missingSkills || [];
        const visualScore = Math.max(0, Math.min(100, parseInt(intelligence.score || resumeJob.match_score, 10) || 0));
        // template is fixed to 'enterprise' — no dynamic selection needed

        const handleSectionDrop = (targetIndex) => {
          if (draggedSectionIndex == null || draggedSectionIndex === targetIndex) return;
          const baseOrder = resumeSectionOrder.length === sections.length ? [...resumeSectionOrder] : sections.map((_, index) => index);
          const [moved] = baseOrder.splice(draggedSectionIndex, 1);
          baseOrder.splice(targetIndex, 0, moved);
          setResumeSectionOrder(baseOrder);
          setDraggedSectionIndex(null);
        };

        const handleDownloadPDF = () => {
          const el = resumeRef.current;
          if (!el) return;
          html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `${(portalUser?.fullName || candidateName).replace(/\s+/g, '_')}_Resume.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          }).from(el).save();
        };

        const handleDownloadWord = () => {
          downloadResumeAsDocx(effectiveResumeText, portalUser?.fullName || candidateName);
        };

        const handleViewFullPage = () => {
          setResumeJob(null);
          setResumeViewMode(false);
          navigate(getPortalResumeViewPath({ portalMode, studentId }), {
            state: {
              sections: orderedSections,
              candidateName: portalUser?.fullName || candidateName,
              headline: jdRole,
              resumeText: effectiveResumeText,
              template: resumeTemplate,
              highlightKeywords: jdKeywords,
              viewerUser: portalUser,
            },
          });
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4" onClick={() => { setResumeJob(null); setResumeViewMode(false); }}>
            <div className={`${resumeDarkMode ? 'bg-slate-950 text-white border-white/10' : 'bg-white/90 text-slate-900 border-white/60'} backdrop-blur-2xl rounded-2xl shadow-2xl border w-[1120px] max-w-[96vw] max-h-[92vh] flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-slate-200/70 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white"><FileText size={16} /></span>
                    <h3 className="text-base font-bold">ATS Resume</h3>
                  </div>
                  <p className={`text-xs mt-1 ${resumeDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{jdRole} {resumeJob.employer_name ? `at ${resumeJob.employer_name}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setResumeDarkMode(prev => !prev)} className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border ${resumeDarkMode ? 'border-white/10 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                    {resumeDarkMode ? <Sun size={14} /> : <Moon size={14} />} {resumeDarkMode ? 'Light' : 'Dark'}
                  </button>
                  <button onClick={() => { setResumeJob(null); setResumeViewMode(false); }} className={`p-2 rounded-lg transition-colors ${resumeDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 flex flex-col">

                <main className={`flex-1 min-h-0 overflow-y-auto p-5 ${resumeDarkMode ? 'bg-slate-900' : 'bg-slate-100/80'}`}>
                  {effectiveResumeText ? (
                    <>
                      <div className="mx-auto max-w-[800px] border border-slate-200 rounded-lg bg-white shadow-xl overflow-hidden">
                        <ResumeDocument
                          ref={resumeRef}
                          displayName={portalUser?.fullName || candidateName || 'Resume'}
                          headline={jdRole}
                          contactItems={[portalUser?.phone, portalUser?.email].filter(Boolean)}
                          linkedinProfile={portalUser?.linkedinProfile}
                          sections={orderedSections}
                          rawText={effectiveResumeText}
                          template={resumeTemplate}
                          highlightKeywords={jdKeywords}
                        />
                      </div>
                      <div className="mx-auto max-w-[800px] mt-4 flex gap-3 justify-center">
                        <button onClick={handleViewFullPage} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors">
                          <Eye size={15} /> View
                        </button>
                        <button onClick={handleDownloadPDF} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">
                          <Download size={15} /> Download PDF
                        </button>
                        <button onClick={handleDownloadWord} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                          <Download size={15} /> Download Word
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <AlertTriangle className="text-gray-300 mb-3" size={32} />
                      <h3 className="text-base font-semibold text-gray-600">No resume data available</h3>
                      <p className="text-sm text-gray-400 mt-1">Resume data will appear after the job search workflow processes this listing</p>
                    </div>
                  )}
                </main>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Detail Modal */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[700px] max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
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
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hasCompleteGeneratedResume(detailJob.resume_text)
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                    : 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                {hasCompleteGeneratedResume(detailJob.resume_text)
                  ? <CheckCircle2 size={15} />
                  : <FileText size={15} />}
                Resume
              </button>
              {detailJob.job_apply_link?.startsWith('http') && (
                <button
                  onClick={() => { handleMarkApplied(detailJob); setDetailJob(null); }}
                  disabled={detailJob.job_apply_link && appliedLinks.has(detailJob.job_apply_link)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    appliedLinks.has(detailJob.job_apply_link)
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600'
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

      {/* Search-in-progress inline banner */}
      {triggeringSearch && (
        <div className={`flex items-center rounded-xl border border-gray-100 bg-white shrink-0 ${isCompactView ? 'mb-2 gap-3 px-4 py-2.5' : 'mb-3 gap-5 px-5 py-4'}`} style={{ boxShadow: '0 2px 16px 0 rgba(99,102,241,0.08)' }}>

          {/* Glowing pulse dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[0, 150, 300].map((delay) => (
              <span key={delay} style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                animation: `glow-pulse 1.2s ease-in-out ${delay}ms infinite`,
              }} />
            ))}
          </div>

          {/* Scan bar track */}
          <div className={`relative rounded-full shrink-0 overflow-hidden ${isCompactView ? 'h-1 w-20' : 'h-1 w-28'}`} style={{ background: '#e0e7ff' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%', width: '35%',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, transparent, #6366f1, #818cf8, transparent)',
              animation: 'scanBar 1.1s ease-in-out infinite',
            }} />
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className={`${isCompactView ? 'text-[13px]' : 'text-sm'} font-bold`} style={{
              background: 'linear-gradient(90deg, #4f46e5, #2563eb, #7c3aed, #4f46e5)',
              backgroundSize: '300% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'textShimmer 2.5s linear infinite',
            }}>Searching for your best job matches...</p>
            <p className={`${isCompactView ? 'text-[11px]' : 'text-xs mt-0.5'} text-gray-400`}>{searchStatusMsg || 'Jobs appear below one by one as they are found for your profile.'}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`shrink-0 ${isCompactView ? 'mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm' : 'mb-4 flex items-center justify-between'}`}>
        <div>
          <h1 className={`${isCompactView ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>Find Jobs</h1>
          <p className={`${isCompactView ? 'mt-0 text-[11px]' : 'mt-0.5 text-sm'} text-gray-400`}>
            {triggeringSearch
              ? <span className="text-blue-500 font-medium flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin" /> Searching for 60%+ matches…</span>
              : streamedCount !== null
              ? <span className="text-blue-500 font-medium">Loading {Math.min(streamedCount, filteredJobs.length)} of {filteredJobs.length} jobs…</span>
              : <>Showing {paginatedJobs.length} of {filteredJobs.length} qualified matches{totalPages > 1 && ` · Page ${page}/${totalPages}`}</>
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Plan Badge + Usage */}
          <div className={`flex items-center gap-1.5 rounded-lg border font-bold ${isCompactView ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} ${
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
            className={`flex items-center gap-1.5 font-semibold rounded-lg transition-colors disabled:opacity-60 ${isCompactView ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${
              usage.used >= usage.max && usage.plan !== 'ultra'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {usage.used >= usage.max && usage.plan !== 'ultra' ? (
              <><Lock size={14} /> Limit Reached</>
            ) : (
              <>
                <Sparkles size={14} className={triggeringSearch ? 'animate-pulse' : ''} />
                {triggeringSearch ? 'Searching...' : 'Find Jobs'}
              </>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className={`flex items-center gap-1.5 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60 ${isCompactView ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
          >
            <RefreshCw size={14} className={(loading || refreshing) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search + Filter Row */}
      <div className={`flex shrink-0 ${isCompactView ? 'mb-3 flex-wrap items-center gap-2' : 'mb-4 items-center gap-3'}`}>
        {/* Search input */}
        <div className={`flex-1 bg-white rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm ${isCompactView ? 'px-3 py-2' : 'px-4 py-2.5'}`}>
          <Search size={isCompactView ? 14 : 16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className={`${isCompactView ? 'text-[13px]' : 'text-sm'} flex-1 bg-transparent text-gray-800 outline-none placeholder-gray-400`}
            placeholder="Search title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
          )}
        </div>

        {/* Sort by Score */}
        <div className="flex items-center bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <span className={`font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap select-none ${isCompactView ? 'pl-2.5 pr-1.5 text-[10px]' : 'pl-3 pr-2 text-[11px]'}`}>Sort</span>
          <div className="w-px h-5 bg-gray-100" />
          {[
            { value: 'default', label: 'Newest' },
            { value: 'score-desc', label: 'Score High' },
            { value: 'score-asc',  label: 'Score Low' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortOrder(opt.value)}
              className={`${isCompactView ? 'px-3 py-2 text-[11px]' : 'px-3.5 py-2.5 text-xs'} font-semibold whitespace-nowrap transition-colors ${
                sortOrder === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`bg-white border border-gray-100 rounded-xl text-gray-600 font-medium outline-none cursor-pointer hover:border-gray-200 hover:bg-gray-50 transition-all shadow-sm ${isCompactView ? 'px-3 py-2 text-[13px]' : 'px-4 py-2.5 text-sm'}`}
        >
          <option value="all">All Jobs</option>
          <option value="applied">Applied</option>
          <option value="student_apply">Applied by Student</option>
          <option value="admin_apply">Applied by Admin</option>
        </select>
      </div>

      {/* Job Table */}
      <div className="flex-1 overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
            <Briefcase className="mx-auto text-gray-300 mb-3" size={32} />
            <h3 className="text-base font-semibold text-gray-600">{jobs.length === 0 ? 'No 60%+ matches yet' : 'No jobs found'}</h3>
            <p className="text-sm text-gray-400 mt-1">{jobs.length === 0 ? 'Click Find Jobs to start a live search based on role, skills, experience, location, and resume summary.' : 'Try adjusting your search or filters.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1">
              <table className="w-full min-w-[880px]">
                <thead className="bg-slate-50/90 backdrop-blur-sm">
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Job Title</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Company</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Date Posted</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Match Score</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Resume</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Apply Link</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map((job, idx) => {
                    const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                    const dateLabel = formatDate(job.posted || job.timestamp);
                    const role = extractRole(job);
                    const score = parseInt(job.match_score) || 0;
                    const isApplied = job.job_apply_link && appliedLinks.has(job.job_apply_link);
                    // Stream reveal: visible when streamedCount is null (all shown) or globalIdx <= streamedCount
                    const isVisible = streamedCount === null || globalIdx <= streamedCount;
                    // Slide-in animation for jobs that just arrived via SSE stream
                    const jobKey = job.id || job.job_apply_link;
                    const isNewArrival = newJobKeys.has(jobKey);

                    // Derive domain for company logo
                    const logoDomain = (() => {
                      if (job.employer_website) return job.employer_website.replace(/^https?:\/\//, '').split('/')[0];
                      if (job.job_apply_link) return job.job_apply_link.replace(/^https?:\/\//, '').split('/')[0];
                      return null;
                    })();

                    return (
                      <tr
                        key={job.id || job.job_apply_link || `${job.employer_name}-${job.job_title}-${globalIdx}`}
                        className="border-b border-gray-50 hover:bg-gray-50/60 group"
                        style={{
                          opacity: isVisible ? 1 : 0,
                          transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                          transition: isVisible ? 'opacity 350ms ease, transform 350ms ease' : 'none',
                          pointerEvents: isVisible ? 'auto' : 'none',
                          animation: isNewArrival ? 'jobSlideIn 0.45s cubic-bezier(0.22,1,0.36,1)' : undefined,
                        }}
                      >
                        <td className={`px-4 ${isCompactView ? 'py-2.5' : 'py-3.5'}`}>
                          <div className="min-w-0">
                            <p className={`${isCompactView ? 'text-[12px]' : 'text-[13px]'} font-semibold text-gray-900 truncate leading-snug`}>{role}</p>
                          </div>
                        </td>
                        <td className={`px-4 ${isCompactView ? 'py-2.5' : 'py-3.5'}`}>
                          <div className={`flex items-center ${isCompactView ? 'gap-3' : 'gap-3.5'}`}>
                            {logoDomain ? (
                              <img
                                src={`https://logo.clearbit.com/${logoDomain}`}
                                alt={job.employer_name}
                                className={`${isCompactView ? 'h-9 w-9 rounded-lg' : 'h-10 w-10 rounded-xl'} object-contain bg-white border border-gray-100 shadow-sm shrink-0 p-0.5`}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`${isCompactView ? 'h-9 w-9 rounded-lg text-[13px]' : 'h-10 w-10 rounded-xl text-sm'} ${avatarBg(job.employer_name)} text-white items-center justify-center font-bold shrink-0 shadow-sm ${logoDomain ? 'hidden' : 'flex'}`}>
                              {job.employer_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <h3 className={`${isCompactView ? 'text-[12px]' : 'text-[13px]'} font-semibold text-gray-900 truncate leading-snug`}>{job.employer_name || 'Unknown company'}</h3>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 ${isCompactView ? 'py-2.5' : 'py-3.5'}`}>
                          <span className={`${isCompactView ? 'text-[11px]' : 'text-[12px]'} font-medium text-gray-600`}>
                            {dateLabel || 'Recently posted'}
                          </span>
                        </td>
                        <td className={`px-4 ${isCompactView ? 'py-2.5 w-36' : 'py-3.5 w-40'}`}>
                          <div>
                            <span className={`${isCompactView ? 'text-base' : 'text-lg'} font-bold ${score >= 80 ? 'text-emerald-600' : score >= 70 ? 'text-blue-600' : 'text-orange-500'}`}>
                              {score}%
                            </span>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`${score >= 80 ? 'bg-emerald-500' : score >= 70 ? 'bg-blue-500' : 'bg-orange-500'} h-full rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min(score, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 ${isCompactView ? 'py-2.5 w-44' : 'py-3.5 w-48'}`}>
                          <div className="flex items-center">
                            <button
                              onClick={() => handleResumeClick(job)}
                              className={`relative inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors shadow-sm ${isCompactView ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-[7px] text-[12px]'} ${
                                hasCompleteGeneratedResume(job.resume_text)
                                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                              }`}>
                              {hasCompleteGeneratedResume(job.resume_text)
                                ? <CheckCircle2 size={13} className="text-emerald-500" />
                                : <FileText size={13} />}
                              {hasCompleteGeneratedResume(job.resume_text) ? 'Resume Ready' : 'Generate Resume'}
                            </button>
                          </div>
                        </td>
                        <td className={`px-4 ${isCompactView ? 'py-2.5 w-36' : 'py-3.5 w-40'}`}>
                          <div className="flex items-center">
                            {isApplied ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 ${isCompactView ? 'px-3 py-1.5 text-[11px] font-semibold' : 'px-3.5 py-[7px] text-[12px] font-semibold'}`}>
                                <CheckCircle2 size={13} /> Applied
                              </span>
                            ) : job.job_apply_link?.startsWith('http') ? (
                              <button
                                onClick={() => handleMarkApplied(job)}
                                className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm ${isCompactView ? 'px-3 py-1.5 text-[11px] font-semibold' : 'px-3.5 py-[7px] text-[12px] font-semibold'}`}>
                                <ExternalLink size={13} /> Apply Link
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
                              ? 'bg-blue-600 text-white'
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
