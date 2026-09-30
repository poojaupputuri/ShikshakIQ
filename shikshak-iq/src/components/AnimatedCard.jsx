import { motion } from 'framer-motion';

export default function AnimatedCard({
  children,
  className = '',
  glow = 'purple',
  delay = 0,
  onClick,
  href,
  as = 'div',
  whileHover = { y: -4, scale: 1.02 },
}) {
  const glowColors = {
    purple: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]',
    blue: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    cyan: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]',
    pink: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]',
    green: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    none: '',
  };

  const Component = motion[as];

  return (
    <Component
      onClick={onClick}
      href={href}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      whileHover={onClick || href ? whileHover : undefined}
      className={`
        glass rounded-2xl p-6
        transition-all duration-300
        ${glowColors[glow] || glowColors.purple}
        ${onClick || href ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}
