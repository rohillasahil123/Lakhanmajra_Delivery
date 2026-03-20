import React, { useState } from 'react';

interface ActionIconButtonProps {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  color?: string;
}

/**
 * Reusable icon button for table actions (edit, delete, view)
 */
export function ActionIconButton({
  children,
  title,
  onClick,
  danger = false,
  disabled = false,
  color,
}: Readonly<ActionIconButtonProps>) {
  const [hovering, setHovering] = useState(false);

  let btnColor = '#8b92a9';
  let btnBg = '#fff';
  let btnBorder = '#e8eaf0';

  if (hovering && !disabled) {
    btnBg = danger ? '#fff1f2' : '#f5f6fa';
    btnColor = danger ? '#ef4444' : '#0f1623';
    btnBorder = danger ? '#fecdd3' : '#e8eaf0';
  }

  const effectiveColor = disabled ? '#a3a3a3' : color || btnColor;

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: 27,
        height: 27,
        borderRadius: 7,
        border: `1px solid ${btnBorder}`,
        background: btnBg,
        color: effectiveColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
        opacity: disabled ? 0.5 : 1,
        fontSize: 0,
      }}
    >
      {children}
    </button>
  );
}
