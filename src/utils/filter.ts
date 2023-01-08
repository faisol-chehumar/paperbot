export function clearUndefinedFromObject<T extends object = object>(
  obj: T
): Record<string, any> {
  return (Object.keys(obj) as (keyof T)[]).reduce((acc, key) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      acc[key as string] = obj[key]
    }
    return acc
  }, {} as Record<string, any>)
}
