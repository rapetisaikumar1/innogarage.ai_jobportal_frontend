import { useRef } from 'react';
import { Download, FileText, X } from 'lucide-react';
import ResumeDocument from './ResumeDocument';
import { downloadResumeAsDocx } from '../../utils/resumeDocx';

const makeResumeFileBaseName = (resume, job) => [
  resume?.candidateName || 'Candidate',
  job?.title || resume?.jobTitle || 'Tailored Resume',
]
  .filter(Boolean)
  .join('_')
  .replace(/[^a-zA-Z0-9._-]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 120) || 'Tailored_Resume';

const TailoredResumeModal = ({ resumeModal, onClose }) => {
  const resumeRef = useRef(null);

  if (!resumeModal?.resume?.resumeText) return null;

  const { job, resume } = resumeModal;
  const fileBaseName = makeResumeFileBaseName(resume, job);

  const handleDownloadPdf = async () => {
    if (!resumeRef.current) return;
    const { default: html2pdf } = await import('html2pdf.js');
    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${fileBaseName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(resumeRef.current)
      .save();
  };

  const handleDownloadWord = () => {
    downloadResumeAsDocx(
      resume.resumeText,
      resume.candidateName || 'Candidate',
      {
        preserveRawLayout: true,
        fileBaseName,
        headline: resume.headline || job?.title || '',
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-[1080px] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <FileText size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-slate-900">Tailored Resume</h3>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                  {resume.headline || job?.title} {job?.company ? `at ${job.company}` : ''}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {resume.warning && (
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-xs font-semibold text-amber-700">
            {resume.warning}
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-100/80 p-5">
          <div className="mx-auto max-w-[800px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <ResumeDocument
              ref={resumeRef}
              displayName={resume.candidateName || 'Candidate'}
              headline={resume.headline || job?.title}
              rawText={resume.resumeText}
              preserveRawLayout
              template="enterprise"
            />
          </div>
        </main>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">
            {resume.cloudinaryUrl ? 'Saved resume is cached in Cloudinary.' : 'Resume is cached for this job.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
            >
              <Download size={15} /> PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadWord}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Download size={15} /> Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailoredResumeModal;