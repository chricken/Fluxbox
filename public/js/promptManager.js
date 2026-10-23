import { STORAGE_KEYS } from './config.js';

/**
 * Manages prompt history, persistence in localStorage, sorting, deletion, and undo stack.
 */
export class PromptManager {
  /**
   * @param {Object} options
   * @param {string} options.type - 'general' | 'detail'
   * @param {HTMLTextAreaElement} options.textareaEl - The textarea element
   * @param {HTMLButtonElement} options.refineBtn - The refine with LLM button
   * @param {HTMLButtonElement} options.undoBtn - The undo button
   * @param {HTMLButtonElement} options.saveBtn - The save prompt button
   * @param {HTMLDetailsElement} options.collapsibleEl - The saved prompts collapsible section
   * @param {HTMLElement} options.savedListEl - The container for saved prompt items
   * @param {HTMLSelectElement} options.sortSelectEl - The sort select dropdown
   * @param {HTMLElement} options.countBadgeEl - The badge showing count of saved prompts
   * @param {Function} options.onRefine - Callback when refine button is clicked
   */
  constructor({
    type,
    textareaEl,
    refineBtn,
    undoBtn,
    saveBtn,
    collapsibleEl,
    savedListEl,
    sortSelectEl,
    countBadgeEl,
    onRefine
  }) {
    this.type = type;
    this.textareaEl = textareaEl;
    this.refineBtn = refineBtn;
    this.undoBtn = undoBtn;
    this.saveBtn = saveBtn;
    this.collapsibleEl = collapsibleEl;
    this.savedListEl = savedListEl;
    this.sortSelectEl = sortSelectEl;
    this.countBadgeEl = countBadgeEl;
    this.onRefine = onRefine;

    this.storageKey = type === 'general' ? STORAGE_KEYS.savedGeneralPrompts : STORAGE_KEYS.savedDetailPrompts;
    this.sortStorageKey = type === 'general' ? STORAGE_KEYS.generalPromptHistorySort : STORAGE_KEYS.detailPromptHistorySort;
    this.sectionOpenKey = type === 'general' ? STORAGE_KEYS.generalPromptSectionOpen : STORAGE_KEYS.detailPromptSectionOpen;

    // Undo stack for previous prompt versions
    this.undoStack = [];
    this.maxUndoStack = 20;

    // Saved prompts list: Array<{ id: string, text: string, title?: string, createdAt: number, updatedAt: number }>
    this.savedPrompts = this.loadSavedPrompts();

    this.init();
  }

