import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Response
global.Response = class {
  constructor(body?: string, init?: ResponseInit) {
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this._body = body || '';
  }
  
  json() {
    return Promise.resolve(JSON.parse(this._body));
  }
  
  text() {
    return Promise.resolve(this._body);
  }
} as any;

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor() {}
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
} as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock performance.memory for performance tests
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 100000000
  },
  writable: true
});

// Mock environment variables
process.env.REACT_APP_API_URL = 'https://gema-project.onrender.com/api';
process.env.REACT_APP_WS_URL = 'wss://gema-project.onrender.com';