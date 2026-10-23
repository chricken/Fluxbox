import { STORAGE_KEYS, MODELS, DEFAULT_SETTINGS } from './config.js';

/**
 * Settings and Modal management module.
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

    this.onApiKeyChange = options.onApiKeyChange || (() => {});
    this.onModelChange = options.onModelChange || (() => {});

    this.init();
  }

  init() {
    this.populateModelOptions();
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

  loadSavedSettings() {
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    if (savedApiKey && this.apiKeyInput) {
      this.apiKeyInput.value = savedApiKey;
    }

    const savedModel = localStorage.getItem(STORAGE_KEYS.model) || DEFAULT_SETTINGS.model;
    if (savedModel && this.endpointSelect) {
      if (this.endpointSelect.querySelector(`option[value="${savedModel}"]`)) {
        this.endpointSelect.value = savedModel;
      }
    }
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

    // Toggle API Key visibility
    this.toggleApiKeyBtn?.addEventListener('click', () => {
      if (this.apiKeyInput.type === 'password') {
        this.apiKeyInput.type = 'text';
        this.toggleApiKeyBtn.textContent = 'Hide';
      } else {
        this.apiKeyInput.type = 'password';
        this.toggleApiKeyBtn.textContent = 'Show';
      }
    });

    // Inputs change listeners
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
}
