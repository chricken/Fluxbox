/**
 * Service for interfacing with multiple LLM providers:
 * - OpenAI (ChatGPT)
 * - Anthropic (Claude)
 * - Mistral AI
 * - Google Gemini
 */

/**
 * System prompt designed to instruct the LLM to expand a user prompt into distinct image generation prompts.
 */
const SYSTEM_INSTRUCTION = `You are an expert AI prompt engineer specialized in text-to-image models like FLUX.
Your task is to take a user instruction/prompt (and an optional General / Style / Base prompt) and generate the exact list of distinct, detailed image generation prompts requested by the user.

Rules:
1. Return ONLY a valid JSON object in this exact format:
{
  "prompts": [
    "first detailed prompt...",
    "second detailed prompt..."
  ]
}
2. If the user mentions a specific number of items (e.g., "10 faces of different ethnicities in different professions"), generate exactly that number of high quality prompts.
3. If no specific count is mentioned, generate 3 to 5 creative variations following the user's intent.
4. If a "General Prompt" / "Base Style Prompt" is provided, incorporate its stylistic, atmospheric, camera, mood, or thematic instructions into each generated prompt variation to ensure overall consistency while making each variation unique.
5. Each prompt must be self-contained, descriptive, and optimized for image generation (visual details, lighting, subject, setting).
6. Output ONLY pure raw JSON without markdown formatting or code blocks.`;

/**
 * System prompt designed to instruct the LLM to refine and enhance a single prompt for image generation models (FLUX).
 */
const REFINE_SYSTEM_INSTRUCTION = `You are an expert AI prompt engineer specialized in text-to-image models, specifically Black Forest Labs FLUX.
Your task is to take a user's prompt (which might be a detail prompt or a general/style prompt) and rewrite it into a significantly enhanced, highly vivid, descriptive, and well-structured prompt optimized for FLUX.

Rules:
1. Preserve the original core subject, mood, and creative intent of the user.
2. Add sensory richness: visual clarity, lighting, camera composition, texture, color nuance, materials, and atmospheric depth.
3. Keep it coherent and avoid contradictory descriptors or meaningless buzzword spam.
4. Output ONLY the refined prompt text directly. Do not include markdown quotes, introductory text like "Here is...", or explanations.`;

/**
 * Helper to execute fetch with exponential backoff for transient HTTP errors (429, 502, 503, 504)
 */
async function fetchWithRetry(url, options, maxRetries = 2, initialDelayMs = 1200) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);
      // Status codes that indicate temporary server overload or rate limiting
      if ([429, 502, 503, 504].includes(response.status) && attempt < maxRetries) {
        attempt++;
        const backoff = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[LLM Service] Request returned HTTP ${response.status}. Retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        const backoff = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[LLM Service] Network error (${err.message}). Retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Generate prompts using OpenAI API (ChatGPT)
 */
async function callOpenAI({ apiKey, model, userPrompt }) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'OpenAI API request failed';
    throw new Error(`OpenAI Error (${response.status}): ${errorMsg}`);
  }

  const content = data.choices?.[0]?.message?.content;
  return parsePromptsFromText(content);
}

/**
 * Generate prompts using Anthropic Claude API
 */
async function callClaude({ apiKey, model, userPrompt }) {
  const endpoint = 'https://api.anthropic.com/v1/messages';
  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'Claude API request failed';
    throw new Error(`Claude Error (${response.status}): ${errorMsg}`);
  }

  const textBlock = data.content?.find(b => b.type === 'text')?.text || '';
  return parsePromptsFromText(textBlock);
}

/**
 * Generate prompts using Mistral AI API
 */
async function callMistral({ apiKey, model, userPrompt }) {
  const endpoint = 'https://api.mistral.ai/v1/chat/completions';
  const selectedModel = model || 'mistral-small-latest';

  let response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    })
  });

  // If 503 (server overloaded) occurs and the model was mistral-large-latest, try falling back to mistral-small-latest
  if (response.status === 503 && selectedModel !== 'mistral-small-latest') {
    console.warn(`[LLM Service] Mistral model ${selectedModel} returned 503. Attempting automatic fallback to mistral-small-latest...`);
    const fallbackResponse = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8
      })
    });
    if (fallbackResponse.ok) {
      response = fallbackResponse;
    }
  }

  const data = await response.json();
  if (!response.ok) {
    let errorMsg = data?.message || data?.error?.message || response.statusText || 'Mistral API request failed';
    if (response.status === 503) {
      errorMsg = `${errorMsg} (Mistral servers are temporarily overloaded. Please try again or switch to another model like Mistral Small or another provider).`;
    }
    throw new Error(`Mistral Error (${response.status}): ${errorMsg}`);
  }

  const content = data.choices?.[0]?.message?.content;
  return parsePromptsFromText(content);
}

