import { Router } from 'express';
import { submitGenerationTask, pollTaskResult, fetchAccountCredits } from '../services/bflService.js';

export const apiRouter = Router();

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
