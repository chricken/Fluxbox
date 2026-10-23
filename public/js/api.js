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

/**
 * Sends a request to expand a prompt using the configured LLM provider.
 *
 * @param {Object} payload
 * @param {string} payload.provider
 * @param {string} payload.model
 * @param {string} payload.apiKey
 * @param {string} payload.prompt
 * @param {string} [payload.generalPrompt]
 * @returns {Promise<string[]>} List of expanded prompt strings
 */
export async function generateLLMPrompts(payload) {
  const response = await fetch('/api/llm/generate-prompts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate prompt variations with LLM');
  }

  return data.prompts || [];
}

/**
 * Sends a request to refine/enhance a single prompt using the configured LLM provider.
 *
 * @param {Object} payload
 * @param {string} payload.provider
 * @param {string} payload.model
 * @param {string} payload.apiKey
 * @param {string} payload.prompt
 * @param {'detail'|'general'} [payload.promptType='detail']
 * @returns {Promise<string>} Refined prompt string
 */
export async function refinePromptWithLLM(payload) {
  const response = await fetch('/api/llm/refine-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to refine prompt with LLM');
  }

  return data.refinedPrompt || '';
}

/**
 * Opens the native server-side folder picker dialog or returns default path.
 * @returns {Promise<{ success?: boolean, folderPath?: string, canceled?: boolean, defaultFolder?: string }>}
 */
export async function selectFolderOnServer() {
  const response = await fetch('/api/select-folder', { method: 'POST' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to select folder');
  }
  return data;
}

/**
 * Gets default save directory from server.
 * @returns {Promise<string>}
 */
export async function getDefaultSaveDirectory() {
  const response = await fetch('/api/default-folder');
  const data = await response.json();
  return data.defaultFolder || '';
}

/**
 * Sends a list of images to be saved to a specific directory on the server/machine.
 * @param {Object} payload
 * @param {string} payload.folderPath
 * @param {Array<{ url: string, filename?: string, seed?: number|string, id?: string }>} payload.images
 * @returns {Promise<Object>}
 */
export async function saveAllImagesToServer(payload) {
  const response = await fetch('/api/save-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to save images to folder');
  }
  return data;
}
