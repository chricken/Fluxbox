/**
 * Main application coordinator module.
 */

import { calculateDimensions, formatCredits } from './utils.js';
import { generateImage, fetchCredits, generateLLMPrompts, refinePromptWithLLM } from './api.js';
import { SettingsManager } from './settings.js';
import { GalleryManager } from './gallery.js';
import { PromptManager } from './promptManager.js';
import {
  STORAGE_KEYS,
  THEMES,
  COLOR_PRESETS,
  STYLE_PRESETS,
  ASPECT_RATIOS,
  RESOLUTIONS,
  ORIENTATIONS,
  IMAGE_COUNTS,
  DEFAULT_SETTINGS,
  getColorPrompt,
  getStylePrompt
} from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('generator-form');
  const themeSelect = document.getElementById('themeSelect');
  const advancedSettingsDetails = document.getElementById('advancedSettingsDetails');
  const advancedPreviewBadge = document.getElementById('advancedPreviewBadge');
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const colorPresetSelect = document.getElementById('colorPreset');
  const customColorInput = document.getElementById('customColorInput');
  const stylePresetSelect = document.getElementById('stylePreset');
  const generalPromptInput = document.getElementById('generalPrompt');
  const promptInput = document.getElementById('prompt');
  const useMultiplePromptLLM = document.getElementById('useMultiplePromptLLM');
  const endpointSelect = document.getElementById('endpoint');
  const aspectRatioSelect = document.getElementById('aspectRatio');
  const resolutionSelect = document.getElementById('resolution');
  const orientationSelect = document.getElementById('orientation');
  const imageCountSelect = document.getElementById('imageCount');
  const seedInput = document.getElementById('seed');
  const randomSeedBtn = document.getElementById('randomSeedBtn');

  const generateBtn = document.getElementById('generateBtn');
  const btnText = generateBtn.querySelector('.btn-text');
  const spinner = generateBtn.querySelector('.spinner');

  const statusSection = document.getElementById('statusSection');
  const statusMessage = document.getElementById('statusMessage');
  const errorSection = document.getElementById('errorSection');
  const errorMessage = document.getElementById('errorMessage');

  // Gallery elements
  const gallerySection = document.getElementById('gallerySection');
  const galleryGrid = document.getElementById('galleryGrid');
  const galleryCountBadge = document.getElementById('galleryCountBadge');
  const saveAllBtn = document.getElementById('saveAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  // Modal elements
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const activeConfigBar = document.getElementById('activeConfigBar');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const currentModelBadge = document.getElementById('currentModelBadge');
  const apiKeyStatusBadge = document.getElementById('apiKeyStatusBadge');

  // LLM Settings Elements
  const llmProviderSelect = document.getElementById('llmProvider');
  const llmModelSelect = document.getElementById('llmModel');
  const llmApiKeyInput = document.getElementById('llmApiKey');
  const llmApiKeyLabel = document.getElementById('llmApiKeyLabel');
  const toggleLlmApiKeyBtn = document.getElementById('toggleLlmApiKey');

  // General Prompt Toolbar & Saved Elements
  const refineGeneralPromptBtn = document.getElementById('refineGeneralPromptBtn');
  const undoGeneralPromptBtn = document.getElementById('undoGeneralPromptBtn');
  const saveGeneralPromptBtn = document.getElementById('saveGeneralPromptBtn');
  const generalSavedDetails = document.getElementById('generalSavedDetails');
  const generalSavedList = document.getElementById('generalSavedList');
  const generalPromptSort = document.getElementById('generalPromptSort');
  const generalSavedCountBadge = document.getElementById('generalSavedCountBadge');

  // Detail Prompt Toolbar & Saved Elements
  const refineDetailPromptBtn = document.getElementById('refineDetailPromptBtn');
  const undoDetailPromptBtn = document.getElementById('undoDetailPromptBtn');
  const saveDetailPromptBtn = document.getElementById('saveDetailPromptBtn');
  const detailSavedDetails = document.getElementById('detailSavedDetails');
  const detailSavedList = document.getElementById('detailSavedList');
  const detailPromptSort = document.getElementById('detailPromptSort');
  const detailSavedCountBadge = document.getElementById('detailSavedCountBadge');

  // Credits elements
  const remainingCreditsVal = document.getElementById('remainingCreditsVal');
  const usedCreditsVal = document.getElementById('usedCreditsVal');
  const refreshCreditsBtn = document.getElementById('refreshCreditsBtn');

  // 1. Initialize Gallery Manager
  const galleryManager = new GalleryManager({
    gallerySection,
    galleryGrid,
    galleryCountBadge,
    saveAllBtn,
    clearAllBtn
  });

  // 2. Initialize Settings Manager
  const settingsManager = new SettingsManager({
    apiKeyInput,
    toggleApiKeyBtn,
    endpointSelect,
    settingsModal,
    openSettingsBtn,
    activeConfigBar,
    closeSettingsBtn,
    saveSettingsBtn,
    currentModelBadge,
    apiKeyStatusBadge,
    llmProviderSelect,
    llmModelSelect,
    llmApiKeyInput,
    llmApiKeyLabel,
    toggleLlmApiKeyBtn,
    onApiKeyChange: () => updateCreditBalance(),
    onModelChange: () => {}
  });

  // Handler for refining prompt with configured LLM
  async function handleRefinePrompt(manager) {
    const isGeneral = manager.type === 'general';
    const textarea = manager.textareaEl;
    const currentText = textarea ? textarea.value.trim() : '';

    if (!currentText) {
      showError(`Please enter a ${isGeneral ? 'General' : 'Detail'} Prompt text first to refine.`);
      if (textarea) textarea.focus();
      return;
    }

    const provider = settingsManager.getLLMProvider();
    const model = settingsManager.getLLMModel();
    const apiKey = settingsManager.getLLMApiKey();

    if (!apiKey) {
      showError(`Please configure your ${provider.toUpperCase()} API key in Settings to use Refine with LLM.`);
      settingsManager.openModal();
      return;
    }

    const btn = manager.refineBtn;
    const spinner = btn?.querySelector('.refine-spinner');
    const icon = btn?.querySelector('.refine-icon');
    const btnSpan = btn?.querySelector('span:nth-of-type(2)');

    // Set UI loading state on button
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-refining');
    }
    if (spinner) spinner.classList.remove('hidden');
    if (icon) icon.classList.add('hidden');
    if (btnSpan) btnSpan.textContent = 'Refining...';

    hideError();

    try {
      const refinedText = await refinePromptWithLLM({
        provider,
        model,
        apiKey,
        prompt: currentText,
        promptType: manager.type
      });

      if (!refinedText || !refinedText.trim()) {
        throw new Error('LLM returned an empty prompt response.');
      }

      // Save previous text to undo stack
      manager.pushUndo(textarea.value);

      // Update textarea with refined prompt
      textarea.value = refinedText.trim();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.focus();

    } catch (err) {
      console.error(`Refine ${manager.type} prompt error:`, err);
      showError(`Refine Error: ${err.message || err}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-refining');
      }
      if (spinner) spinner.classList.add('hidden');
      if (icon) icon.classList.remove('hidden');
      if (btnSpan) btnSpan.textContent = 'Refine with LLM';
    }
  }

  // 3. Initialize Prompt Managers (History, Saved, Refine, Undo)
  const generalPromptManager = new PromptManager({
    type: 'general',
    textareaEl: generalPromptInput,
    refineBtn: refineGeneralPromptBtn,
    undoBtn: undoGeneralPromptBtn,
    saveBtn: saveGeneralPromptBtn,
    collapsibleEl: generalSavedDetails,
    savedListEl: generalSavedList,
    sortSelectEl: generalPromptSort,
    countBadgeEl: generalSavedCountBadge,
    onRefine: handleRefinePrompt
  });

  const detailPromptManager = new PromptManager({
    type: 'detail',
    textareaEl: promptInput,
    refineBtn: refineDetailPromptBtn,
    undoBtn: undoDetailPromptBtn,
    saveBtn: saveDetailPromptBtn,
    collapsibleEl: detailSavedDetails,
    savedListEl: detailSavedList,
    sortSelectEl: detailPromptSort,
    countBadgeEl: detailSavedCountBadge,
    onRefine: handleRefinePrompt
  });

  // Theme management
  function applyTheme(themeName) {
    const validTheme = THEMES.some(t => t.id === themeName) ? themeName : DEFAULT_SETTINGS.theme;
    document.documentElement.setAttribute('data-theme', validTheme);
    if (themeSelect && themeSelect.value !== validTheme) {
      themeSelect.value = validTheme;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.theme, validTheme);
    } catch (e) {
      console.warn('Could not save theme:', e);
    }
  }

  // Update Collapsible preview summary badge
  function updateAdvancedPreviewBadge() {
    if (!advancedPreviewBadge) return;

    const count = imageCountSelect ? imageCountSelect.value : '1';
    const seedVal = seedInput && seedInput.value.trim() !== '' ? `#${seedInput.value.trim()}` : 'Random Seed';

    let colorLabel = 'None';
    if (colorPresetSelect) {
      const selectedPreset = colorPresetSelect.value;
      if (selectedPreset === 'custom') {
        const customVal = (customColorInput?.value || '').trim();
        colorLabel = customVal ? `Custom (${customVal.substring(0, 12)}...)` : 'Custom';
      } else if (selectedPreset !== 'none') {
        const found = COLOR_PRESETS.find(p => p.id === selectedPreset);
        colorLabel = found ? found.label.replace(/\s*\(.*\)$/, '') : selectedPreset;
      }
    }

    let styleLabel = 'None';
    if (stylePresetSelect) {
      const selectedStyle = stylePresetSelect.value;
      if (selectedStyle !== 'none') {
        const found = STYLE_PRESETS.find(s => s.id === selectedStyle);
        styleLabel = found ? found.label.replace(/\s*\(.*\)$/, '') : selectedStyle;
      }
    }

    advancedPreviewBadge.textContent = `${count} ${count === '1' ? 'Image' : 'Images'} • ${seedVal} • Color: ${colorLabel} • Style: ${styleLabel}`;
  }

  // Initialize dynamic dropdowns from config
  function initDynamicDropdowns() {
    // Theme Select
    if (themeSelect) {
      themeSelect.innerHTML = '';
      THEMES.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.id;
        option.textContent = `${theme.icon} ${theme.label}`;
        themeSelect.appendChild(option);
      });
    }

    // Color Presets
    if (colorPresetSelect) {
      colorPresetSelect.innerHTML = '';
      COLOR_PRESETS.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.label;
        if (preset.id === DEFAULT_SETTINGS.colorPreset) {
          option.selected = true;
        }
        colorPresetSelect.appendChild(option);
      });
    }

    // Style Presets
    if (stylePresetSelect) {
      stylePresetSelect.innerHTML = '';
      STYLE_PRESETS.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.label;
        if (preset.id === DEFAULT_SETTINGS.stylePreset) {
          option.selected = true;
        }
        stylePresetSelect.appendChild(option);
      });
    }

    // Aspect Ratios
    if (aspectRatioSelect) {
      aspectRatioSelect.innerHTML = '';
      ASPECT_RATIOS.forEach(ratio => {
        const option = document.createElement('option');
        option.value = ratio.value;
        option.textContent = ratio.label;
        if (ratio.isDefault) {
          option.selected = true;
        }
        aspectRatioSelect.appendChild(option);
      });
    }

    // Resolutions
    if (resolutionSelect) {
      resolutionSelect.innerHTML = '';
      RESOLUTIONS.forEach(res => {
        const option = document.createElement('option');
        option.value = res.value;
        option.textContent = res.label;
        if (res.isDefault) {
          option.selected = true;
        }
        resolutionSelect.appendChild(option);
      });
    }

    // Orientations
    if (orientationSelect) {
      orientationSelect.innerHTML = '';
      ORIENTATIONS.forEach(orient => {
        const option = document.createElement('option');
        option.value = orient.value;
        option.textContent = orient.label;
        if (orient.isDefault) {
          option.selected = true;
        }
        orientationSelect.appendChild(option);
      });
    }

    // Image Counts
    if (imageCountSelect) {
      imageCountSelect.innerHTML = '';
      IMAGE_COUNTS.forEach(cnt => {
        const option = document.createElement('option');
        option.value = String(cnt.value);
        option.textContent = cnt.label;
        if (cnt.isDefault) {
          option.selected = true;
        }
        imageCountSelect.appendChild(option);
      });
    }
  }

  // Populate dynamic selects
  initDynamicDropdowns();

  // Load Saved Theme
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || DEFAULT_SETTINGS.theme;
    applyTheme(savedTheme);
  } catch (e) {
    applyTheme(DEFAULT_SETTINGS.theme);
  }

  // Theme switch listener
  themeSelect?.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // Load Advanced Settings Collapsible open/close state
  try {
    const isAdvancedOpen = localStorage.getItem(STORAGE_KEYS.advancedSettingsOpen) === 'true';
    if (advancedSettingsDetails) {
      advancedSettingsDetails.open = isAdvancedOpen;
    }
  } catch (e) {
    console.warn('Could not load advanced collapsible state:', e);
  }

  advancedSettingsDetails?.addEventListener('toggle', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.advancedSettingsOpen, String(advancedSettingsDetails.open));
    } catch (e) {
      console.warn('Could not save advanced collapsible state:', e);
    }
  });

  // Load saved preferences
  try {
    const savedGeneralPrompt = localStorage.getItem(STORAGE_KEYS.generalPrompt);
    if (savedGeneralPrompt && generalPromptInput) {
      generalPromptInput.value = savedGeneralPrompt;
    }

    const savedColorPreset = localStorage.getItem(STORAGE_KEYS.colorPreset);
    if (savedColorPreset && colorPresetSelect) {
      colorPresetSelect.value = savedColorPreset;
    }

    const savedCustomColor = localStorage.getItem(STORAGE_KEYS.customColor);
    if (savedCustomColor && customColorInput) {
      customColorInput.value = savedCustomColor;
    }

    if (colorPresetSelect && customColorInput) {
      customColorInput.classList.toggle('hidden', colorPresetSelect.value !== 'custom');
    }

    const savedStylePreset = localStorage.getItem(STORAGE_KEYS.stylePreset);
    if (savedStylePreset && stylePresetSelect) {
      stylePresetSelect.value = savedStylePreset;
    }

    const savedAspectRatio = localStorage.getItem(STORAGE_KEYS.aspectRatio);
    if (savedAspectRatio && aspectRatioSelect) {
      aspectRatioSelect.value = savedAspectRatio;
    }

    const savedResolution = localStorage.getItem(STORAGE_KEYS.resolution);
    if (savedResolution && resolutionSelect) {
      resolutionSelect.value = savedResolution;
    }

    const savedOrientation = localStorage.getItem(STORAGE_KEYS.orientation);
    if (savedOrientation && orientationSelect) {
      orientationSelect.value = savedOrientation;
    }

    const savedImageCount = localStorage.getItem(STORAGE_KEYS.imageCount);
    if (savedImageCount && imageCountSelect) {
      imageCountSelect.value = savedImageCount;
    }

    const savedMultiplePromptLLM = localStorage.getItem(STORAGE_KEYS.useMultiplePromptLLM);
    if (useMultiplePromptLLM) {
      useMultiplePromptLLM.checked = savedMultiplePromptLLM === 'true';
    }

    updateAdvancedPreviewBadge();
  } catch (e) {
    console.warn('Could not load saved settings from localStorage:', e);
  }

  // Persist form settings on change
  generalPromptInput?.addEventListener('input', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.generalPrompt, generalPromptInput.value);
    } catch (e) {
      console.warn('Could not save general prompt:', e);
    }
  });

  useMultiplePromptLLM?.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.useMultiplePromptLLM, String(useMultiplePromptLLM.checked));
    } catch (e) {
      console.warn('Could not save multiple prompt LLM setting:', e);
    }
  });

  colorPresetSelect?.addEventListener('change', () => {
    const isCustom = colorPresetSelect.value === 'custom';
    if (customColorInput) {
      customColorInput.classList.toggle('hidden', !isCustom);
      if (isCustom) {
        customColorInput.focus();
      }
    }
    try {
      localStorage.setItem(STORAGE_KEYS.colorPreset, colorPresetSelect.value);
    } catch (e) {
      console.warn('Could not save color preset:', e);
    }
    updateAdvancedPreviewBadge();
  });

  customColorInput?.addEventListener('input', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.customColor, customColorInput.value);
    } catch (e) {
      console.warn('Could not save custom color:', e);
    }
    updateAdvancedPreviewBadge();
  });

  stylePresetSelect?.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.stylePreset, stylePresetSelect.value);
    } catch (e) {
      console.warn('Could not save style preset:', e);
    }
    updateAdvancedPreviewBadge();
  });

  seedInput?.addEventListener('input', () => {
    updateAdvancedPreviewBadge();
  });

  aspectRatioSelect?.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.aspectRatio, aspectRatioSelect.value);
    } catch (e) {
      console.warn('Could not save aspect ratio:', e);
    }
  });

  resolutionSelect?.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.resolution, resolutionSelect.value);
    } catch (e) {
      console.warn('Could not save resolution:', e);
    }
  });

  orientationSelect?.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.orientation, orientationSelect.value);
    } catch (e) {
      console.warn('Could not save orientation:', e);
    }
  });

  imageCountSelect?.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEYS.imageCount, imageCountSelect.value);
    } catch (e) {
      console.warn('Could not save image count:', e);
    }
    updateAdvancedPreviewBadge();
  });

  refreshCreditsBtn?.addEventListener('click', () => {
    updateCreditBalance();
  });

  // Random seed button
  randomSeedBtn?.addEventListener('click', () => {
    const randomSeed = Math.floor(Math.random() * 1000000000);
    seedInput.value = randomSeed;
    updateAdvancedPreviewBadge();
  });

  // Helper functions for UI status/errors
  function setLoading(isLoading) {
    if (isLoading) {
      generateBtn.disabled = true;
      btnText.textContent = 'Generating...';
      spinner.classList.remove('hidden');
      statusSection.classList.remove('hidden');
    } else {
      generateBtn.disabled = false;
      btnText.textContent = 'Generate Image';
      spinner.classList.add('hidden');
      statusSection.classList.add('hidden');
    }
  }

  function setStatus(msg) {
    statusMessage.textContent = msg;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorSection.classList.remove('hidden');
  }

  function hideError() {
    errorSection.classList.add('hidden');
    errorMessage.textContent = '';
  }

  // Form Submit (Batch & LLM-expanded Generation)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = settingsManager.getApiKey();
    const detailPrompt = promptInput.value.trim();
    const generalPrompt = generalPromptInput ? generalPromptInput.value.trim() : '';
    const endpoint = settingsManager.getModel();
    const aspectRatio = aspectRatioSelect.value;
    const resolutionMP = parseFloat(resolutionSelect.value);
    const orientation = orientationSelect.value;
    const countPerPrompt = parseInt(imageCountSelect.value, 10) || 1;
    const baseSeedVal = seedInput.value.trim();
    const isMultiplePromptLLM = Boolean(useMultiplePromptLLM && useMultiplePromptLLM.checked);

    if (!apiKey) {
      showError('Please enter your BFL API key in Settings.');
      settingsManager.openModal();
      return;
    }

    const selectedPreset = colorPresetSelect ? colorPresetSelect.value : DEFAULT_SETTINGS.colorPreset;
    const customColor = customColorInput ? customColorInput.value : '';
    const colorPromptPart = getColorPrompt(selectedPreset, customColor);

    const selectedStyle = stylePresetSelect ? stylePresetSelect.value : DEFAULT_SETTINGS.stylePreset;
    const stylePromptPart = getStylePrompt(selectedStyle);

    if (!detailPrompt && !generalPrompt && !colorPromptPart && !stylePromptPart) {
      showError('Please enter a detail prompt, a general prompt, or select a style/color preset.');
      return;
    }

    // Helper to build a full prompt from a detail prompt
    function buildFullPrompt(detailText) {
      const parts = [];
      if (detailText) parts.push(detailText.replace(/[,;.\s]+$/, ''));
      if (generalPrompt) parts.push(generalPrompt.replace(/^[,;.\s]+|[,;.\s]+$/g, ''));
      if (stylePromptPart) parts.push(stylePromptPart.replace(/^[,;.\s]+|[,;.\s]+$/g, ''));
      if (colorPromptPart) parts.push(colorPromptPart.replace(/^[,;.\s]+|[,;.\s]+$/g, ''));
      return parts.join(', ');
    }

    const { width, height } = calculateDimensions(aspectRatio, resolutionMP, orientation);

    // Set UI to loading state
    setLoading(true);
    hideError();

    let targetPrompts = [];

    // Step 1: If "Multiple Prompt per LLM" is active, ask the LLM to generate prompt variations first
    if (isMultiplePromptLLM) {
      const llmProvider = settingsManager.getLLMProvider();
      const llmModel = settingsManager.getLLMModel();
      const llmApiKey = settingsManager.getLLMApiKey();

      if (!llmApiKey) {
        setLoading(false);
        showError(`Please configure your ${llmProvider.toUpperCase()} API key in Settings to use Multiple Prompt per LLM.`);
        settingsManager.openModal();
        return;
      }

      setStatus(`Generating prompt variations with ${llmProvider}...`);

      try {
        const expandedPrompts = await generateLLMPrompts({
          provider: llmProvider,
          model: llmModel,
          apiKey: llmApiKey,
          prompt: detailPrompt,
          generalPrompt: generalPrompt
        });

        if (!expandedPrompts || expandedPrompts.length === 0) {
          throw new Error('LLM did not return any prompt variations.');
        }

        targetPrompts = expandedPrompts;
        setStatus(`LLM generated ${targetPrompts.length} prompt variations. Starting image generation...`);
      } catch (llmErr) {
        setLoading(false);
        showError(`LLM Error: ${llmErr.message}`);
        return;
      }
    } else {
      // Standard direct single prompt mode
      targetPrompts = [detailPrompt];
    }

    const totalExpectedImages = targetPrompts.length * countPerPrompt;
    setStatus(`Generating ${totalExpectedImages} images in total...`);

    let totalCost = 0;
    let completedCount = 0;
    const errors = [];

    // Prepare execution tasks for all prompts & counts
    const executionTasks = [];
    let globalSeedOffset = 0;

    for (let pIdx = 0; pIdx < targetPrompts.length; pIdx++) {
      const currentPromptText = targetPrompts[pIdx];
      const fullPromptToUse = buildFullPrompt(currentPromptText);

      for (let c = 0; c < countPerPrompt; c++) {
        let currentSeed = undefined;
        if (baseSeedVal !== '') {
          const parsedSeed = parseInt(baseSeedVal, 10);
          if (!isNaN(parsedSeed)) {
            currentSeed = parsedSeed + globalSeedOffset;
          }
        }
        globalSeedOffset++;

        const promptTitle = currentPromptText || fullPromptToUse;

        executionTasks.push(async () => {
          try {
            const data = await generateImage({
              apiKey,
              prompt: fullPromptToUse,
              endpoint,
              width,
              height,
              seed: currentSeed
            });

            if (data.imageUrl) {
              completedCount++;
              setStatus(`Generated ${completedCount} of ${totalExpectedImages} images...`);

              if (typeof data.cost === 'number') {
                totalCost += data.cost;
              }

              if (data.remainingCredits !== null && data.remainingCredits !== undefined) {
                setCreditsDisplay(data.remainingCredits, totalCost);
              }

              galleryManager.addImage({
                id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                url: data.imageUrl,
                imageUrl: data.imageUrl,
                prompt: promptTitle,
                fullPrompt: fullPromptToUse,
                model: settingsManager.getModelLabel(),
                seed: data.seed,
                dimensions: `${width}×${height}`
              });
            } else {
              throw new Error('No image URL in server response');
            }
          } catch (err) {
            console.error('Task generation failed:', err);
            errors.push(err.message || 'Generation failed');
          }
        });
      }
    }

    // Execute in parallel batches (concurrency of 3 to avoid hammering BFL / browser limits)
    const CONCURRENCY_LIMIT = 3;
    for (let i = 0; i < executionTasks.length; i += CONCURRENCY_LIMIT) {
      const batch = executionTasks.slice(i, i + CONCURRENCY_LIMIT).map(fn => fn());
      await Promise.all(batch);
    }

    setLoading(false);

    if (errors.length > 0 && completedCount === 0) {
      showError(`Generation failed: ${errors[0]}`);
    } else if (errors.length > 0 && completedCount > 0) {
      showError(`Generated ${completedCount} of ${totalExpectedImages} images. (${errors.length} failed: ${errors[0]})`);
    }

    updateCreditBalance();
  });

  // Credit balance management
  async function updateCreditBalance() {
    const apiKey = settingsManager.getApiKey();
    if (!apiKey) {
      remainingCreditsVal.textContent = '--';
      return;
    }

    refreshCreditsBtn?.classList.add('spinning');
    try {
      const credits = await fetchCredits(apiKey);
      setCreditsDisplay(credits);
    } catch (e) {
      console.warn('Credits fetch failed:', e.message);
    } finally {
      refreshCreditsBtn?.classList.remove('spinning');
    }
  }

  function setCreditsDisplay(balance, lastCost = null) {
    if (remainingCreditsVal) {
      remainingCreditsVal.textContent = formatCredits(balance);
      remainingCreditsVal.className = 'stat-value highlight-balance';
    }
    if (lastCost !== null && usedCreditsVal) {
      usedCreditsVal.textContent = formatCredits(lastCost);
      usedCreditsVal.className = 'stat-value highlight-cost';
    }
  }

  // Initial balance check
  if (settingsManager.getApiKey()) {
    updateCreditBalance();
  }
});
