import { Router } from 'express';
import { submitGenerationTask, pollTaskResult, fetchAccountCredits } from '../services/bflService.js';
import { generatePromptsWithLLM, refinePromptWithLLM } from '../services/llmService.js';
import { openNativeFolderDialog, saveImagesToDisk, getDefaultSaveDirectory } from '../services/fileService.js';

export const apiRouter = Router();

/**
 * POST /api/llm/refine-prompt
 * Enhances/refines a single prompt (detail or general) using the selected LLM provider.
 */
apiRouter.post('/llm/refine-prompt', async (req, res) => {
  try {
    const { provider, model, apiKey, prompt, promptType } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'LLM provider is required (Mistral, Claude, ChatGPT, Gemini).' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: `API key for ${provider} is missing. Please configure it in Settings.` });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Prompt text cannot be empty to refine.' });
    }

    const refinedPrompt = await refinePromptWithLLM({
      provider,
      model,
      apiKey,
      prompt: prompt.trim(),
      promptType: promptType || 'detail'
    });

    return res.json({
      success: true,
      provider,
      model,
      originalPrompt: prompt.trim(),
      refinedPrompt
    });
  } catch (error) {
    console.error('API /llm/refine-prompt error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to refine prompt with LLM'
    });
  }
});

/**
 * POST /api/llm/generate-prompts
 * Generates prompt variations using the selected LLM provider.
 */
apiRouter.post('/llm/generate-prompts', async (req, res) => {
  try {
    const { provider, model, apiKey, prompt, generalPrompt } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'LLM provider is required (Mistral, Claude, ChatGPT, Gemini).' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: `API key for ${provider} is missing. Please configure it in Settings.` });
    }

    const hasPrompt = prompt && typeof prompt === 'string' && prompt.trim() !== '';
    const hasGeneral = generalPrompt && typeof generalPrompt === 'string' && generalPrompt.trim() !== '';

    if (!hasPrompt && !hasGeneral) {
      return res.status(400).json({ error: 'Prompt must not be empty.' });
    }

    const prompts = await generatePromptsWithLLM({
      provider,
      model,
      apiKey,
      prompt: hasPrompt ? prompt.trim() : '',
      generalPrompt: hasGeneral ? generalPrompt.trim() : ''
    });

    return res.json({
      success: true,
      provider,
      model,
      count: prompts.length,
      prompts
    });
  } catch (error) {
    console.error('API /llm/generate-prompts error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to generate prompt variations with LLM'
    });
  }
});

/**
 * POST /api/generate
 * Initiates image generation with BFL FLUX API and polls until completion.
 */
apiRouter.post('/generate', async (req, res) => {
  try {
    const { apiKey, prompt, endpoint = 'flux-2-pro', width = 1024, height = 1024, prompt_upsampling = false, seed } = req.body;

    const key = apiKey || process.env.BFL_API_KEY;
    if (!key) {
      return res.status(400).json({ error: 'BFL API key is missing. Please provide an API key.' });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Prompt must not be empty.' });
    }

    // 1. Submit initial generation task
    const task = await submitGenerationTask({
      apiKey: key,
      prompt,
      endpoint,
      width,
      height,
      seed,
      prompt_upsampling
    });

    // 2. Poll for final image result
    const pollResult = await pollTaskResult({
      pollingUrl: task.pollingUrl,
      apiKey: key
    });

    const imageUrl = pollResult.result?.sample;

    // 3. Optionally fetch updated credit balance
    let remainingCredits = null;
    try {
      remainingCredits = await fetchAccountCredits(key);
    } catch (e) {
      console.warn('Could not fetch updated credits balance:', e.message);
    }

    return res.json({
      success: true,
      status: 'Ready',
      imageUrl: imageUrl,
      id: task.id,
      seed: task.usedSeed !== undefined ? task.usedSeed : (pollResult.result?.seed || null),
      cost: task.cost,
      remainingCredits: remainingCredits,
      details: pollResult
    });

  } catch (error) {
    console.error('API /generate error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Internal server error',
      details: error.details || (error.pollingUrl ? { pollingUrl: error.pollingUrl } : undefined)
    });
  }
});

/**
 * GET /api/credits
 * Retrieves BFL account credits balance.
 */
apiRouter.get('/credits', async (req, res) => {
  try {
    const key = req.headers['x-key'] || req.query.apiKey || process.env.BFL_API_KEY;
    if (!key) {
      return res.status(400).json({ error: 'BFL API key is required to fetch credits' });
    }

    const credits = await fetchAccountCredits(key);
    return res.json({ credits });
  } catch (error) {
    console.error('API /credits error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Failed to retrieve credits',
      details: error.details
    });
  }
});

/**
 * GET /api/download
 * Proxies image downloading to bypass browser CORS restrictions and sets proper attachment headers.
 */
apiRouter.get('/download', async (req, res) => {
  try {
    const { url, filename = 'flux-image.jpg' } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch image from source (${response.status})` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const cleanFilename = encodeURIComponent(filename.replace(/[/\\?%*:|"<>]/g, '_'));

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"; filename*=UTF-8''${cleanFilename}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (error) {
    console.error('API /download error:', error.message);
    return res.status(500).json({ error: 'Failed to download image proxy' });
  }
});

/**
 * GET or POST /api/select-folder
 * Opens native OS directory selection dialog and returns chosen path.
 */
apiRouter.all('/select-folder', async (req, res) => {
  try {
    const result = await openNativeFolderDialog();
    const defaultFolder = getDefaultSaveDirectory();
    return res.json({
      ...result,
      defaultFolder
    });
  } catch (error) {
    console.error('API /select-folder error:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to open folder selection dialog',
      defaultFolder: getDefaultSaveDirectory()
    });
  }
});

/**
 * GET /api/default-folder
 * Returns default save directory path on host system.
 */
apiRouter.get('/default-folder', (req, res) => {
  try {
    const defaultFolder = getDefaultSaveDirectory();
    return res.json({ defaultFolder });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/save-all
 * Downloads and saves an array of generated image items directly to the specified folder on disk.
 */
apiRouter.post('/save-all', async (req, res) => {
  try {
    const { folderPath, images } = req.body;

    if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
      return res.status(400).json({ error: 'Folder path is required to save images.' });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided to save.' });
    }

    const result = await saveImagesToDisk({ folderPath, images });
    return res.json(result);
  } catch (error) {
    console.error('API /save-all error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to save images to folder' });
  }
});