  /**
   * Initializes event listeners and renders initial state.
   */
  init() {
    // Track previous value before input changes for undo
    let lastValue = this.textareaEl ? this.textareaEl.value : '';

    if (this.textareaEl) {
      this.textareaEl.addEventListener('focus', () => {
        lastValue = this.textareaEl.value;
      });

      this.textareaEl.addEventListener('input', () => {
        this.updateUndoButtonState();
      });
    }

    // Refine button
    if (this.refineBtn && this.onRefine) {
      this.refineBtn.addEventListener('click', () => {
        this.onRefine(this);
      });
    }

    // Undo button
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => {
        this.undo();
      });
    }

    // Save prompt button
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => {
        this.saveCurrentPrompt();
      });
    }

    // Sort select
    if (this.sortSelectEl) {
      const savedSort = localStorage.getItem(this.sortStorageKey) || 'newest';
      this.sortSelectEl.value = savedSort;
      this.sortSelectEl.addEventListener('change', () => {
        localStorage.setItem(this.sortStorageKey, this.sortSelectEl.value);
        this.renderSavedList();
      });
    }

    // Collapsible state restore & save
    if (this.collapsibleEl) {
      const isOpen = localStorage.getItem(this.sectionOpenKey) === 'true';
      if (isOpen) {
        this.collapsibleEl.open = true;
      }
      this.collapsibleEl.addEventListener('toggle', () => {
        localStorage.setItem(this.sectionOpenKey, this.collapsibleEl.open ? 'true' : 'false');
      });
    }

    this.updateUndoButtonState();
    this.renderSavedList();
  }

  /**
   * Pushes the current value to undo stack before replacing or updating it.
   * @param {string} prevValue
   */
  pushUndo(prevValue) {
    if (prevValue === undefined || prevValue === null) {
      prevValue = this.textareaEl.value;
    }
    // Don't push duplicate consecutive entries
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === prevValue) {
      return;
    }
    this.undoStack.push(prevValue);
    if (this.undoStack.length > this.maxUndoStack) {
      this.undoStack.shift();
    }
    this.updateUndoButtonState();
  }

  /**
   * Restores the previous prompt from undo stack.
   */
  undo() {
    if (this.undoStack.length === 0) return;
    const previous = this.undoStack.pop();
    if (this.textareaEl) {
      this.textareaEl.value = previous;
      this.textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
      this.textareaEl.dispatchEvent(new Event('change', { bubbles: true }));
      this.textareaEl.focus();
    }
    this.updateUndoButtonState();
  }

  /**
   * Updates disabled state and title of the undo button.
   */
  updateUndoButtonState() {
    if (!this.undoBtn) return;
    const canUndo = this.undoStack.length > 0;
    this.undoBtn.disabled = !canUndo;
    if (canUndo) {
      this.undoBtn.title = `Undo last prompt change (${this.undoStack.length} step${this.undoStack.length > 1 ? 's' : ''} available)`;
      this.undoBtn.classList.remove('btn-disabled');
    } else {
      this.undoBtn.title = 'No previous prompt to restore';
      this.undoBtn.classList.add('btn-disabled');
    }
  }

  /**
   * Loads saved prompts from localStorage.
   * @returns {Array<Object>}
   */
  loadSavedPrompts() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.warn(`Failed to parse saved prompts for ${this.type}:`, e);
      return [];
    }
  }

  /**
   * Persists saved prompts list to localStorage.
   */
  persistSavedPrompts() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.savedPrompts));
    } catch (e) {
      console.error(`Failed to save prompts for ${this.type}:`, e);
    }
    this.renderSavedList();
  }

  /**
   * Saves the current textarea prompt into the saved list.
   */
  saveCurrentPrompt() {
    const text = this.textareaEl ? this.textareaEl.value.trim() : '';
    if (!text) {
      alert('Please enter some prompt text first before saving.');
      if (this.textareaEl) this.textareaEl.focus();
      return;
    }

    // Check if an identical prompt already exists
    const existingIndex = this.savedPrompts.findIndex(p => p.text.trim() === text);
    if (existingIndex !== -1) {
      // Move to top / update timestamp
      this.savedPrompts[existingIndex].updatedAt = Date.now();
      // Ensure collapsible is open so user sees it
      if (this.collapsibleEl) this.collapsibleEl.open = true;
      this.persistSavedPrompts();
      this.highlightItem(this.savedPrompts[existingIndex].id);
      return;
    }

    const newItem = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: text,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.savedPrompts.unshift(newItem);
    if (this.collapsibleEl) {
      this.collapsibleEl.open = true;
    }
    this.persistSavedPrompts();
    this.highlightItem(newItem.id);
  }

  /**
   * Selects and loads a prompt into the textarea.
   * @param {string} id
   */
  selectPrompt(id) {
    const item = this.savedPrompts.find(p => p.id === id);
    if (!item || !this.textareaEl) return;

    if (this.textareaEl.value !== item.text) {
      this.pushUndo(this.textareaEl.value);
      this.textareaEl.value = item.text;
      this.textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
      this.textareaEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    this.textareaEl.focus();
  }

  /**
   * Deletes a prompt item by id.
   * @param {string} id
   */
  deletePrompt(id) {
    const item = this.savedPrompts.find(p => p.id === id);
    const preview = item ? `"${item.text.substring(0, 40)}..."` : 'this prompt';
    if (!confirm(`Delete saved prompt ${preview}?`)) {
      return;
    }

    this.savedPrompts = this.savedPrompts.filter(p => p.id !== id);
    this.persistSavedPrompts();
  }

  /**
   * Gets sorted list of saved prompts based on current sort criteria.
   * @returns {Array<Object>}
   */
  getSortedPrompts() {
    const sortMode = this.sortSelectEl ? this.sortSelectEl.value : 'newest';
    const copy = [...this.savedPrompts];

    switch (sortMode) {
      case 'newest':
        return copy.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      case 'oldest':
        return copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      case 'alpha-asc':
        return copy.sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));
      case 'alpha-desc':
        return copy.sort((a, b) => b.text.localeCompare(a.text, undefined, { sensitivity: 'base' }));
      case 'length-desc':
        return copy.sort((a, b) => b.text.length - a.text.length);
      case 'length-asc':
        return copy.sort((a, b) => a.text.length - b.text.length);
      default:
        return copy;
    }
  }

  /**
   * Renders the list of saved prompts.
   */
  renderSavedList() {
    if (this.countBadgeEl) {
      this.countBadgeEl.textContent = this.savedPrompts.length.toString();
    }

    if (!this.savedListEl) return;

    const sorted = this.getSortedPrompts();

    if (sorted.length === 0) {
      this.savedListEl.innerHTML = `
        <div class="saved-prompts-empty">
          <span>No saved prompts yet. Click <strong>💾 Save</strong> to store reusable prompts.</span>
        </div>
      `;
      return;
    }

    this.savedListEl.innerHTML = sorted.map(item => {
      const dateFormatted = new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="saved-prompt-item" id="item_${item.id}" data-id="${item.id}">
          <div class="saved-prompt-content" title="Click to use this prompt">
            <p class="saved-prompt-text">${this.escapeHtml(item.text)}</p>
            <div class="saved-prompt-meta">
              <span class="saved-prompt-date">🕒 ${dateFormatted}</span>
              <span class="saved-prompt-length">${item.text.length} chars</span>
            </div>
          </div>
          <div class="saved-prompt-actions">
            <button type="button" class="btn-item-action btn-item-apply" title="Apply prompt" data-action="apply" data-id="${item.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Use</span>
            </button>
            <button type="button" class="btn-item-action btn-item-delete" title="Delete from saved list" data-action="delete" data-id="${item.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards and buttons
    this.savedListEl.querySelectorAll('.saved-prompt-item').forEach(el => {
      const id = el.dataset.id;
      const contentEl = el.querySelector('.saved-prompt-content');
      if (contentEl) {
        contentEl.addEventListener('click', () => {
          this.selectPrompt(id);
        });
      }

      const applyBtn = el.querySelector('[data-action="apply"]');
      if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectPrompt(id);
        });
      }

      const deleteBtn = el.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deletePrompt(id);
        });
      }
    });
  }

  /**
   * Highlights a newly saved or updated prompt item.
   * @param {string} id
   */
  highlightItem(id) {
    setTimeout(() => {
      const el = document.getElementById(`item_${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        el.classList.add('item-highlight');
        setTimeout(() => el.classList.remove('item-highlight'), 1800);
      }
    }, 50);
  }

  /**
   * Helper to escape HTML characters.
   */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
