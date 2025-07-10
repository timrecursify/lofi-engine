import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // Test environment configuration
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'build/',
        '.svelte-kit/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/app.html',
        'src/app.d.ts',
        'static/',
        'migrations/',
        'screenshots/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'tests/unit/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules/',
      'build/',
      '.svelte-kit/',
      'tests/e2e/',
      'tests/load/',
      'tests/smoke/'
    ],
    
    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml'
    },
    
    // Mock configuration
    deps: {
      inline: ['svelte']
    }
  },
  
  // Resolve configuration for testing
  resolve: {
    alias: {
      $lib: new URL('./src/lib', import.meta.url).pathname,
      $app: new URL('./src/app', import.meta.url).pathname
    }
  },
  
  // Define test environment variables
  define: {
    'import.meta.env.MODE': '"test"',
    'import.meta.env.PROD': 'false',
    'import.meta.env.DEV': 'true',
    'import.meta.env.VITE_ENVIRONMENT': '"test"'
  }
}); 