import { STORAGE_KEYS, MODELS, LLM_PROVIDERS, DEFAULT_SETTINGS } from './config.js';

/**
 * Settings and Modal management module.
 * Manages BFL API Key, Flux Model, as well as multi-provider LLM settings (Mistral, Claude, ChatGPT, Gemini).
 */
export class SettingsManager {
  /**
   * @param {Object} options
   * @param {HTMLInputElement} options.apiKeyInput
   * @param {HTMLButtonElement} options.toggleApiKeyBtn
   * @param {HTMLSelectElement} options.endpointSelect
   * @param {HTMLElement} options.settingsModal
   * @param {HTMLElement} options.openSettingsBtn
   * @param {HTMLElement} options.activeConfigBar
   * @param {HTMLElement} options.closeSettingsBtn
   * @param {HTMLElement} options.saveSettingsBtn
   * @param {HTMLElement} options.currentModelBadge
   * @param {HTMLElement} options.apiKeyStatusBadge
   * @param {HTMLSelectElement} [options.llmProviderSelect]
   * @param {HTMLSelectElement} [options.llmModelSelect]
   * @param {HTMLInputElement} [options.llmApiKeyInput]
   * @param {HTMLElement} [options.llmApiKeyLabel]
   * @param {HTMLButtonElement} [options.toggleLlmApiKeyBtn]
   * @param {Function} [options.onApiKeyChange]
   * @param {Function} [options.onModelChange]
   */
  constructor(options) {
    this.apiKeyInput = options.apiKeyInput;
    this.toggleApiKeyBtn = options.toggleApiKeyBtn;
    this.endpointSelect = options.endpointSelect;
    this.settingsModal = options.settingsModal;
    this.openSettingsBtn = options.openSettingsBtn;
    this.activeConfigBar = options.activeConfigBar;
    this.closeSettingsBtn = options.closeSettingsBtn;
    this.saveSettingsBtn = options.saveSettingsBtn;
    this.currentModelBadge = options.currentModelBadge;
    this.apiKeyStatusBadge = options.apiKeyStatusBadge;

    // LLM Elements
    this.llmProviderSelect = options.llmProviderSelect;
    this.llmModelSelect = options.llmModelSelect;
    this.llmApiKeyInput = options.llmApiKeyInput;
    this.llmApiKeyLabel = options.llmApiKeyLabel;
    this.toggleLlmApiKeyBtn = options.toggleLlmApiKeyBtn;

    this.onApiKeyChange = options.onApiKeyChange || (() => {});
    this.onModelChange = options.onModelChange || (() => {});

    this.init();
  }

  init() {
    this.populateModelOptions();
    this.initLLMProviders();
    this.loadSavedSettings();
    this.bindEvents();
    this.updateConfigDisplay();
  }

