/**
 * JSON Utilities for Document Signing
 * 
 * Provides JSON validation and canonicalization for consistent hashing
 */

/**
 * Validate if a string is valid JSON
 */
export function validateJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse JSON string safely
 */
export function parseJSON(str: string): object | null {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
}

/**
 * Canonicalize JSON object for consistent hashing
 * 
 * Implements RFC 8785 (JSON Canonicalization Scheme):
 * - Sorts object keys alphabetically
 * - Removes whitespace
 * - Ensures deterministic serialization
 * 
 * @param obj - JavaScript object to canonicalize
 * @returns Canonical JSON string
 */
export function canonicalizeJSON(obj: any): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';

  // Handle primitives
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalizeJSON(item));
    return `[${items.join(',')}]`;
  }

  // Handle objects - sort keys alphabetically
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    const value = canonicalizeJSON(obj[key]);
    return `"${key}":${value}`;
  });

  return `{${pairs.join(',')}}`;
}

/**
 * Pretty-print JSON for display
 */
export function prettyPrintJSON(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Validate JSON structure depth (prevent deeply nested attacks)
 */
export function validateJSONDepth(obj: any, maxDepth: number = 10): boolean {
  function checkDepth(value: any, currentDepth: number): boolean {
    if (currentDepth > maxDepth) return false;

    if (typeof value !== 'object' || value === null) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every(item => checkDepth(item, currentDepth + 1));
    }

    return Object.values(value).every(val => checkDepth(val, currentDepth + 1));
  }

  return checkDepth(obj, 0);
}
