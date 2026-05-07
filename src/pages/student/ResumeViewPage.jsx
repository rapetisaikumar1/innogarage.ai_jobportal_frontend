import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { ArrowLeft, Download } from 'lucide-react';
import ResumeDocument from '../../components/resume/ResumeDocument';
import { downloadResumeAsDocx } from '../../utils/resumeDocx';

const ResumeViewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const resumeRef = useRef(null);

  const { sections = [], candidateName = '', headline = '', resumeText = '', template = 'modern', highlightKeywords = [] } = location.state || {};
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
    downloadResumeAsDocx(resumeText, displayName);
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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
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
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <ResumeDocument
            ref={resumeRef}
            displayName={displayName}
            headline={headline}
            contactItems={[authUser?.phone, authUser?.email].filter(Boolean)}
            linkedinProfile={authUser?.linkedinProfile}
            sections={sections}
            rawText={resumeText}
            template={template}
            highlightKeywords={highlightKeywords}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumeViewPage;
