import React from 'react';
import { Square, CheckSquare } from 'lucide-react';

/**
 * WorkSync Universal Standard Checkbox Component (Rule 5: Strict Universal CustomCheckbox)
 * Uses Lucide Square / CheckSquare with monochrome stroke styling matching Navbar & theme.
 */
export default function CustomCheckbox({
  checked = false,
  onChange,
  label,
  children,
  size = 18,
  disabled = false,
  style = {},
  labelStyle = {},
  id,
  className = ''
}) {
  const handleClick = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (onChange) onChange(!checked);
    }
  };

  const displayText = label || children;

  return (
    <label
      id={id}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={checked}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '15px',
        fontWeight: checked ? 600 : 400,
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
        ...style
      }}
    >
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0, 
        color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' 
      }}>
        {checked ? (
          <CheckSquare size={size} strokeWidth={2} />
        ) : (
          <Square size={size} strokeWidth={2} />
        )}
      </span>
      {displayText && (
        <span style={labelStyle}>
          {displayText}
        </span>
      )}
    </label>
  );
}
