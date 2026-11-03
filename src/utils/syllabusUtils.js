// Utility for parsing and formatting academic syllabus subtopics and nested sub-subtopics

/**
 * Parses subtopic string or structured data into a nested hierarchy:
 * [
 *   {
 *     title: "Arithmetic mean",
 *     items: ["Direct method", "Shortcut method", "Step deviation method"]
 *   },
 *   {
 *     title: "Geometric mean",
 *     items: []
 *   }
 * ]
 */
export const parseSubtopicsHierarchy = (rawSubtopic, subtopicsData = null) => {
  // If structured data is already present and valid, use it directly
  if (Array.isArray(subtopicsData) && subtopicsData.length > 0) {
    return subtopicsData
      .map((st) => {
        if (typeof st === 'string') {
          return { title: st.trim(), items: [] };
        }
        return {
          title: (st.title || st.name || '').trim(),
          items: Array.isArray(st.items)
            ? st.items.map((it) => String(it).trim()).filter(Boolean)
            : [],
        };
      })
      .filter((st) => st.title.length > 0);
  }

  if (!rawSubtopic) return [];
  if (Array.isArray(rawSubtopic)) {
    return rawSubtopic
      .map((s) => ({ title: String(s).trim(), items: [] }))
      .filter((s) => s.title.length > 0);
  }

  const str = String(rawSubtopic).trim();
  if (!str) return [];

  // Determine delimiter: semicolon / pipe or comma outside parentheses
  let blocks = [];
  if (str.includes(';') || str.includes('|')) {
    blocks = str.split(/[;|]+/).map((b) => b.trim()).filter(Boolean);
  } else {
    // Split by commas that are NOT inside parentheses
    // e.g. "A (x, y), B, C (z)" -> ["A (x, y)", "B", "C (z)"]
    const regex = /,(?![^(]*\))/g;
    blocks = str.split(regex).map((b) => b.trim()).filter(Boolean);
  }

  const result = [];
  for (const block of blocks) {
    // 1. Check for "Parent (item1, item2)" pattern
    const parenMatch = block.match(/^([^(]+)\(([^)]+)\)$/);
    if (parenMatch) {
      const title = parenMatch[1].trim();
      const items = parenMatch[2]
        .split(/[,;\n]+/)
        .map((i) => i.trim())
        .filter(Boolean);
      if (title) {
        result.push({ title, items });
        continue;
      }
    }

    // 2. Check for "Parent: item1, item2" pattern
    if (block.includes(':')) {
      const colonIdx = block.indexOf(':');
      const title = block.slice(0, colonIdx).trim();
      const items = block
        .slice(colonIdx + 1)
        .split(/[,;\n]+/)
        .map((i) => i.trim())
        .filter(Boolean);
      if (title) {
        result.push({ title, items });
        continue;
      }
    }

    // 3. Check for "Parent > item1, item2" pattern
    if (block.includes('>')) {
      const gtIdx = block.indexOf('>');
      const title = block.slice(0, gtIdx).trim();
      const items = block
        .slice(gtIdx + 1)
        .split(/[,;\n]+/)
        .map((i) => i.trim())
        .filter(Boolean);
      if (title) {
        result.push({ title, items });
        continue;
      }
    }

    // 4. Standalone subtopic without children
    if (block) {
      result.push({ title: block, items: [] });
    }
  }

  return result;
};

/**
 * Formats a hierarchical subtopics list into a clean, human-readable string:
 * "Arithmetic mean (Direct method, Shortcut method), Geometric mean, Harmonic mean"
 */
export const formatSubtopicsToString = (hierarchy) => {
  if (!Array.isArray(hierarchy) || hierarchy.length === 0) return '';
  return hierarchy
    .map((st) => {
      const cleanTitle = (st.title || '').trim();
      if (!cleanTitle) return '';
      const cleanItems = (st.items || []).map((i) => String(i).trim()).filter(Boolean);
      if (cleanItems.length > 0) {
        return `${cleanTitle} (${cleanItems.join(', ')})`;
      }
      return cleanTitle;
    })
    .filter(Boolean)
    .join(', ');
};

