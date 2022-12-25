export const get = async <Data = unknown>(
  ...parameters: Parameters<typeof fetch>
) => {
  const response = await fetch(...parameters)
  return (await response.json()) as Data
}

export const post = async <Data = unknown>(
  ...[url, ...rest]: Parameters<typeof fetch>
) => {
  const response = await fetch(url, {
    method: 'POST',
    ...rest,
  })
  return (await response.json()) as Data
}
