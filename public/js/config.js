/**
 * Central configuration and settings module for the FLUX Image Generator.
 * 
 * Contains:
 * - Available Flux AI Models & configurations
 * - Color Mood Presets (Farbstimmungen)
 * - Aspect Ratios & Resolutions
 * - Orientation & Batch sizes
 * - Default settings & LocalStorage keys
 * - Application & API configurations
 */

export const STORAGE_KEYS = {
  apiKey: 'bfl_api_key',
  model: 'bfl_model',
  theme: 'bfl_theme',
  generalPrompt: 'bfl_general_prompt',
  colorPreset: 'bfl_color_preset',
  customColor: 'bfl_custom_color',
  stylePreset: 'bfl_style_preset',
  aspectRatio: 'bfl_aspect_ratio',
  resolution: 'bfl_resolution',
  orientation: 'bfl_orientation',
  imageCount: 'bfl_image_count',
  advancedSettingsOpen: 'bfl_advanced_open',
  saveFolder: 'bfl_save_folder',
  // Prompt History & Saved Prompts
  savedGeneralPrompts: 'bfl_saved_general_prompts',
  savedDetailPrompts: 'bfl_saved_detail_prompts',
  generalPromptHistorySort: 'bfl_general_prompt_sort',
  detailPromptHistorySort: 'bfl_detail_prompt_sort',
  generalPromptSectionOpen: 'bfl_general_prompt_section_open',
  detailPromptSectionOpen: 'bfl_detail_prompt_section_open',
  // LLM Settings
  useMultiplePromptLLM: 'bfl_use_multiple_prompt_llm',
  llmProvider: 'bfl_llm_provider',
  llmModelPrefix: 'bfl_llm_model_',
  llmApiKeyPrefix: 'bfl_llm_apikey_'
};

export const THEMES = [
  { id: 'dark', label: 'Dark', icon: '🌙', isDefault: true },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'elegant', label: 'Elegant', icon: '✨' },
  { id: 'high-contrast', label: 'High Contrast', icon: '⚡' },
  { id: 'neon', label: 'Neon', icon: '🔮' }
];

export const MODELS = [
  {
    id: 'flux-3-image',
    name: 'Flux 3 Image',
    label: 'Flux 3 Image (Latest / Ultra Quality)',
    description: 'Black Forest Labs flagship model for highest image fidelity and prompt adherence',
    supportsSeed: false,
    supportsUpsampling: false
  },
  {
    id: 'flux-3-image-klein',
    name: 'Flux 3 Image Klein',
    label: 'Flux 3 Image Klein (Fast & Efficient)',
    description: 'Efficient, fast-turnaround variant of Flux 3',
    supportsSeed: true,
    supportsUpsampling: false
  },
  {
    id: 'flux-2-max',
    name: 'Flux 2 Max',
    label: 'Flux 2 Max (Maximum Quality)',
    description: 'Ultra-high quality Flux 2 variant with deep scene detail',
    supportsSeed: true,
    supportsUpsampling: false
  },
  {
    id: 'flux-2-pro',
    name: 'Flux 2 Pro',
    label: 'Flux 2 Pro (Recommended / Balanced)',
    description: 'Recommended standard for production-grade image synthesis',
    isDefault: true,
    supportsSeed: true,
    supportsUpsampling: false
  },
  {
    id: 'flux-2-flex',
    name: 'Flux 2 Flex',
    label: 'Flux 2 Flex (Flexible & Upsampling)',
    description: 'Flexible generation supporting prompt upsampling',
    supportsSeed: true,
    supportsUpsampling: true
  },
  {
    id: 'flux-2-klein-9b',
    name: 'Flux 2 Klein (9B)',
    label: 'Flux 2 Klein (9B - Fast)',
    description: 'Fast 9B parameter model for rapid prototyping',
    supportsSeed: true,
    supportsUpsampling: false
  },
  {
    id: 'flux-2-klein-4b',
    name: 'Flux 2 Klein (4B)',
    label: 'Flux 2 Klein (4B - Ultra Fast)',
    description: 'Ultra-fast lightweight 4B parameter model',
    supportsSeed: true,
    supportsUpsampling: false
  }
];

