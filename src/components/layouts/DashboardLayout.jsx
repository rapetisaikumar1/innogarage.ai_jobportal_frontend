import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../Logo';
import SubscribeDialog from '../SubscribeDialog';
import {
  LayoutDashboard, Briefcase, FileText, GraduationCap, Users, MessageSquare,
  UserCog, BarChart3, BookOpen, Calendar, LogOut, Menu, X, Bell, ChevronDown,
  Settings, StickyNote, UserPlus, Contact, Hash, Trophy, Crown, Megaphone, HelpCircle, Zap
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    if (location.state?.showSubscribe) {
      setShowSubscribe(true);
      // Clear the state so it doesn't re-trigger on navigation
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'STUDENT':
        return [
          { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
          { to: '/dashboard/jobs', icon: Briefcase, label: 'Job Listings' },
          { to: '/dashboard/applications', icon: FileText, label: 'My Applications' },
          { to: '/dashboard/training', icon: GraduationCap, label: 'Training' },
          { to: '/dashboard/notes', icon: StickyNote, label: 'My Notes' },
          { to: '/dashboard/mentoring', icon: Calendar, label: 'Mentoring' },
          { to: '/dashboard/chat', icon: HelpCircle, label: 'Support & Help' },
          { to: '/dashboard/shoutboard', icon: Megaphone, label: 'Shoutboard' },
          { to: '/dashboard/profile', icon: Settings, label: 'Profile' },
        ];
      case 'ADMIN':
        return [
          { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
          { to: '/admin/students', icon: Users, label: 'My Students' },
          { to: '/admin/slots', icon: Calendar, label: 'Time Slots' },
          { to: '/admin/bookings', icon: BookOpen, label: 'Bookings' },
          { to: '/admin/chat', icon: MessageSquare, label: 'Chat' },
          { to: '/admin/profile', icon: Settings, label: 'Profile' },
        ];
      case 'SUPER_ADMIN':
        return [
          { to: '/superadmin', icon: LayoutDashboard, label: 'Dashboard', end: true },
          { to: '/superadmin/admins', icon: UserCog, label: 'Manage Mentors' },
          { to: '/superadmin/students', icon: Users, label: 'Manage Students' },
          { to: '/superadmin/training', icon: GraduationCap, label: 'Training Materials' },
          { to: '/superadmin/analytics', icon: BarChart3, label: 'Analytics', disabled: true },
          { to: '/superadmin/profile', icon: Settings, label: 'Profile' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const useHorizontalNav = isSuperAdmin || isAdmin;
  const roleLabel = isSuperAdmin ? 'Super Admin' : isAdmin ? 'Mentor' : 'Student';

  return (
    <div className={`h-screen bg-[#f8f9fb] ${useHorizontalNav ? 'flex flex-col' : 'flex'} overflow-hidden`}>
      {/* Mobile Overlay — sidebar roles only */}
      {!useHorizontalNav && sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — hidden for Super Admin and Admin */}
      {!useHorizontalNav && (
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-50">
          <Logo size="sm" />
          <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-2 overflow-y-auto sidebar-nav-scroll">
          {(() => {
            const isStudent = user?.role === 'STUDENT';
            const mainItems = isStudent
              ? navItems.filter(i => ['Dashboard', 'Job Listings', 'My Applications'].includes(i.label))
              : navItems.filter(i => i.label !== 'Profile');
            const learnItems = isStudent
              ? navItems.filter(i => ['Training', 'My Notes', 'Mentoring'].includes(i.label))
              : [];
            const communityItems = isStudent
              ? navItems.filter(i => ['Support & Help', 'Shoutboard'].includes(i.label))
              : [];
            const profileItem = navItems.find(i => i.label === 'Profile');

            const renderItem = ({ to, icon: Icon, label, end, disabled }) => (
              disabled ? (
                <div key={to} className="sidebar-link opacity-40 cursor-not-allowed pointer-events-none">
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                </div>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              )
            );

            const SectionLabel = ({ children }) => (
              <p className="px-3 mb-2 mt-5 first:mt-0 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-300">{children}</p>
            );

            return (
              <>
                <SectionLabel>Main</SectionLabel>
                <div className="space-y-0.5">{mainItems.map(renderItem)}</div>

                {learnItems.length > 0 && (
                  <>
                    <SectionLabel>Learning</SectionLabel>
                    <div className="space-y-0.5">{learnItems.map(renderItem)}</div>
                  </>
                )}

                {communityItems.length > 0 && (
                  <>
                    <SectionLabel>Community</SectionLabel>
                    <div className="space-y-0.5">{communityItems.map(renderItem)}</div>
                  </>
                )}

                {/* Upgrade — student only */}
                {isStudent && (
                  <div className="mt-5">
                    <button
                      onClick={() => { setShowSubscribe(true); setSidebarOpen(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all duration-200"
                    >
                      <Crown size={17} strokeWidth={1.8} className="text-violet-200" />
                      <span>Upgrade Plan</span>
                    </button>
                  </div>
                )}

                {/* Profile — always last */}
                {profileItem && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    {renderItem(profileItem)}
                  </div>
                )}
              </>
            );
          })()}
        </nav>

        {/* Bottom — Logout */}
        <div className="px-3 py-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors w-full"
          >
            <LogOut size={16} strokeWidth={2} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${useHorizontalNav ? '' : 'lg:ml-56'}`}>
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30">
          {!useHorizontalNav && (
            <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
          )}

          {useHorizontalNav && (
            <div className="flex items-center">
              <Logo size="sm" />
            </div>
          )}

          <div className="flex-1 hidden sm:flex items-center pl-4">
          </div>

          <div className="flex items-center gap-5">
            {/* Achievers */}
            <button
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 transition-all text-gray-600 hover:text-gray-800 text-[13px] font-medium border border-gray-200 shadow-sm group"
              onClick={() => navigate('/dashboard/achievers')}
            >
              <Trophy size={15} strokeWidth={2} className="text-amber-500" />
              Achievers
            </button>

            {/* Notifications */}
            <button className="relative text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-xl hover:bg-gray-100">
              <Bell size={20} strokeWidth={1.8} />
              <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">3</span>
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2.5 py-1 px-1 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => setProfileDropdown(!profileDropdown)}
              >
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  {user?.registrationNumber && (
                    <span className="text-xs font-bold text-gray-800 leading-tight tracking-wide">{user.registrationNumber}</span>
                  )}
                  <span className="text-[11px] text-gray-400 leading-tight mt-0.5">{user?.fullName}</span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${profileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18)] border border-gray-200/80 z-50 overflow-hidden">
                    {/* User details */}
                    <div className="px-4 pt-4 pb-3.5 text-center">
                      <p className="text-[15px] font-bold text-gray-900">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                      {user?.phone && (
                        <p className="text-xs text-gray-500 mt-0.5">{user.phone}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-gray-100 py-1.5 px-2">
                      <button
                        onClick={() => {
                          setProfileDropdown(false);
                          navigate(user?.role === 'SUPER_ADMIN' ? '/superadmin/profile' : user?.role === 'ADMIN' ? '/admin/profile' : '/dashboard/profile');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Contact size={16} className="text-gray-400" />
                        My Profile
                      </button>
                      {user?.registrationNumber && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(user.registrationNumber); setProfileDropdown(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-primary-700 bg-primary-50/60 hover:bg-primary-50 transition-colors"
                        >
                          <Hash size={16} className="text-primary-400" />
                          {user.registrationNumber}
                        </button>
                      )}
                      <button
                        onClick={() => { setProfileDropdown(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} className="text-red-400" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Horizontal Nav — Super Admin & Admin */}
        {useHorizontalNav && (
          <div className="px-4 lg:px-6 shrink-0">
            <div className="flex items-center justify-center gap-6 overflow-x-auto scrollbar-hide py-3">
              {navItems.map(({ to, icon: Icon, label, end, disabled }) => (
                disabled ? (
                  <div
                    key={to}
                    className="flex items-center gap-2 text-[13px] font-medium text-gray-300 cursor-not-allowed whitespace-nowrap select-none"
                  >
                    <Icon size={15} strokeWidth={1.8} />
                    <span>{label}</span>
                  </div>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${
                        isActive
                          ? 'text-gray-900 font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`
                    }
                  >
                    <Icon size={13} strokeWidth={1.8} />
                    <span>{label}</span>
                  </NavLink>
                )
              ))}
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto ${useHorizontalNav ? 'p-4 lg:p-5' : 'p-5 lg:p-7'}`}>
          <Outlet />

          {/* Footer — Super Admin & Admin */}
          {useHorizontalNav && (
            <footer className="mt-12 text-gray-600 py-12 border-t border-gray-200 -mx-4 lg:-mx-5 px-8 lg:px-12 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                  <div className="md:col-span-1">
                    <Logo size="md" />
                    <p className="mt-4 text-[13px] leading-relaxed text-gray-500">
                      Your AI-powered career copilot. Build resumes, apply to jobs, connect with mentors — all in one platform.
                    </p>
                    <div className="flex items-center gap-3 mt-5">
                      <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">✉ support@gethired.app</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-gray-900 font-semibold mb-4 text-[13px] uppercase tracking-wider">Platform</h4>
                    <ul className="space-y-3 text-[13px]">
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Job Discovery</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Resume Builder</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Mentorship</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Training Hub</span></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-gray-900 font-semibold mb-4 text-[13px] uppercase tracking-wider">Product</h4>
                    <ul className="space-y-3 text-[13px]">
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Smart Matching</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Quick Apply</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Skill Insights</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Tailored Resumes</span></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-gray-900 font-semibold mb-4 text-[13px] uppercase tracking-wider">Company</h4>
                    <ul className="space-y-3 text-[13px]">
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">About</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Privacy Policy</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Terms of Service</span></li>
                      <li><span className="hover:text-gray-900 transition-colors cursor-default">Contact</span></li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[13px] text-gray-500">&copy; {new Date().getFullYear()} get.hired &mdash; All rights reserved.</p>
                  <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <Zap size={14} className="text-amber-400" />
                    <span>Built with passion for job seekers everywhere.</span>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </main>
      </div>

      {/* Subscribe Dialog */}
      <SubscribeDialog isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />
    </div>
  );
};

export default DashboardLayout;
