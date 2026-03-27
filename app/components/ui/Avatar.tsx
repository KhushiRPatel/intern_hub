const COLORS = [
  'bg-primary-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-orange-500',
  'bg-pink-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-cyan-600',
];

const SIZES = {
  xs: 'w-6  h-6  text-xs',
  sm: 'w-8  h-8  text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  src?: string;
  className?: string;
}

export function Avatar({ name, size = 'md', src, className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${SIZES[size]} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      className={`${SIZES[size]} ${colorFor(name)} rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none ${className}`}
    >
      {initials(name)}
    </div>
  );
}