  populateModelOptions() {
    if (!this.endpointSelect) return;
    this.endpointSelect.innerHTML = '';
    MODELS.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.label || model.name;
      if (model.isDefault) {
        option.selected = true;
      }
      this.endpointSelect.appendChild(option);
    });
  }

  initLLMProviders() {
    if (!this.llmProviderSelect) return;
    this.llmProviderSelect.innerHTML = '';
    LLM_PROVIDERS.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.id;
      option.textContent = provider.name;
      if (provider.id === DEFAULT_SETTINGS.llmProvider) {
        option.selected = true;
      }
      this.llmProviderSelect.appendChild(option);
    });

    this.populateLLMModels();
  }

  populateLLMModels() {
    if (!this.llmModelSelect || !this.llmProviderSelect) return;
    const providerId = this.llmProviderSelect.value;
    const providerConfig = LLM_PROVIDERS.find(p => p.id === providerId) || LLM_PROVIDERS[0];

    this.llmModelSelect.innerHTML = '';
    providerConfig.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      if (model.isDefault) {
        option.selected = true;
      }
      this.llmModelSelect.appendChild(option);
    });

    // Update Label and Placeholder
    if (this.llmApiKeyLabel) {
      this.llmApiKeyLabel.textContent = `${providerConfig.name} API Key`;
    }
    if (this.llmApiKeyInput) {
      this.llmApiKeyInput.placeholder = providerConfig.placeholder || 'API Key...';
    }

    // Load saved model and key for this specific provider
    const savedModel = localStorage.getItem(`${STORAGE_KEYS.llmModelPrefix}${providerId}`) || providerConfig.defaultModel;
    if (savedModel && this.llmModelSelect.querySelector(`option[value="${savedModel}"]`)) {
      this.llmModelSelect.value = savedModel;
    }

    const savedApiKey = localStorage.getItem(`${STORAGE_KEYS.llmApiKeyPrefix}${providerId}`) || '';
    if (this.llmApiKeyInput) {
      this.llmApiKeyInput.value = savedApiKey;
    }
  }

  loadSavedSettings() {
    // BFL API Key
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    if (savedApiKey && this.apiKeyInput) {
      this.apiKeyInput.value = savedApiKey;
    }

    // BFL Model
    const savedModel = localStorage.getItem(STORAGE_KEYS.model) || DEFAULT_SETTINGS.model;
    if (savedModel && this.endpointSelect) {
      if (this.endpointSelect.querySelector(`option[value="${savedModel}"]`)) {
        this.endpointSelect.value = savedModel;
      }
    }

    // LLM Provider
    const savedProvider = localStorage.getItem(STORAGE_KEYS.llmProvider) || DEFAULT_SETTINGS.llmProvider;
    if (savedProvider && this.llmProviderSelect) {
      if (this.llmProviderSelect.querySelector(`option[value="${savedProvider}"]`)) {
        this.llmProviderSelect.value = savedProvider;
      }
    }

    this.populateLLMModels();
  }

  bindEvents() {
    // Modal toggle listeners
    this.openSettingsBtn?.addEventListener('click', () => this.openModal());
    this.activeConfigBar?.addEventListener('click', () => this.openModal());
    this.activeConfigBar?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openModal();
      }
    });

    this.closeSettingsBtn?.addEventListener('click', () => this.closeModal());
    this.saveSettingsBtn?.addEventListener('click', () => this.closeModal());

    this.settingsModal?.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.settingsModal.classList.contains('hidden')) {
        this.closeModal();
      }
    });

    // Toggle BFL API Key visibility
    this.toggleApiKeyBtn?.addEventListener('click', () => {
      if (this.apiKeyInput.type === 'password') {
        this.apiKeyInput.type = 'text';
        this.toggleApiKeyBtn.textContent = 'Hide';
      } else {
        this.apiKeyInput.type = 'password';
        this.toggleApiKeyBtn.textContent = 'Show';
      }
    });

    // Toggle LLM API Key visibility
    this.toggleLlmApiKeyBtn?.addEventListener('click', () => {
      if (!this.llmApiKeyInput) return;
      if (this.llmApiKeyInput.type === 'password') {
        this.llmApiKeyInput.type = 'text';
        this.toggleLlmApiKeyBtn.textContent = 'Hide';
      } else {
        this.llmApiKeyInput.type = 'password';
        this.toggleLlmApiKeyBtn.textContent = 'Show';
      }
    });

    // BFL Inputs change listeners
    this.apiKeyInput?.addEventListener('input', () => {
      const key = this.apiKeyInput.value.trim();
      localStorage.setItem(STORAGE_KEYS.apiKey, key);
      this.updateConfigDisplay();
      this.onApiKeyChange(key);
    });

    this.endpointSelect?.addEventListener('change', () => {
      const model = this.endpointSelect.value;
      localStorage.setItem(STORAGE_KEYS.model, model);
      this.updateConfigDisplay();
      this.onModelChange(model);
    });

    // LLM Provider change listener
    this.llmProviderSelect?.addEventListener('change', () => {
      const provider = this.llmProviderSelect.value;
      localStorage.setItem(STORAGE_KEYS.llmProvider, provider);
      this.populateLLMModels();
    });

    // LLM Model change listener
    this.llmModelSelect?.addEventListener('change', () => {
      const provider = this.llmProviderSelect?.value || DEFAULT_SETTINGS.llmProvider;
      const model = this.llmModelSelect.value;
      localStorage.setItem(`${STORAGE_KEYS.llmModelPrefix}${provider}`, model);
    });

    // LLM API Key change listener
    this.llmApiKeyInput?.addEventListener('input', () => {
      const provider = this.llmProviderSelect?.value || DEFAULT_SETTINGS.llmProvider;
      const key = this.llmApiKeyInput.value.trim();
      localStorage.setItem(`${STORAGE_KEYS.llmApiKeyPrefix}${provider}`, key);
    });
  }

  openModal() {
    this.settingsModal.classList.remove('hidden');
    this.apiKeyInput.focus();
  }

  closeModal() {
    this.settingsModal.classList.add('hidden');
  }

  updateConfigDisplay() {
    const selectedOption = this.endpointSelect?.options[this.endpointSelect.selectedIndex];
    if (selectedOption && this.currentModelBadge) {
      this.currentModelBadge.textContent = selectedOption.text.replace(/\s*\([^)]*\)$/, '');
    }

    if (this.apiKeyStatusBadge && this.apiKeyInput) {
      const hasKey = Boolean(this.apiKeyInput.value.trim());
      if (hasKey) {
        this.apiKeyStatusBadge.textContent = 'Configured ✓';
        this.apiKeyStatusBadge.classList.add('configured');
      } else {
        this.apiKeyStatusBadge.textContent = 'Not set';
        this.apiKeyStatusBadge.classList.remove('configured');
      }
    }
  }

  getApiKey() {
    return this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
  }

  getModel() {
    return this.endpointSelect ? this.endpointSelect.value : DEFAULT_SETTINGS.model;
  }

  getModelLabel() {
    const selectedOption = this.endpointSelect?.options[this.endpointSelect?.selectedIndex];
    return selectedOption ? selectedOption.text : this.getModel();
  }

  getLLMProvider() {
    return this.llmProviderSelect ? this.llmProviderSelect.value : (localStorage.getItem(STORAGE_KEYS.llmProvider) || DEFAULT_SETTINGS.llmProvider);
  }

  getLLMModel() {
    const provider = this.getLLMProvider();
    return this.llmModelSelect ? this.llmModelSelect.value : (localStorage.getItem(`${STORAGE_KEYS.llmModelPrefix}${provider}`) || '');
  }

  getLLMApiKey() {
    const provider = this.getLLMProvider();
    return this.llmApiKeyInput ? this.llmApiKeyInput.value.trim() : (localStorage.getItem(`${STORAGE_KEYS.llmApiKeyPrefix}${provider}`) || '');
  }
}
