/**
 * Returns `prev` if `next` is structurally identical (by JSON.stringify),
 * preserving referential identity so React.memo and shallow comparisons
 * can skip unnecessary re-renders.
 */
export function stableUpdate<T>(prev: T, next: T): T {
  return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
}
