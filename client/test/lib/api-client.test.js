import { vi, } from 'vitest';



// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock token