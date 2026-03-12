const Logo = ({ size = 'md', showText = true, dark = false }) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', gap: 'gap-2' },
    md: { icon: 'w-10 h-10', text: 'text-xl', gap: 'gap-2.5' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl', gap: 'gap-3' },
    xl: { icon: 'w-20 h-20', text: 'text-5xl', gap: 'gap-4' },
  };

  const s = sizes[size] || sizes.md;

  // Unique gradient IDs to avoid SVG conflicts when multiple logos render
  const uid = `logo_${size}_${dark ? 'd' : 'l'}`;

  return (
    <div className={`flex items-center ${s.gap}`}>
      {/* Logo Icon — modern shield/checkmark mark */}
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Background shape — squircle */}
          <rect width="48" height="48" rx="14" fill={`url(#${uid}_bg)`} />

          {/* Inner subtle highlight */}
          <rect x="1" y="1" width="46" height="24" rx="13" fill="white" opacity="0.08" />

          {/* Checkmark — bold, confident, perfectly centered */}
          <path
            d="M14.5 25.5L20.5 31.5L33.5 17.5"
            stroke="white"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Accent spark — top right */}
          <circle cx="37" cy="11" r="2.5" fill="white" opacity="0.5" />
          <circle cx="37" cy="11" r="1.2" fill="white" opacity="0.9" />

          <defs>
            <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F46E5" />
              <stop offset="0.45" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#0EA5E9" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <span className={`${s.text} font-extrabold tracking-tight select-none`}>
          <span className={dark ? 'text-white' : 'text-gray-900'}>get</span>
          <span className="bg-gradient-to-r from-indigo-600 via-blue-500 to-sky-500 bg-clip-text text-transparent">.</span>
          <span className="bg-gradient-to-r from-indigo-600 via-blue-500 to-sky-500 bg-clip-text text-transparent">hired</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
