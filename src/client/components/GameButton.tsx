import type { ReactNode, CSSProperties } from 'react';

export const GameButton = ({
  onClick,
  disabled = false,
  children,
  color = 'green',
  className = '',
  style,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  color?: 'green' | 'yellow' | 'indigo';
  className?: string;
  style?: CSSProperties;
}) => {
  const colorMap = {
    green: 'bg-green-500 hover:bg-green-400 text-white shadow-[0_5px_0_0_#15803d] active:shadow-[0_1px_0_0_#15803d]',
    yellow: 'bg-yellow-400 hover:bg-yellow-300 text-indigo-950 shadow-[0_5px_0_0_#a16207] active:shadow-[0_1px_0_0_#a16207]',
    indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_5px_0_0_#3730a3] active:shadow-[0_1px_0_0_#3730a3]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`uppercase font-black text-base sm:text-lg py-3 px-10 rounded-full active:translate-y-[4px] transition-all duration-75 cursor-pointer select-none flex items-center justify-center gap-2 ${colorMap[color]} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};
