import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
	server: {
	  allowedHosts: ['test.popok.uk']
	},
	plugins: [
		sveltekit(),
		VitePWA()
	]
  });
