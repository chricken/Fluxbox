# FLUX Image Generator (Black Forest Labs)

A simple and modern web project for generating images with the official **Black Forest Labs (BFL) FLUX API**.

## Features
- **LLM Multi-Prompt Generator (Mistral, Claude, ChatGPT, Gemini)**: Expand high-level prompt ideas (e.g. "Generate 10 faces from different ethnicities in different professions") into distinct image prompts via your selected LLM before dispatching them directly to FLUX
- **Prompt Refine & Undo with LLM (✨ Refine with LLM & ↶ Undo)**: Dedicated AI refinement buttons on both General and Detail Prompts to automatically rewrite and elevate prompts with rich atmospheric details, composition, and visual textures, with full multi-level Undo support to restore previous versions
- **Saved Prompts Manager & History (LocalStorage)**: Save favorite prompts directly from both inputs with one click (💾 Save), browse and apply them from a collapsible drawer, sort by date (Newest/Oldest), alphabetically (A-Z/Z-A), or length, and delete individual saved prompts
- **Centralized Settings & Configuration (`public/js/config.js`)**: All themes, LLM providers, FLUX models, color presets, aspect ratios, resolutions, orientation, default values, and local storage keys are defined in a single modular config file
- **5 Themes**: Switch effortlessly between **Light**, **Dark**, **Elegant**, **High Contrast**, and **Neon** themes with automatic browser persistence
- **Collapsible Advanced Generation Settings**: Clean expandable accordion grouping *Number of Images*, *Seed* (with randomizer), *Color Presets*, and *Image Styles* with live summary badge
- **API Key input & Model Settings** (modal dialog with local storage persistence)
- **General Prompt & Detail Prompt**: Separate input for a persistent base/style prompt (lighting, mood, quality) and variable detail prompts for easy generation of variations
- **Image Style Presets (Bildstile)**: Choose rendering styles like Photoreal, Hyperreal, Pencil Drawing, Ink Drawing, Oil Painting, Watercolor, Anime/Manga, Impressionism, Pop Art, Surrealism, Digital Art, 3D-Rendered, or None
- **Color Presets & Moods (Farbstimmungen)**: Select from popular color presets (Colorful Neon, Golden Hour, Sepia, B/W, Yellow, Blue/Turquoise, Pastel, Cyberpunk, Moody Dark, Vintage Warm, Sunset Glow, Sci-Fi Orange/Teal, Dreamy Lavender) or define custom color palettes
- **Model selection**: Flux 3 Image, Flux 3 Image Klein, Flux 2 Max, Flux 2 Pro, Flux 2 Flex, Flux 2 Klein (9B, 4B)
- **Batch Generation & Seed**: Choose 1–4 images at once with sequential seeds and random seed generator
- **Gallery & Direct Downloads**: Persistent image gallery with single-image download, native folder picker dialog and batch saving to any directory on your computer via Node.js server routes (`/api/select-folder`, `/api/save-all`), and delete actions
- **Live Credit Overview**: Real-time balance and last generation cost tracking
- **Node.js Express backend proxy** to avoid CORS restrictions in the browser and handle asynchronous polling of the BFL API securely

---

## Quick Start

### 1. Installation
Make sure [Node.js](https://nodejs.org/) is installed. Run in the project directory:
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open the application
Open in your browser:
**[http://localhost:3456](http://localhost:3456)**

---

## Usage
1. Enter your BFL API key in the corresponding field (available at [docs.bfl.ml](https://docs.bfl.ml)).
2. Select the desired model, aspect ratio, resolution, and orientation.
3. Enter your prompt.
4. Click **Generate Image**.
5. Once the image is generated, it will be displayed directly on the page and can be downloaded.

Optionally, the API key can also be stored on the server via a `.env` file:
```env
BFL_API_KEY=your_api_key_here
PORT=3456
```
