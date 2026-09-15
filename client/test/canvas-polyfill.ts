import { vi } from 'vitest';

/**
 * Mock WebGL context for canvas testing.
 * Allows Three.js to initialize without actual rendering.
 */
class MockWebGLRenderingContext {
  // WebGL Constants
  VERTEX_SHADER = 0x8b31;
  FRAGMENT_SHADER = 0x8b30;
  COMPILE_STATUS = 0x8b81;
  LINK_STATUS = 0x8b82;
  ACTIVE_UNIFORMS = 0x8b86;
  ACTIVE_ATTRIBUTES = 0x8b89;

  // Core methods
  viewport = vi.fn();
  clear = vi.fn();
  clearColor = vi.fn();
  useProgram = vi.fn();
  
  // Program and shader methods
  createProgram = vi.fn(() => ({}));
  createShader = vi.fn(() => ({}));
  attachShader = vi.fn();
  compileShader = vi.fn();
  linkProgram = vi.fn();
  getProgramParameter = vi.fn((prog, param) => {
    if (param === this.LINK_STATUS) return true;
    return true;
  });
  getShaderParameter = vi.fn((shader, param) => {
    if (param === this.COMPILE_STATUS) return true;
    return 0;
  });
  
  // Uniform and attribute methods
  getUniformLocation = vi.fn(() => ({}));
  getAttribLocation = vi.fn(() => 0);
  enableVertexAttribArray = vi.fn();
  vertexAttribPointer = vi.fn();
  uniform1f = vi.fn();
  uniform2f = vi.fn();
  uniform3f = vi.fn();
  uniform4f = vi.fn();
  uniformMatrix4fv = vi.fn();
  
  // Buffer methods
  createBuffer = vi.fn(() => ({}));
  bindBuffer = vi.fn();
  bufferData = vi.fn();
  
  // Texture methods
  createTexture = vi.fn(() => ({}));
  bindTexture = vi.fn();
  texImage2D = vi.fn();
  
  // Drawing methods
  drawArrays = vi.fn();
  drawElements = vi.fn();
  
  // State methods
  enable = vi.fn();
  disable = vi.fn();
  blendFunc = vi.fn();
  depthFunc = vi.fn();
  cullFace = vi.fn();
  
  // Extension methods
  getExtension = vi.fn((name: string) => {
    if (name === 'WEBGL_lose_context') {
      return { loseContext: vi.fn(), restoreContext: vi.fn() };
    }
    return null;
  });
}

/**
 * Mock WebGL 2 context extending WebGL 1.0 with WebGL 2.0 methods.
 */
class MockWebGL2RenderingContext extends MockWebGLRenderingContext {
  // WebGL 2.0 specific methods
  createVertexArray = vi.fn(() => ({}));
  bindVertexArray = vi.fn();
  vertexAttribDivisor = vi.fn();
  drawArraysInstanced = vi.fn();
}

/**
 * Install canvas polyfill globally for tests.
 * Call this in vitest setup file before Three.js imports.
 */
export function setupCanvasPolyfill() {
  if (typeof HTMLCanvasElement === 'undefined') return;

  // Store the original getContext method
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (
    contextType: string,
    ...args: unknown[]
  ): any {
    if (contextType === 'webgl') {
      return new MockWebGLRenderingContext();
    }
    if (contextType === 'webgl2') {
      return new MockWebGL2RenderingContext();
    }
    // Fall back to original for 2d and other contexts
    // Call with proper context binding and all arguments
    if (originalGetContext) {
      return originalGetContext.apply(this, [contextType, ...args]);
    }
    return null;
  };
}

export { MockWebGLRenderingContext, MockWebGL2RenderingContext };
