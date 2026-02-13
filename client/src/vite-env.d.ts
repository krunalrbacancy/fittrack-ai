/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_USDA_API_KEY?: string
  // Legacy Edamam support (optional)
  readonly VITE_EDAMAM_APP_ID?: string
  readonly VITE_EDAMAM_APP_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

