export const get = async <Data = unknown>(
  ...[url, init]: Parameters<typeof fetch>
) => {
  const response = await fetch(url, init)
  return (await response.json()) as Data
}

export const post = async <Data = unknown>(
  ...[url, init]: Parameters<typeof fetch>
) => {
  const response = await fetch(url, {
    method: 'POST',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      ...init?.headers,
    },
  })
  return (await response.json()) as Data
}
