export function sortByKey<T>(array: T[], key: keyof T): T[] {
  return [...array].sort((a, b) => {
    const x = a[key];
    const y = b[key];

    return x < y ? -1 : x > y ? 1 : 0;
  });
}
