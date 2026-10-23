/**
 * Gallery and Lightbox management module.
 */

import { downloadImageFile, fetchImageBlob } from './utils.js';

const STORAGE_KEY_GALLERY = 'bfl_gallery';

export class GalleryManager {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.gallerySection
   * @param {HTMLElement} options.galleryGrid
   * @param {HTMLElement} options.galleryCountBadge
   * @param {HTMLButtonElement} options.saveAllBtn
   * @param {HTMLButtonElement} options.clearAllBtn
   */
  constructor(options) {
    this.gallerySection = options.gallerySection;
    this.galleryGrid = options.galleryGrid;
    this.galleryCountBadge = options.galleryCountBadge;
    this.saveAllBtn = options.saveAllBtn;
    this.clearAllBtn = options.clearAllBtn;

    this.images = [];
    this.init();
  }

  init() {
    this.loadFromStorage();
    this.bindEvents();
    this.render();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GALLERY);
      if (saved) {
        this.images = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load gallery from storage:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(this.images));
    } catch (e) {
      console.warn('Could not save gallery to localStorage:', e);
    }
  }

  bindEvents() {
    this.saveAllBtn?.addEventListener('click', () => this.saveAllImages());
    this.clearAllBtn?.addEventListener('click', () => this.clearAllImages());
  }

  /**
   * Adds a newly generated image item to the front of the gallery.
   * @param {Object} imageData
   */
  addImage(imageData) {
    this.images.unshift(imageData);
    this.saveToStorage();
    this.render();
  }

  /**
   * Deletes a single image by its ID.
   * @param {string} id
   */
  deleteImage(id) {
    this.images = this.images.filter(img => img.id !== id);
    this.saveToStorage();
    this.render();
  }

  /**
   * Clears the entire gallery after confirmation.
   */
  clearAllImages() {
    if (this.images.length === 0) return;
    if (confirm('Are you sure you want to remove all images from the gallery?')) {
      this.images = [];
      this.saveToStorage();
      this.render();
    }
  }

  /**
   * Save all images in gallery.
   * Prompts the user to pick a target directory (via File System Access API),
   * or falls back to sequential browser downloads if not supported.
   */
  async saveAllImages() {
    if (this.images.length === 0 || !this.saveAllBtn) return;

    // Check if File System Access API (showDirectoryPicker) is supported
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'downloads'
        });

        this.saveAllBtn.disabled = true;
        const origHtml = this.saveAllBtn.innerHTML;

        for (let i = 0; i < this.images.length; i++) {
          const item = this.images[i];
          const filename = `flux-${item.seed || (i + 1)}-${item.id.slice(-6)}.jpg`;
          this.saveAllBtn.innerHTML = `<span>Saving (${i + 1}/${this.images.length})...</span>`;

          try {
            const blob = await fetchImageBlob(item.url, filename);
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } catch (err) {
            console.error(`Error saving ${filename} to directory:`, err);
          }
        }

        this.saveAllBtn.innerHTML = origHtml;
        this.saveAllBtn.disabled = false;
        return;
      } catch (err) {
        // User aborted folder selection (AbortError)
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('Folder selection failed or not allowed, falling back to sequential download:', err);
      }
    }

    // Fallback for browsers without showDirectoryPicker
    this.saveAllBtn.disabled = true;
    const origHtml = this.saveAllBtn.innerHTML;

    for (let i = 0; i < this.images.length; i++) {
      const item = this.images[i];
      const filename = `flux-${item.seed || (i + 1)}-${item.id.slice(-6)}.jpg`;
      this.saveAllBtn.innerHTML = `<span>Saving (${i + 1}/${this.images.length})...</span>`;
      await downloadImageFile(item.url, filename);
      // Small pause between sequential browser downloads
      await new Promise(r => setTimeout(r, 400));
    }

    this.saveAllBtn.innerHTML = origHtml;
    this.saveAllBtn.disabled = false;
  }

  render() {
    if (!this.galleryGrid || !this.gallerySection) return;

    if (this.images.length === 0) {
      this.gallerySection.classList.add('hidden');
      return;
    }

    this.gallerySection.classList.remove('hidden');
    if (this.galleryCountBadge) {
      this.galleryCountBadge.textContent = `${this.images.length} image${this.images.length > 1 ? 's' : ''}`;
    }

    this.galleryGrid.innerHTML = '';

    this.images.forEach((item) => {
      const card = this.createCardElement(item);
      this.galleryGrid.appendChild(card);
    });
  }

  createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.id = item.id;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-card-preview';

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.prompt || 'Generated FLUX image';
    img.loading = 'lazy';
    img.addEventListener('click', () => this.openLightbox(item.url, item.prompt));

    // Overlay action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-overlay-actions';

    // Save Button
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'card-icon-btn';
    saveBtn.title = 'Save / Download Image';
    saveBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `;
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const safeFilename = `flux-${item.seed || 'image'}-${Date.now().toString().slice(-4)}.jpg`;
      downloadImageFile(item.url, safeFilename);
    });

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'card-icon-btn btn-delete';
    deleteBtn.title = 'Delete image from gallery';
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteImage(item.id);
    });

    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(deleteBtn);

    previewDiv.appendChild(img);
    previewDiv.appendChild(actionsDiv);

    // Metadata
    const metaDiv = document.createElement('div');
    metaDiv.className = 'card-meta';

    const promptP = document.createElement('p');
    promptP.className = 'card-prompt';
    promptP.textContent = item.prompt;
    promptP.title = item.prompt;

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'card-tags';

    if (item.seed !== undefined && item.seed !== null) {
      const seedTag = document.createElement('span');
      seedTag.className = 'card-tag tag-seed';
      seedTag.textContent = `Seed: ${item.seed}`;
      tagsDiv.appendChild(seedTag);
    }

    if (item.model) {
      const modelTag = document.createElement('span');
      modelTag.className = 'card-tag tag-model';
      modelTag.textContent = item.model;
      tagsDiv.appendChild(modelTag);
    }

    if (item.dimensions) {
      const dimTag = document.createElement('span');
      dimTag.className = 'card-tag';
      dimTag.textContent = `${item.dimensions.width}×${item.dimensions.height}`;
      tagsDiv.appendChild(dimTag);
    }

    metaDiv.appendChild(promptP);
    metaDiv.appendChild(tagsDiv);

    card.appendChild(previewDiv);
    card.appendChild(metaDiv);

    return card;
  }

  openLightbox(imageUrl, caption) {
    const existing = document.querySelector('.lightbox-modal');
    if (existing) existing.remove();

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-modal';

    const content = document.createElement('div');
    content.className = 'lightbox-content';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => lightbox.remove());

    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'lightbox-image';
    if (caption) img.alt = caption;

    content.appendChild(closeBtn);
    content.appendChild(img);
    lightbox.appendChild(content);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.remove();
    });

    const onEsc = (e) => {
      if (e.key === 'Escape') {
        lightbox.remove();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);

    document.body.appendChild(lightbox);
  }
}
