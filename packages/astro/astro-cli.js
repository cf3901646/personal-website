#!/usr/bin/env node
import('vite').then(({ build }) => {
  return build();
}).catch((err) => {
  console.error('Vite build failed via astro bridge:', err);
  process.exit(1);
});
