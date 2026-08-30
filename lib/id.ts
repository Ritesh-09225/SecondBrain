export function createTimestamp(): number {
  return Date.now();
}

export function createId(prefix = "item"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
