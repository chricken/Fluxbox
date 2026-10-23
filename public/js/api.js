/**
 * API client module for interacting with the backend endpoints.
 */

/**
 * Sends a generation request to the server.
 *
 * @param {Object} payload
 * @param {string} payload.apiKey
 * @param {string} payload.prompt
 * @param {string} payload.endpoint
 * @param {number} payload.width
 * @param {number} payload.height
 * @param {number} [payload.seed]
 * @returns {Promise<Object>}
 */
export async function generateImage(payload) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    let errText = data.error || 'Generation failed';
    if (data.details) {
      if (typeof data.details === 'string') {
        errText += `: ${data.details}`;
      } else if (data.details.message) {
        errText += `: ${data.details.message}`;
      } else if (data.details.detail) {
        errText += `: ${JSON.stringify(data.details.detail)}`;
      }
    }
    const error = new Error(errText);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

/**
 * Fetches the credit balance for the given API key.
 *
 * @param {string} apiKey
 * @returns {Promise<number>}
 */
export async function fetchCredits(apiKey) {
  const res = await fetch('/api/credits', {
    headers: { 'x-key': apiKey }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch credits');
  }

  const data = await res.json();
  return data.credits;
}
