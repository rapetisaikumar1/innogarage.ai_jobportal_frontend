const Logo = ({ size = 'md', showText = true, dark = false }) => {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-[15px]', gap: 'gap-1.5' },
    md: { icon: 'w-9 h-9', text: 'text-lg', gap: 'gap-2' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', gap: 'gap-2.5' },
    xl: { icon: 'w-16 h-16', text: 'text-4xl', gap: 'gap-3' },
  };

  const s = sizes[size] || sizes.md;
  const uid = `logo_${size}_${dark ? 'd' : 'l'}`;

  return (
    <div className={`flex items-center ${s.gap}`}>
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id={`${uid}_top`} x1="6" y1="16" x2="42" y2="6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#67E8F9" />
              <stop offset="1" stopColor="#A5B4FC" />
            </linearGradient>
            <linearGradient id={`${uid}_left`} x1="6" y1="16" x2="18" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id={`${uid}_right`} x1="42" y1="16" x2="30" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#9333EA" />
            </linearGradient>
          </defs>

          {/* Top face — lightest */}
          <path d="M24 4 L44 15 L24 26 L4 15 Z" fill={`url(#${uid}_top)`} />
          {/* Left face — medium */}
          <path d="M4 15 L24 26 L24 46 L4 35 Z" fill={`url(#${uid}_left)`} />
          {/* Right face — darkest */}
          <path d="M24 26 L44 15 L44 35 L24 46 Z" fill={`url(#${uid}_right)`} />

          {/* Edge highlights for depth */}
          <path d="M24 4 L44 15" stroke="white" strokeWidth="0.6" opacity="0.45" />
          <path d="M24 4 L4 15" stroke="white" strokeWidth="0.6" opacity="0.35" />
          <path d="M4 15 L24 26" stroke="white" strokeWidth="0.4" opacity="0.2" />
          <path d="M24 26 L44 15" stroke="white" strokeWidth="0.4" opacity="0.15" />

          {/* Top face inner shine */}
          <path d="M24 8 L38 15 L24 22 L10 15 Z" fill="white" opacity="0.1" />
        </svg>
      </div>

      {showText && (
        <span className={`${s.text} font-extrabold tracking-tight select-none`}>
          <span className={dark ? 'text-white' : 'text-slate-800'}>INNOGARAGE</span>
          <span className="bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">.ai</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
