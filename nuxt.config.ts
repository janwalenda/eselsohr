import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import tailwindcss from '@tailwindcss/vite'

// Load .env.local then .env so local secrets win over tracked defaults; dotenv never
// overwrites existing process.env (shell / CI / Netlify).
const _envRoot = process.cwd()
if (existsSync(resolve(_envRoot, '.env.local'))) {
  loadDotenv({ path: resolve(_envRoot, '.env.local') })
}
loadDotenv({ path: resolve(_envRoot, '.env') })

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  nitro: {
    preset: 'netlify',
  },

  modules: ['shadcn-nuxt', '@netlify/nuxt'],

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || '',
    appName: process.env.NUXT_APP_NAME || 'Eselsohr',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
})
