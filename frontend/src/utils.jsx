import { isEmpty, isEqual, xorWith, cloneDeep } from 'lodash'

const arrayEquals = (x, y) => isEmpty(xorWith(x, y, isEqual))

const deepCopy = (obj) => cloneDeep(obj)

const sortByKey = (array, key) => {
  // Return a copy of array of objects sorted
  // by the given key
  return array.sort(function (a, b) {
    var x = a[key]
    var y = b[key]
    return x < y ? -1 : x > y ? 1 : 0
  })
}

export { arrayEquals, deepCopy, isEmpty, sortByKey }
