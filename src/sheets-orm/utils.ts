export function trimIndex(index: number, count: number) {
  if (!count) return 0;
  if (!index) return 0;

  return (count + (index % count)) % count;
}
