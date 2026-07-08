export function distinct<T>(items: T[]): T[] {
  return [...new Set(items)];
}
