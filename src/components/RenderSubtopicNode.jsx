import React from 'react';

/**
 * Recursively renders hierarchical subtopic badges at arbitrary depth.
 * Level 1: [Parent › ...]
 * Level 2: [Child › ...]
 * Level 3: [Sub-concept]
 */
export const RenderSubtopicNode = ({ node, depth = 1 }) => {
  if (!node) return null;
  const title = typeof node === 'string' ? node.trim() : (node.title || node.name || '').trim();
  if (!title) return null;
  const items = Array.isArray(node.items) ? node.items : [];
  const hasChildren = items.length > 0;

  const depthStyles = {
    1: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', chevron: '#60A5FA' },
    2: { bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B', chevron: '#94A3B8' },
    3: { bg: '#FAF5FF', border: '#DDD6FE', text: '#6D28D9', chevron: '#A78BFA' },
    4: { bg: '#F0FDF4', border: '#A7F3D0', text: '#047857', chevron: '#34D399' },
  }[Math.min(depth, 4)];

  if (!hasChildren) {
    return (
      <span
        style={{
          background: depthStyles.bg,
          color: depthStyles.text,
          border: `1px solid ${depthStyles.border}`,
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '1px 7px',
          borderRadius: '4px',
        }}
      >
        {title}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: depthStyles.bg,
        color: depthStyles.text,
        border: `1px solid ${depthStyles.border}`,
        fontSize: '0.72rem',
        padding: '2px 7px',
        borderRadius: '5px',
      }}
    >
      <span style={{ fontWeight: 700 }}>{title}</span>
      <span style={{ color: depthStyles.chevron, fontSize: '0.7rem', fontWeight: 800 }}>›</span>
      <span style={{ display: 'inline-flex', gap: '3px', flexWrap: 'wrap' }}>
        {items.map((child, cIdx) => (
          <RenderSubtopicNode key={child.id || cIdx} node={child} depth={depth + 1} />
        ))}
      </span>
    </span>
  );
};
