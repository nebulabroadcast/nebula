export const sortByKey = (array: any[], key: string) => {
  // Return a copy of array of objects sorted
  // by the given key
  return array.sort(function (a, b) {
    const x = a[key];
    const y = b[key];
    return x < y ? -1 : x > y ? 1 : 0;
  });
};