/**
 * Generate prompts using Google Gemini API
 */
async function callGemini({ apiKey, model, userPrompt }) {
  const targetModel = model || 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'Gemini API request failed';
    throw new Error(`Gemini Error (${response.status}): ${errorMsg}`);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';
  return parsePromptsFromText(text);
}

/**
 * Robust JSON extraction helper
 */
function parsePromptsFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('LLM returned an empty response.');
  }

  // Strip markdown code fences if present (e.g. ```json ... ```)
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    let promptsArray = [];

    if (Array.isArray(parsed)) {
      promptsArray = parsed;
    } else if (Array.isArray(parsed.prompts)) {
      promptsArray = parsed.prompts;
    } else if (Array.isArray(parsed.results)) {
      promptsArray = parsed.results;
    } else if (Array.isArray(parsed.variations)) {
      promptsArray = parsed.variations;
    } else {
      // Find any array property
      const firstArrayProp = Object.values(parsed).find(v => Array.isArray(v));
      if (firstArrayProp) {
        promptsArray = firstArrayProp;
      }
    }

    const validPrompts = promptsArray
      .map(p => (typeof p === 'string' ? p : (p.prompt || p.text || JSON.stringify(p))))
      .filter(p => Boolean(p && p.trim()));

    if (validPrompts.length === 0) {
      throw new Error('No valid prompt strings found in LLM output.');
    }

    return validPrompts;
  } catch (err) {
    // Fallback: try regex line matching if JSON parsing fails
    const lines = cleaned
      .split('\n')
      .map(l => l.replace(/^[-*\d.)\s"]+/, '').replace(/["\s,]+$/, '').trim())
      .filter(l => l.length > 5 && !l.startsWith('{') && !l.startsWith('}'));

    if (lines.length > 0) {
      return lines;
    }
    throw new Error(`Failed to parse LLM response: ${err.message}. Raw output: ${cleaned.substring(0, 150)}...`);
  }
}

/**
 * Constructs the user prompt text sent to the LLM, including optional general/base prompt context.
 */
function buildLLMUserContent({ prompt, generalPrompt }) {
  const cleanPrompt = (prompt || '').trim();
  const cleanGeneral = (generalPrompt || '').trim();

  if (cleanGeneral && cleanPrompt) {
    return `General / Base Style Prompt:\n"${cleanGeneral}"\n\nTask / Detail Prompt to expand into variations:\n"${cleanPrompt}"\n\nPlease generate the image generation prompts following the Task/Detail Prompt, integrating the General/Base Style.`;
  }

  return cleanPrompt || cleanGeneral;
}

/**
 * Main dispatcher for prompt generation
 */
export async function generatePromptsWithLLM({ provider, model, apiKey, prompt, generalPrompt }) {
  if (!apiKey) {
    throw new Error(`API key for ${provider || 'LLM'} is required.`);
  }
  if ((!prompt || !prompt.trim()) && (!generalPrompt || !generalPrompt.trim())) {
    throw new Error('Prompt is required for LLM variation generation.');
  }

  const userContent = buildLLMUserContent({ prompt, generalPrompt });
  const normProvider = (provider || '').toLowerCase().trim();

  switch (normProvider) {
    case 'chatgpt':
    case 'openai':
      return await callOpenAI({ apiKey, model, userPrompt: userContent });
    case 'claude':
    case 'anthropic':
      return await callClaude({ apiKey, model, userPrompt: userContent });
    case 'mistral':
      return await callMistral({ apiKey, model, userPrompt: userContent });
    case 'gemini':
    case 'google':
      return await callGemini({ apiKey, model, userPrompt: userContent });
    default:
      throw new Error(`Unsupported LLM provider: "${provider}". Supported: Mistral, Claude, ChatGPT, Gemini.`);
  }
}

/**
 * Refine a single prompt using OpenAI API (ChatGPT)
 */
