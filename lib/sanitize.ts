/**
 * Sanitizes an object to be strictly safe for Firestore writes.
 * Recursively strips any keys with `undefined` values and converts invalid types.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  if (typeof data === "object") {
    // Keep Date instances or objects with specific prototypes intact if needed
    if (data instanceof Date) {
      return data;
    }

    const cleanObject: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleanObject[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObject as T;
  }

  return data;
}

/**
 * Validates text string safely
 */
export function safeTrim(input: unknown, maxLength = 10000): string {
  if (typeof input !== "string") {
    return "";
  }
  return input.trim().slice(0, maxLength);
}
