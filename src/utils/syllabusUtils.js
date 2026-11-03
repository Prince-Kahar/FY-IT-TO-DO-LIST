// Utility for parsing and formatting academic syllabus subtopics and nested sub-subtopics
// Supports arbitrary recursive depth using curly braces { } for nesting.
// Parentheses ( ) are strictly preserved as normal text (e.g. "(Theory)", "(Intro)") and never split.

/**
 * Splits a string at top-level delimiters (commas, semicolons, or newlines)
 * that are NOT inside curly braces { }.
 */
export const splitTopLevel = (str, delimiters = [',', ';', '\n']) => {
  if (!str || typeof str !== 'string') return [];
  const result = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{') {
      depth++;
      current += ch;
    } else if (ch === '}') {
      if (depth > 0) depth--;
      current += ch;
    } else if (depth === 0 && delimiters.includes(ch)) {
      const trimmed = current.trim();
      if (trimmed) result.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  const trimmed = current.trim();
  if (trimmed) result.push(trimmed);
  return result;
};

/**
 * Recursively parses a string using curly braces { } for arbitrary nesting depth:
 * "Trees {Binary {BST {Insert, Delete}, AVL}, B-Tree}, Graphs {Directed, Undirected}"
 */
export const parseRecursiveString = (str) => {
  if (!str || typeof str !== 'string') return [];
  const trimmed = str.trim();
  if (!trimmed) return [];

  const blocks = splitTopLevel(trimmed);
  const result = [];

  for (const block of blocks) {
    const firstBrace = block.indexOf('{');
    if (firstBrace === -1) {
      if (block.trim()) {
        result.push({ title: block.trim(), items: [] });
      }
      continue;
    }

    const title = block.slice(0, firstBrace).trim();
    // Find matching closing brace
    let depth = 0;
    let closingBrace = -1;
    for (let i = firstBrace; i < block.length; i++) {
      if (block[i] === '{') {
        depth++;
      } else if (block[i] === '}') {
        depth--;
        if (depth === 0) {
          closingBrace = i;
          break;
        }
      }
    }

    const inner =
      closingBrace !== -1
        ? block.slice(firstBrace + 1, closingBrace)
        : block.slice(firstBrace + 1);

    const childItems = parseRecursiveString(inner);
    result.push({
      title: title || 'Untitled',
      items: childItems,
    });
  }

  return result;
};

/**
 * Normalizes any node (string or object) recursively into { title, items }
 */
export const normalizeSubtopicNode = (node) => {
  if (typeof node === 'string') {
    const trimmed = node.trim();
    if (!trimmed) return null;
    if (trimmed.includes('{') && trimmed.includes('}')) {
      const parsed = parseRecursiveString(trimmed);
      if (parsed.length === 1) return parsed[0];
      if (parsed.length > 1) {
        return { title: parsed[0].title, items: parsed.slice(1) };
      }
    }
    return { title: trimmed, items: [] };
  }

  if (!node || typeof node !== 'object') return null;
  const title = (node.title || node.name || '').trim();
  if (!title) return null;

  let childItems = [];
  if (Array.isArray(node.items)) {
    childItems = node.items.map(normalizeSubtopicNode).filter(Boolean);
  }

  return {
    title,
    items: childItems,
  };
};

/**
 * Parses subtopic string or structured data into an arbitrary depth nested hierarchy:
 * [
 *   {
 *     title: "Arithmetic mean",
 *     items: [
 *       { title: "Direct method", items: [] },
 *       { title: "Shortcut method", items: [] }
 *     ]
 *   }
 * ]
 */
export const parseSubtopicsHierarchy = (rawSubtopic, subtopicsData = null) => {
  // If structured data is already present and valid, normalize recursively
  if (Array.isArray(subtopicsData) && subtopicsData.length > 0) {
    return subtopicsData.map(normalizeSubtopicNode).filter(Boolean);
  }

  if (!rawSubtopic) return [];
  if (Array.isArray(rawSubtopic)) {
    return rawSubtopic.map(normalizeSubtopicNode).filter(Boolean);
  }

  const str = String(rawSubtopic).trim();
  if (!str) return [];

  return parseRecursiveString(str);
};

/**
 * Formats a hierarchical subtopics list into a clean, human-readable string using { } for arbitrary nesting:
 * "Trees {Binary {BST {Insert, Delete}, AVL}, B-Tree}, Graphs {Directed, Undirected}"
 */
export const formatSubtopicsToString = (hierarchy) => {
  if (!Array.isArray(hierarchy) || hierarchy.length === 0) return '';
  return hierarchy
    .map((node) => {
      if (typeof node === 'string') return node.trim();
      const title = (node.title || node.name || '').trim();
      if (!title) return '';
      const children = Array.isArray(node.items) ? node.items : [];
      if (children.length > 0) {
        const formattedChildren = formatSubtopicsToString(children);
        if (formattedChildren) {
          return `${title} {${formattedChildren}}`;
        }
      }
      return title;
    })
    .filter(Boolean)
    .join(', ');
};

/**
 * Flattens any arbitrary depth tree of subtopics into an array of options with full breadcrumb paths:
 * [
 *   { title: "Binary", path: "Binary", hasChildren: true },
 *   { title: "BST", path: "Binary › BST", hasChildren: true },
 *   { title: "Insert", path: "Binary › BST › Insert", hasChildren: false }
 * ]
 */
export const flattenDescendants = (items, prefix = '') => {
  if (!Array.isArray(items)) return [];
  const result = [];
  for (const item of items) {
    const title = typeof item === 'string' ? item.trim() : (item.title || item.name || '').trim();
    if (!title) continue;
    const currentPath = prefix ? `${prefix} › ${title}` : title;
    const children = Array.isArray(item.items) ? item.items : [];
    result.push({
      title,
      path: currentPath,
      hasChildren: children.length > 0,
    });
    if (children.length > 0) {
      result.push(...flattenDescendants(children, currentPath));
    }
  }
  return result;
};
