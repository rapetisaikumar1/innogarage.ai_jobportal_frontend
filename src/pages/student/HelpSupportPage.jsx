import { useState } from 'react';
import {
  HelpCircle, MessageCircle, Mail, BookOpen, ChevronDown, ChevronUp,
  ExternalLink, Search
} from 'lucide-react';

const FAQ_DATA = [
  {
    question: 'How do I apply for a job?',
    answer: 'Navigate to the Jobs page from the sidebar, browse available listings, and click "Apply" on any job that interests you. Fill in the required details and submit your application.'
  },
  {
    question: 'How does mentor matching work?',
    answer: 'Our platform automatically assigns you a mentor based on your profile and career goals. You can view your assigned mentor on the Mentoring page and book sessions with them.'
  },
  {
    question: 'Can I edit my profile after registration?',
    answer: 'Yes, go to the Profile page from the sidebar. You can update your personal information, skills, and change your password at any time.'
  },
  {
    question: 'How do I track my job applications?',
    answer: 'Visit the Applications page to see all your submitted applications along with their current status — whether they are pending, reviewed, or accepted.'
  },
  {
    question: 'What is the Shoutboard?',
    answer: 'The Shoutboard is a community space where students can post updates, ask questions, and interact with peers. Think of it as a campus bulletin board.'
  },
  {
    question: 'How do I upgrade my plan?',
    answer: 'Click the "Upgrade Plan" button in the sidebar to view available subscription tiers. Choose the plan that fits your needs and follow the checkout process.'
  },
];

const HelpSupportPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = FAQ_DATA.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle size={20} className="text-violet-600" />
          <h1 className="text-[18px] font-bold text-gray-900">Help & Support</h1>
        </div>
        <p className="text-[12px] text-gray-500">
          Find answers to common questions or reach out to our support team.
        </p>
      </div>

      {/* Two-column layout: FAQ left, Contact right */}
      <div className="flex gap-5 items-start">

        {/* Left — FAQ */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 mb-4 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <Search size={14} className="text-gray-300" />
            <input
              type="text"
              placeholder="Search FAQs..."
              className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-[13px] font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[12px] text-gray-400">No matching questions found.</p>
                </div>
              ) : (
                filtered.map((faq, idx) => (
                  <div key={idx}>
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[12px] font-medium text-gray-800 pr-4">{faq.question}</span>
                      {openFaq === idx ? (
                        <ChevronUp size={14} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown size={14} className="text-gray-400 shrink-0" />
                      )}
                    </button>
                    {openFaq === idx && (
                      <div className="px-4 pb-3">
                        <p className="text-[11px] text-gray-500 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right — Contact Cards */}
        <div className="w-[260px] shrink-0 space-y-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Mail size={14} className="text-violet-600" />
              </div>
              <h3 className="text-[13px] font-bold text-gray-900">Email Support</h3>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Reach out to our support team and we'll get back to you within 24 hours.
            </p>
            <p className="text-[11px] font-semibold text-violet-600 mt-2">support@gethired.app</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <MessageCircle size={14} className="text-emerald-600" />
              </div>
              <h3 className="text-[13px] font-bold text-gray-900">Live Chat</h3>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Chat with our team in real-time during business hours for instant help.
            </p>
            <p className="text-[11px] font-semibold text-emerald-600 mt-2">Available Mon–Fri, 9am–6pm</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HelpSupportPage;
