import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    errors: ['rate<0.1'],              // Custom error rate under 10%
  },
};

// Configuration
const BASE_URL = __ENV.K6_TEST_ENV === 'production' 
  ? 'https://chillcast.fm'
  : 'https://chillcast-staging.pages.dev';

const API_BASE = `${BASE_URL}/api/v1`;

// Test data
const testTopics = ['world-news', 'weather', 'sports', 'markets', 'crypto'];

export default function () {
  // Health check
  group('Health Check', () => {
    const healthRes = http.get(`${API_BASE}/health`);
    
    check(healthRes, {
      'Health endpoint responds': (r) => r.status === 200,
      'Health response time OK': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(healthRes.status !== 200);
    responseTime.add(healthRes.timings.duration);
  });

  sleep(1);

  // Queue API load test
  group('Queue API', () => {
    const topic = testTopics[Math.floor(Math.random() * testTopics.length)];
    const queueRes = http.get(`${API_BASE}/queue?topic=${topic}&limit=10`);
    
    check(queueRes, {
      'Queue API responds': (r) => r.status === 200,
      'Queue has clips': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.clips) && body.clips.length > 0;
        } catch {
          return false;
        }
      },
      'Queue response time OK': (r) => r.timings.duration < 3000,
    });
    
    errorRate.add(queueRes.status !== 200);
    responseTime.add(queueRes.timings.duration);
    
    // Test clip access if queue has clips
    if (queueRes.status === 200) {
      try {
        const queueBody = JSON.parse(queueRes.body);
        if (queueBody.clips && queueBody.clips.length > 0) {
          const clipId = queueBody.clips[0].id;
          
          const clipRes = http.get(`${API_BASE}/clip/${clipId}`);
          check(clipRes, {
            'Clip API responds': (r) => r.status === 200 || r.status === 302,
            'Clip response time OK': (r) => r.timings.duration < 2000,
          });
          
          errorRate.add(![200, 302].includes(clipRes.status));
          responseTime.add(clipRes.timings.duration);
        }
      } catch (e) {
        console.log('Error parsing queue response:', e);
        errorRate.add(1);
      }
    }
  });

  sleep(2);

  // Feature flags API
  group('Feature Flags', () => {
    const flagsRes = http.get(`${API_BASE}/feature-flags`);
    
    check(flagsRes, {
      'Feature flags respond': (r) => r.status === 200,
      'Feature flags response time OK': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(flagsRes.status !== 200);
    responseTime.add(flagsRes.timings.duration);
  });

  sleep(1);

  // Auth endpoints (magic link request)
  group('Authentication', () => {
    const authPayload = JSON.stringify({
      email: `test-${Math.random()}@example.com`,
      redirectUrl: `${BASE_URL}/auth/callback`
    });
    
    const authRes = http.post(`${API_BASE}/auth/magic-link`, authPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(authRes, {
      'Auth API responds': (r) => [200, 400, 429].includes(r.status), // Allow rate limiting
      'Auth response time OK': (r) => r.timings.duration < 2000,
    });
    
    // Don't count rate limiting as error
    errorRate.add(![200, 400, 429].includes(authRes.status));
    responseTime.add(authRes.timings.duration);
  });

  sleep(2);

  // Frontend asset loading simulation
  group('Frontend Assets', () => {
    const frontendRes = http.get(BASE_URL);
    
    check(frontendRes, {
      'Frontend loads': (r) => r.status === 200,
      'Frontend response time OK': (r) => r.timings.duration < 5000,
      'Frontend contains app': (r) => r.body.includes('Chillcast') || r.body.includes('svelte'),
    });
    
    errorRate.add(frontendRes.status !== 200);
    responseTime.add(frontendRes.timings.duration);
  });

  sleep(1);
}

// Setup function
export function setup() {
  console.log(`🚀 Starting load test against: ${BASE_URL}`);
  console.log(`🎯 Test environment: ${__ENV.K6_TEST_ENV || 'staging'}`);
  
  // Verify API is accessible before starting load test
  const healthCheck = http.get(`${API_BASE}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`);
  }
  
  console.log('✅ API health check passed, starting load test...');
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log(`📊 Check detailed results in the k6 report`);
}

// Export test configuration for CI/CD
export const summary = {
  'http_req_duration': {
    description: 'HTTP request duration',
    unit: 'ms'
  },
  'http_req_failed': {
    description: 'Failed HTTP requests',
    unit: 'rate'
  },
  'errors': {
    description: 'Custom error rate',
    unit: 'rate'
  }
}; 