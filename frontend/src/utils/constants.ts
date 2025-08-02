export const DEFAULT_PARAMETERS = {
  steps: 30,
  cfgScale: 4.0,
  seed: -1,
  width: 1024,
  height: 1024,
} as const;

export const RESOLUTIONS = [
  { label: "Square (1024x1024)", width: 1024, height: 1024 },
  { label: "Portrait (768x1024)", width: 768, height: 1024 },
  { label: "Landscape (1024x768)", width: 1024, height: 768 },
  { label: "Wide (1280x768)", width: 1280, height: 768 },
  { label: "Ultra Wide (1536x640)", width: 1536, height: 640 },
] as const;

export const EXAMPLE_PROMPTS = [
  {
    category: "Artistic",
    prompts: [
      "A serene Japanese garden with cherry blossoms, koi pond, and traditional architecture, soft morning light",
      "Abstract expressionist painting with vibrant colors, dynamic brushstrokes, emotional depth",
      "Surreal dreamscape with floating islands, bioluminescent plants, ethereal atmosphere",
    ],
  },
  {
    category: "Photography",
    prompts: [
      "Professional portrait photography, dramatic lighting, shallow depth of field, cinematic mood",
      "Macro photography of dewdrops on spider web, golden hour lighting, extreme detail",
      "Street photography in Tokyo at night, neon lights, rain reflections, cyberpunk aesthetic",
    ],
  },
  {
    category: "Fantasy",
    prompts: [
      "Majestic dragon perched on mountain peak, storm clouds gathering, epic fantasy art style",
      "Enchanted forest with glowing mushrooms, fairy lights, magical creatures, Studio Ghibli style",
      "Steampunk airship flying through clouds, brass and copper details, Victorian era inspired",
    ],
  },
  {
    category: "Sci-Fi",
    prompts: [
      "Futuristic cityscape with flying vehicles, holographic advertisements, cyberpunk aesthetic",
      "Alien planet landscape with unusual rock formations, multiple moons, sci-fi concept art",
      "Robot companion in cozy workshop, warm lighting, detailed mechanical parts, Pixar style",
    ],
  },
];

export const KEYBOARD_SHORTCUTS = {
  generate: "Ctrl+Enter",
  clear: "Ctrl+Shift+C",
  randomSeed: "Ctrl+R",
  toggleTheme: "Ctrl+Shift+T",
} as const;

export const API_ENDPOINTS = {
  health: "/health",
  generate: "/generate",
  models: "/models",
} as const;

export const STORAGE_KEYS = {
  theme: "flux-krea-theme",
  apiEndpoint: "flux-krea-api-endpoint",
  preferences: "flux-krea-preferences",
  history: "flux-krea-history",
} as const;