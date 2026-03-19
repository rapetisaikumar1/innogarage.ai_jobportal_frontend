import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import Logo from './Logo';

const AuthFooter = () => {
  return (
    <footer className="bg-white text-gray-600 py-12 mt-auto border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo size="md" />
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Your AI-powered career copilot. Build resumes, apply to jobs, connect with mentors — all in one platform.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">✉ support@innogarage.ai</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="hover:text-gray-900 transition-colors">Home</Link></li>
              <li><Link to="/login" className="hover:text-gray-900 transition-colors">Sign In</Link></li>
              <li><Link to="/signup" className="hover:text-gray-900 transition-colors">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><span className="hover:text-gray-900 transition-colors cursor-default">Job Discovery</span></li>
              <li><span className="hover:text-gray-900 transition-colors cursor-default">Resume Builder</span></li>
              <li><span className="hover:text-gray-900 transition-colors cursor-default">Mentorship</span></li>
              <li><span className="hover:text-gray-900 transition-colors cursor-default">Training Hub</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><span className="hover:text-gray-900 transition-colors cursor-default">About</span></li>
              <li><span className="hover:text-gray-900 transition-colors cursor-default">Privacy Policy</span></li>
              <li><span className="hover:text-gray-900 transition-colors cursor-default">Terms of Service</span></li>
              <li><span className="hover:text-gray-900 transition-colors cursor-default">Contact</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} INNOGARAGE.ai &mdash; All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Zap size={14} className="text-amber-400" />
            <span>Built with passion for job seekers everywhere.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AuthFooter;
