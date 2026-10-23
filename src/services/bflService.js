import { BFL_API_BASE_URL, ENDPOINT_ALIASES, DEFAULT_MODEL } from '../constants.js';

/**
 * Resolves a model name / alias to the official BFL API endpoint identifier.
 * @param {string} endpoint
 * @returns {string}
 */
export function resolveEndpoint(endpoint) {
  if (!endpoint) return DEFAULT_MODEL;
  const normalized = endpoint.toLowerCase().trim();
  return ENDPOINT_ALIASES[normalized] || endpoint.trim();
}

/**
 * Initiates an image generation request at BFL API.
 * @param {Object} params
 * @param {string} params.apiKey
 * @param {string} params.prompt
 * @param {string} [params.endpoint]
 * @param {number} [params.width]
 * @param {number} [params.height]
 * @param {number|string} [params.seed]
 * @param {boolean} [params.prompt_upsampling]
 * @returns {Promise<Object>}
 */
export async function submitGenerationTask({ apiKey, prompt, endpoint, width, height, seed, prompt_upsampling }) {
  const targetEndpoint = resolveEndpoint(endpoint);
  const apiTarget = `${BFL_API_BASE_URL}/${targetEndpoint}`;

  const requestBody = {
    prompt: prompt.trim(),
    width: Number(width) || 1024,
    height: Number(height) || 1024
  };

  if (seed !== undefined && seed !== null && seed !== '') {
    if (targetEndpoint !== 'flux-3-image') {
      requestBody.seed = Number(seed);
    }
  }

  if (['flux-pro-1.1', 'flux-dev', 'flux-2-flex'].includes(targetEndpoint)) {
    requestBody.prompt_upsampling = Boolean(prompt_upsampling);
  }

  const response = await fetch(apiTarget, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'x-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || data.detail || data.message || 'Error starting image generation');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return {
    id: data.id,
    pollingUrl: data.polling_url || `${BFL_API_BASE_URL}/get_result?id=${data.id}`,
    cost: data.cost !== undefined ? data.cost : null,
    usedSeed: requestBody.seed
  };
}

/**
 * Polls for the image result until ready, failed, or timed out.
 * @param {Object} options
 * @param {string} options.pollingUrl
 * @param {string} options.apiKey
 * @param {number} [options.maxRetries=60]
 * @param {number} [options.intervalMs=1500]
 * @returns {Promise<Object>}
 */
export async function pollTaskResult({ pollingUrl, apiKey, maxRetries = 60, intervalMs = 1500 }) {
  let attempts = 0;

  while (attempts < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;

    const pollResponse = await fetch(pollingUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-key': apiKey
      }
    });

    if (!pollResponse.ok) {
      const errorData = await pollResponse.json().catch(() => ({}));
      const error = new Error('Error fetching status');
      error.status = pollResponse.status;
      error.details = errorData;
      throw error;
    }

    const pollData = await pollResponse.json();
    const status = pollData.status;

    if (status === 'Ready') {
      return pollData;
    }

    if (status === 'Error' || status === 'Failed') {
      const error = new Error('Image generation failed');
      error.status = 500;
      error.details = pollData;
      throw error;
    }
  }

  const timeoutError = new Error('Timeout: The image was not completed in time.');
  timeoutError.status = 504;
  timeoutError.pollingUrl = pollingUrl;
  throw timeoutError;
}

/**
 * Fetches the current credits balance for the account.
 * @param {string} apiKey
 * @returns {Promise<number>}
 */
export async function fetchAccountCredits(apiKey) {
  const response = await fetch(`${BFL_API_BASE_URL}/credits`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-key': apiKey
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || data.detail || 'Failed to fetch credits');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data.credits;
}