export const COLOR_PRESETS = [
  {
    id: 'none',
    label: 'Keine (None)',
    prompt: ''
  },
  {
    id: 'colorful-neon',
    label: 'Colorful Neon',
    prompt: 'vibrant colorful neon color palette, glowing vivid lighting'
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    prompt: 'golden hour color palette, warm amber sunset lighting'
  },
  {
    id: 'sepia',
    label: 'Sepia',
    prompt: 'warm sepia tones, nostalgic vintage monochrome'
  },
  {
    id: 'bw',
    label: 'B/W (Black & White)',
    prompt: 'high contrast black and white photography, dramatic monochrome'
  },
  {
    id: 'yellow',
    label: 'Yellow Mood',
    prompt: 'dominant warm yellow color palette, sunny yellow tones'
  },
  {
    id: 'blue-turquoise',
    label: 'Blue / Turquoise',
    prompt: 'cool blue and turquoise color palette, cyan tones'
  },
  {
    id: 'pastel',
    label: 'Pastel Dream',
    prompt: 'soft pastel color palette, gentle muted tones'
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk (Neon Magenta & Cyan)',
    prompt: 'cyberpunk color palette, neon magenta and cyan lighting'
  },
  {
    id: 'moody-dark',
    label: 'Moody Dark / Emerald',
    prompt: 'moody dark aesthetic, deep emerald and shadow tones'
  },
  {
    id: 'vintage-warm',
    label: 'Vintage Warm',
    prompt: 'vintage warm color palette, 70s retro film aesthetic'
  },
  {
    id: 'sunset-glow',
    label: 'Sunset Glow / Coral',
    prompt: 'vibrant sunset glow, coral pink and warm orange gradients'
  },
  {
    id: 'sci-fi-teal-orange',
    label: 'Sci-Fi Orange & Teal',
    prompt: 'cinematic teal and orange color grading, dramatic contrast'
  },
  {
    id: 'dreamy-lavender',
    label: 'Dreamy Lavender',
    prompt: 'dreamy soft purple and lavender aesthetic, ethereal lighting'
  },
  {
    id: 'custom',
    label: 'Custom...',
    prompt: null
  }
];

export const STYLE_PRESETS = [
  {
    id: 'none',
    label: 'None (Default)',
    prompt: '',
    isDefault: true
  },
  {
    id: 'photoreal',
    label: 'Photoreal',
    prompt: 'photorealistic style, ultra-realistic photography, authentic lighting, lifelike details, professional photography'
  },
  {
    id: 'hyperreal',
    label: 'Hyperreal',
    prompt: 'hyperrealistic style, extremely intricate details, hyperrealism, 8k resolution, cinematic lighting, sharp focus'
  },
  {
    id: 'pencil-drawing',
    label: 'Pencil Drawing',
    prompt: 'detailed pencil sketch, hand-drawn graphite art, fine line work, delicate shading, cross-hatching, sketchbook drawing'
  },
  {
    id: 'ink-drawing',
    label: 'Ink Drawing',
    prompt: 'black ink drawing, intricate line art, cross-hatching, fine pen work, high contrast, ink wash illustration'
  },
  {
    id: 'oil-painting',
    label: 'Oil Painting',
    prompt: 'classic oil painting on canvas, visible textured brushstrokes, rich pigments, fine art masterpiece'
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    prompt: 'watercolor painting, soft fluid washes, wet-on-wet technique, artistic paint splatters, delicate paper texture'
  },
  {
    id: 'anime-manga',
    label: 'Anime / Manga',
    prompt: 'anime aesthetic, clean manga lineart, vibrant anime studio illustration, expressive, high quality Japanese animation style'
  },
  {
    id: 'impressionism',
    label: 'Impressionism',
    prompt: 'impressionist art style, vivid color dabs, atmospheric light, dynamic brushwork, plein air, Claude Monet inspired'
  },
  {
    id: 'pop-art',
    label: 'Pop Art',
    prompt: 'pop art style, bold outlines, vivid halftone dots, screenprint aesthetic, Andy Warhol and Roy Lichtenstein inspired'
  },
  {
    id: 'surrealism',
    label: 'Surrealism',
    prompt: 'surrealist art, dreamlike imagery, metaphysical juxtaposition, Salvador Dali and René Magritte inspired'
  },
  {
    id: 'digital-art',
    label: 'Digital Art / Concept Art',
    prompt: 'digital concept art, highly detailed digital painting, trending on ArtStation, dynamic composition, dramatic lighting'
  },
  {
    id: '3d-rendered',
    label: '3D-Rendered',
    prompt: '3D render, Octane Render, Unreal Engine 5, raytracing, cinematic lighting, smooth 3D CGI, hyper-detailed materials'
  }
];

