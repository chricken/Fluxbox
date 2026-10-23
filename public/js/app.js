/**
 * Main application coordinator module.
 */

import { calculateDimensions, formatCredits } from './utils.js';
import { generateImage, fetchCredits } from './api.js';
import { SettingsManager } from './settings.js';
import { GalleryManager } from './gallery.js';
import {
  STORAGE_KEYS,
  THEMES,
  COLOR_PRESETS,
  ASPECT_RATIOS,
  RESOLUTIONS,
  ORIENTATIONS,
  IMAGE_COUNTS,
  DEFAULT_SETTINGS,
  getColorPrompt
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
  const generalPromptInput = document.getElementById('generalPrompt');
  const promptInput = document.getElementById('prompt');
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
    onApiKeyChange: () => updateCreditBalance(),
    onModelChange: () => {}
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
    const countText = `${count} ${count === '1' ? 'Image' : 'Images'}`;
    
    const seedVal = seedInput ? seedInput.value.trim() : '';
    const seedText = seedVal ? `Seed: ${seedVal}` : 'Random Seed';

    let colorText = 'Color: None';
    if (colorPresetSelect) {
      const selectedOption = colorPresetSelect.options[colorPresetSelect.selectedIndex];
      const presetVal = colorPresetSelect.value;
      if (presetVal === 'custom') {
        const customVal = customColorInput ? customColorInput.value.trim() : '';
        colorText = `Color: ${customVal ? `"${customVal}"` : 'Custom'}`;
      } else if (presetVal !== 'none' && selectedOption) {
        colorText = `Color: ${selectedOption.textContent}`;
      }
    }

    advancedPreviewBadge.textContent = `${countText} • ${seedText} • ${colorText}`;
  }

  // Populate Dropdowns from config.js
  function populateSelect(selectEl, items, defaultValue, labelExtractor = item => item.label, valueExtractor = item => item.value !== undefined ? item.value : item.id) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = valueExtractor(item);
      option.textContent = labelExtractor(item);
      if (option.value === String(defaultValue) || item.isDefault) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    });
  }

  function initFormDropdowns() {
    populateSelect(themeSelect, THEMES, DEFAULT_SETTINGS.theme, t => `${t.icon} ${t.label}`, t => t.id);
    populateSelect(colorPresetSelect, COLOR_PRESETS, DEFAULT_SETTINGS.colorPreset, p => p.label, p => p.id);
    populateSelect(aspectRatioSelect, ASPECT_RATIOS, DEFAULT_SETTINGS.aspectRatio);
    populateSelect(resolutionSelect, RESOLUTIONS, DEFAULT_SETTINGS.resolution);
    populateSelect(orientationSelect, ORIENTATIONS, DEFAULT_SETTINGS.orientation);
    populateSelect(imageCountSelect, IMAGE_COUNTS, DEFAULT_SETTINGS.imageCount);
  }

  initFormDropdowns();

  // Load saved theme
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || DEFAULT_SETTINGS.theme;
    applyTheme(savedTheme);
  } catch (e) {
    applyTheme(DEFAULT_SETTINGS.theme);
  }

  // Theme change listener
  themeSelect?.addEventListener('change', () => {
    applyTheme(themeSelect.value);
  });

  // Collapsible state handling
  if (advancedSettingsDetails) {
    try {
      const savedOpenState = localStorage.getItem(STORAGE_KEYS.advancedSettingsOpen);
      if (savedOpenState !== null) {
        advancedSettingsDetails.open = savedOpenState === 'true';
      }
    } catch (e) {
      console.warn('Could not read advanced settings state:', e);
    }

    advancedSettingsDetails.addEventListener('toggle', () => {
      try {
        localStorage.setItem(STORAGE_KEYS.advancedSettingsOpen, String(advancedSettingsDetails.open));
      } catch (e) {
        console.warn('Could not save advanced settings state:', e);
      }
    });
  }

  // Credits refresh logic
  async function updateCreditBalance() {
    const key = settingsManager.getApiKey();
    if (!key) {
      if (remainingCreditsVal) {
        remainingCreditsVal.textContent = '--';
        remainingCreditsVal.classList.remove('highlight-balance');
      }
      return;
    }

    if (refreshCreditsBtn) {
      refreshCreditsBtn.classList.add('spinning');
    }

    try {
      const credits = await fetchCredits(key);
      if (credits !== undefined && remainingCreditsVal) {
        remainingCreditsVal.textContent = formatCredits(credits);
        remainingCreditsVal.classList.add('highlight-balance');
      }
    } catch (e) {
      console.warn('Error fetching credit balance:', e);
      if (remainingCreditsVal) remainingCreditsVal.textContent = 'Error';
    } finally {
      if (refreshCreditsBtn) {
        refreshCreditsBtn.classList.remove('spinning');
      }
    }
  }

  // Initial credits check if key exists
  if (settingsManager.getApiKey()) {
    updateCreditBalance();
  }

  // Load saved general prompt & form presets from LocalStorage
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

  // Form Submit (Batch Generation)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = settingsManager.getApiKey();
    const detailPrompt = promptInput.value.trim();
    const generalPrompt = generalPromptInput ? generalPromptInput.value.trim() : '';
    const endpoint = settingsManager.getModel();
    const aspectRatio = aspectRatioSelect.value;
    const resolutionMP = parseFloat(resolutionSelect.value);
    const orientation = orientationSelect.value;
    const count = parseInt(imageCountSelect.value, 10) || 1;
    const baseSeedVal = seedInput.value.trim();

    if (!apiKey) {
      showError('Please enter your BFL API key in Settings.');
      settingsManager.openModal();
      return;
    }

    const selectedPreset = colorPresetSelect ? colorPresetSelect.value : DEFAULT_SETTINGS.colorPreset;
    const customColor = customColorInput ? customColorInput.value : '';
    const colorPromptPart = getColorPrompt(selectedPreset, customColor);

    if (!detailPrompt && !generalPrompt && !colorPromptPart) {
      showError('Please enter a detail prompt, a general prompt, or select a color preset.');
      return;
    }

    // Combine detail prompt, general prompt, and color preset
    const promptParts = [];
    if (detailPrompt) promptParts.push(detailPrompt.replace(/[,;.\s]+$/, ''));
    if (generalPrompt) promptParts.push(generalPrompt.replace(/^[,;.\s]+|[,;.\s]+$/g, ''));
    if (colorPromptPart) promptParts.push(colorPromptPart.replace(/^[,;.\s]+|[,;.\s]+$/g, ''));

    const fullPrompt = promptParts.join(', ');

    const { width, height } = calculateDimensions(aspectRatio, resolutionMP, orientation);

    // Set UI to loading state
    setLoading(true);
    hideError();
    setStatus(count > 1 ? `Starting generation for ${count} images...` : 'Starting image generation...');

    let totalCost = 0;
    let completedCount = 0;
    const errors = [];

    // Prepare requests
    const tasks = [];
    for (let i = 0; i < count; i++) {
      let currentSeed = undefined;
      if (baseSeedVal !== '') {
        const parsedSeed = parseInt(baseSeedVal, 10);
        if (!isNaN(parsedSeed)) {
          // Increment seed for consecutive images if multiple requested
          currentSeed = parsedSeed + i;
        }
      }

      tasks.push(async () => {
        try {
          const data = await generateImage({
            apiKey,
            prompt: fullPrompt,
            endpoint,
            width,
            height,
            seed: currentSeed
          });

          if (data.imageUrl) {
            completedCount++;
            if (count > 1) {
              setStatus(`Generated ${completedCount} of ${count} images...`);
            }

            if (data.cost !== undefined && data.cost !== null) {
              totalCost += Number(data.cost);
            }

            if (data.remainingCredits !== undefined && data.remainingCredits !== null && remainingCreditsVal) {
              remainingCreditsVal.textContent = formatCredits(data.remainingCredits);
              remainingCreditsVal.classList.add('highlight-balance');
            }

            galleryManager.addImage({
              id: data.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              url: data.imageUrl,
              prompt: fullPrompt,
              seed: data.seed !== undefined ? data.seed : currentSeed,
              model: settingsManager.getModelLabel(),
              dimensions: { width, height },
              timestamp: Date.now()
            });

            return data;
          } else {
            throw new Error('No image URL received in response');
          }
        } catch (err) {
          errors.push(err.message || 'Unknown generation error');
          return null;
        }
      });
    }

    try {
      // Execute all image generation requests in parallel
      await Promise.all(tasks.map(t => t()));

      if (totalCost > 0 && usedCreditsVal) {
        usedCreditsVal.textContent = formatCredits(totalCost);
        usedCreditsVal.classList.add('highlight-cost');
      }

      if (errors.length > 0 && completedCount === 0) {
        showError(`All generations failed:\n${errors.join('\n')}`);
      } else if (errors.length > 0) {
        showError(`Generated ${completedCount}/${count} images. Some errors occurred:\n${errors.join('\n')}`);
      }

      // Smooth scroll to gallery
      if (completedCount > 0 && gallerySection) {
        gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Refresh final credits balance
      updateCreditBalance();
    } catch (err) {
      showError('Network or server error: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  });
});
