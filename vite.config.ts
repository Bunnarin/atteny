import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
	  allowedHosts: ['test.popok.uk']
	},
	plugins: [sveltekit()]
  });
