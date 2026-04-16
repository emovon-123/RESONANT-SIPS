const request = async (method, url, body) => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `${response.status}`;
    throw new Error(message);
  }

  return data || {};
};

export const getStoryworldCharacterByName = async (query, options = {}) => {
  const data = await request('POST', '/api/mcp/character/get_by_name', {
    query,
    cacheRemote: Boolean(options?.cacheRemote),
  });
  return data.character || null;
};

export const ensureStoryworldCharacterCached = async (query) => {
  return getStoryworldCharacterByName(query, { cacheRemote: true });
};

export const searchStoryworldCharacters = async (query, limit = 20) => {
  const data = await request('POST', '/api/mcp/character/search', { query, limit });
  return Array.isArray(data.results) ? data.results : [];
};
