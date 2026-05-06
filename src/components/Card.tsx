import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

interface Props extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
  noAnimate?: boolean;
}

export function Card({ children, delay = 0, noAnimate, className = '', ...rest }: Props) {
  const cls = `bg-surface rounded-[22px] p-5 shadow-[var(--shadow-card)] border border-border ${className}`;
  if (noAnimate) {
    return <div className={cls}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cls}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