async function callOpenAIRefine({ apiKey, model, prompt, promptType }) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const roleContext = promptType === 'general'
    ? 'This is a General / Base Style / Mood prompt used consistently across multiple generations.'
    : 'This is a Detail / Scene prompt describing a specific subject or situation.';

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: REFINE_SYSTEM_INSTRUCTION },
        { role: 'user', content: `${roleContext}\n\nOriginal Prompt:\n"${prompt}"\n\nPlease refine and enhance this prompt.` }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'OpenAI API request failed';
    throw new Error(`OpenAI Error (${response.status}): ${errorMsg}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  return cleanRefinedText(content);
}

/**
 * Refine a single prompt using Claude API
 */
async function callClaudeRefine({ apiKey, model, prompt, promptType }) {
  const endpoint = 'https://anthropic.ai/v1/messages'; // or https://api.anthropic.com/v1/messages
  const roleContext = promptType === 'general'
    ? 'This is a General / Base Style / Mood prompt used consistently across multiple generations.'
    : 'This is a Detail / Scene prompt describing a specific subject or situation.';

  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: REFINE_SYSTEM_INSTRUCTION,
      messages: [
        { role: 'user', content: `${roleContext}\n\nOriginal Prompt:\n"${prompt}"\n\nPlease refine and enhance this prompt.` }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'Anthropic API request failed';
    throw new Error(`Claude Error (${response.status}): ${errorMsg}`);
  }

  const textBlock = data.content?.find(b => b.type === 'text');
  return cleanRefinedText(textBlock?.text || '');
}

/**
 * Refine a single prompt using Mistral AI API
 */
async function callMistralRefine({ apiKey, model, prompt, promptType }) {
  const endpoint = 'https://api.mistral.ai/v1/chat/completions';
  const roleContext = promptType === 'general'
    ? 'This is a General / Base Style / Mood prompt used consistently across multiple generations.'
    : 'This is a Detail / Scene prompt describing a specific subject or situation.';

  const targetModel = model || 'mistral-small-latest';

  const makeRequest = async (m) => {
    return await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: m,
        messages: [
          { role: 'system', content: REFINE_SYSTEM_INSTRUCTION },
          { role: 'user', content: `${roleContext}\n\nOriginal Prompt:\n"${prompt}"\n\nPlease refine and enhance this prompt.` }
        ],
        temperature: 0.7
      })
    });
  };

  let response = await makeRequest(targetModel);

  if (response.status === 503 && targetModel.includes('large')) {
    console.warn(`[Mistral Refine] ${targetModel} returned 503 Service Unavailable. Falling back to mistral-small-latest...`);
    response = await makeRequest('mistral-small-latest');
  }

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.message || data?.error?.message || response.statusText || 'Mistral API request failed';
    if (response.status === 503) {
      throw new Error(`Mistral Error (503): Service unavailable. (Mistral servers are temporarily overloaded. Please try again or switch to another model like Mistral Small or another provider).`);
    }
    throw new Error(`Mistral Error (${response.status}): ${errorMsg}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  return cleanRefinedText(content);
}

/**
 * Refine a single prompt using Google Gemini API
 */
async function callGeminiRefine({ apiKey, model, prompt, promptType }) {
  let targetModel = model || 'gemini-1.5-flash';
  if (targetModel.startsWith('models/')) {
    targetModel = targetModel.replace('models/', '');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const roleContext = promptType === 'general'
    ? 'This is a General / Base Style / Mood prompt used consistently across multiple generations.'
    : 'This is a Detail / Scene prompt describing a specific subject or situation.';

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: REFINE_SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `${roleContext}\n\nOriginal Prompt:\n"${prompt}"\n\nPlease refine and enhance this prompt.` }]
        }
      ],
      generationConfig: {
        temperature: 0.7
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'Gemini API request failed';
    throw new Error(`Gemini Error (${response.status}): ${errorMsg}`);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';
  return cleanRefinedText(text);
}

/**
 * Strips surrounding quotes or extra formatting from refined output text
 */
function cleanRefinedText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('LLM returned an empty refined text.');
  }

  let cleaned = text.trim();
  // Strip starting/ending quotes if whole text was wrapped in quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith('“') && cleaned.endsWith('”')) || (cleaned.startsWith('`') && cleaned.endsWith('`'))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Strip code blocks if any
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown|text)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return cleaned;
}

/**
 * Main dispatcher for single prompt refinement
 */
export async function refinePromptWithLLM({ provider, model, apiKey, prompt, promptType = 'detail' }) {
  if (!apiKey) {
    throw new Error(`API key for ${provider || 'LLM'} is required.`);
  }
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt text cannot be empty.');
  }

  const normProvider = (provider || '').toLowerCase().trim();

  switch (normProvider) {
    case 'chatgpt':
    case 'openai':
      return await callOpenAIRefine({ apiKey, model, prompt, promptType });
    case 'claude':
    case 'anthropic':
      return await callClaudeRefine({ apiKey, model, prompt, promptType });
    case 'mistral':
      return await callMistralRefine({ apiKey, model, prompt, promptType });
    case 'gemini':
    case 'google':
      return await callGeminiRefine({ apiKey, model, prompt, promptType });
    default:
      throw new Error(`Unsupported LLM provider: "${provider}". Supported: Mistral, Claude, ChatGPT, Gemini.`);
  }
}
