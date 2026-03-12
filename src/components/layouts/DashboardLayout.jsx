import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../Logo';
import SubscribeDialog from '../SubscribeDialog';
import {
  LayoutDashboard, Briefcase, FileText, GraduationCap, Users, MessageSquare,
  UserCog, BarChart3, BookOpen, Calendar, LogOut, Menu, X, Bell, ChevronDown,
  Settings, StickyNote, UserPlus, Contact, Hash, Trophy, Crown, Megaphone, HelpCircle
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
          { to: '/superadmin/assign-mentor', icon: UserPlus, label: 'Assign Mentor', disabled: true },
          { to: '/superadmin/training', icon: GraduationCap, label: 'Training Materials' },
          { to: '/superadmin/analytics', icon: BarChart3, label: 'Analytics', disabled: true },
          { to: '/superadmin/profile', icon: Settings, label: 'Profile' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Mentor' : 'Student';

  return (
    <div className="h-screen bg-[#f8f9fb] flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-50">
          <Logo size="sm" />
          <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-5 pb-2 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-300">Navigation</p>
          <div className="space-y-0.5">
            {navItems.filter(item => item.label !== 'Profile').map(({ to, icon: Icon, label, end, disabled }) => (
              disabled ? (
                <div
                  key={to}
                  className="sidebar-link opacity-40 cursor-not-allowed pointer-events-none"
                >
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
            ))}

            {/* Upgrade — opens subscribe dialog */}
            {user?.role === 'STUDENT' && (
              <button
                onClick={() => { setShowSubscribe(true); setSidebarOpen(false); }}
                className="sidebar-link w-full text-amber-700 hover:bg-amber-50"
              >
                <Crown size={17} strokeWidth={1.8} className="text-amber-500" />
                <span>Upgrade</span>
              </button>
            )}

            {/* Profile — always last */}
            {navItems.filter(item => item.label === 'Profile').map(({ to, icon: Icon, label, end }) => (
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
            ))}
          </div>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-56">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30">
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex-1 hidden sm:flex items-center pl-4">
          </div>

          <div className="flex items-center gap-5">
            {/* Achievers */}
            <button
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-all text-amber-700 hover:text-amber-800 text-[13px] font-semibold tracking-wide group"
              onClick={() => navigate('/dashboard/achievers')}
            >
              <Trophy size={18} strokeWidth={2} className="text-amber-500 group-hover:scale-110 transition-transform" />
              Achievers
            </button>

            {/* Notifications */}
            <button className="relative text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-xl hover:bg-gray-100">
              <Bell size={20} strokeWidth={1.8} />
              <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">3</span>
            </button>

            {/* Divider */}
            <div className="h-7 w-px bg-gray-200" />

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

        {/* Page Content */}
        <main className="flex-1 p-5 lg:p-7 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Subscribe Dialog */}
      <SubscribeDialog isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />
    </div>
  );
};

export default DashboardLayout;
