import React from 'react';

const COLORS = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
];

export default function Avatar({ name }: Readonly<{ name: string }>) {
  const index = (name.codePointAt(0) ?? 0) % COLORS.length;

  return (
    <div
      className={`w-9 h-9 rounded-full bg-gradient-to-br ${COLORS[index]} flex items-center justify-center text-white font-semibold`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
