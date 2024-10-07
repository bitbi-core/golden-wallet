import { sveltekit } from '@sveltejs/kit/vite';
import { bech32 } from 'bech32';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
	plugins: [sveltekit(), wasm()],
	// resolve: {
	// 	alias: {
	// 	  $components: path.resolve('./src/components'),
	// 	  $lib: path.resolve('./src/lib')
	// 	}
	//   },
	optimizeDeps: {
		exclude: [
			'tiny-secp256k1',
		]
	}
});