export const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)', ratio: [1, 1], isDefault: true },
  { value: '4:3', label: '4:3 (Standard)', ratio: [4, 3] },
  { value: '16:9', label: '16:9 (Widescreen)', ratio: [16, 9] },
  { value: '21:9', label: '21:9 (Cinematic)', ratio: [21, 9] },
  { value: '9:16', label: '9:16 (Story / Mobile)', ratio: [9, 16] },
  { value: '3:4', label: '3:4 (Portrait)', ratio: [3, 4] }
];

export const RESOLUTIONS = [
  { value: '0.25', label: '0.25 MP (Draft)', mp: 0.25 },
  { value: '0.5', label: '0.5 MP (Preview)', mp: 0.5 },
  { value: '1', label: '1 MP (Standard)', mp: 1.0, isDefault: true },
  { value: '2', label: '2 MP (HD)', mp: 2.0 },
  { value: '4', label: '4 MP (Ultra HD)', mp: 4.0 }
];

export const ORIENTATIONS = [
  { value: 'horizontal', label: 'Horizontal (Landscape)', isDefault: true },
  { value: 'vertical', label: 'Vertical (Portrait)' }
];

export const IMAGE_COUNTS = [
  { value: 1, label: '1 Image', isDefault: true },
  { value: 2, label: '2 Images' },
  { value: 3, label: '3 Images' },
  { value: 4, label: '4 Images' }
];

export const DEFAULT_SETTINGS = {
  model: 'flux-2-pro',
  theme: 'dark',
  aspectRatio: '1:1',
  resolution: '1',
  orientation: 'horizontal',
  imageCount: 1,
  colorPreset: 'none',
  customColor: '',
  stylePreset: 'none',
  generalPrompt: '',
  advancedSettingsOpen: false,
  useMultiplePromptLLM: false,
  llmProvider: 'chatgpt'
};

export const LLM_PROVIDERS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT (OpenAI)',
    defaultModel: 'gpt-4o-mini',
    placeholder: 'sk-...',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)', isDefault: true },
      { id: 'gpt-4o', name: 'GPT-4o (High Intelligence)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ]
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    defaultModel: 'claude-3-5-sonnet-20241022',
    placeholder: 'sk-ant-...',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Recommended)', isDefault: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
    ]
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    defaultModel: 'mistral-small-latest',
    placeholder: 'mistral-...',
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small (Fast & Reliable)', isDefault: true },
      { id: 'mistral-large-latest', name: 'Mistral Large (High Intelligence)' },
      { id: 'codestral-latest', name: 'Codestral' },
      { id: 'open-mistral-nemo', name: 'Mistral Nemo (Open)' }
    ]
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    defaultModel: 'gemini-1.5-flash',
    placeholder: 'AIzaSy...',
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)', isDefault: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Advanced)' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' }
    ]
  }
];

export const API_ENDPOINTS = {
  generate: '/api/generate',
  credits: '/api/credits',
  download: '/api/download',
  selectFolder: '/api/select-folder',
  defaultFolder: '/api/default-folder',
  saveAll: '/api/save-all',
  llmPrompts: '/api/llm/generate-prompts'
};

/**
 * Helper to get the prompt fragment for a given color preset key.
 * @param {string} presetId
 * @param {string} [customValue='']
 * @returns {string}
 */
export function getColorPrompt(presetId, customValue = '') {
  if (presetId === 'custom') {
    return (customValue || '').trim();
  }
  const found = COLOR_PRESETS.find(p => p.id === presetId);
  return found ? (found.prompt || '') : '';
}

/**
 * Helper to get the prompt fragment for a given style preset key.
 * @param {string} styleId
 * @returns {string}
 */
export function getStylePrompt(styleId) {
  const found = STYLE_PRESETS.find(s => s.id === styleId);
  return found ? (found.prompt || '') : '';
}

/**
 * Helper to get model metadata by id.
 * @param {string} modelId
 * @returns {Object|undefined}
 */
export function getModelConfig(modelId) {
  return MODELS.find(m => m.id === modelId) || MODELS.find(m => m.isDefault);
}
