import { vi } from 'vitest';

/**
 * Mock WebGL context for canvas testing.
 * Allows Three.js to initialize without actual rendering.
 */
class MockWebGLRenderingContext {constructor() { MockWebGLRenderingContext.prototype.__init.call(this);MockWebGLRenderingContext.prototype.__init2.call(this);MockWebGLRenderingContext.prototype.__init3.call(this);MockWebGLRenderingContext.prototype.__init4.call(this);MockWebGLRenderingContext.prototype.__init5.call(this);MockWebGLRenderingContext.prototype.__init6.call(this);MockWebGLRenderingContext.prototype.__init7.call(this);MockWebGLRenderingContext.prototype.__init8.call(this);MockWebGLRenderingContext.prototype.__init9.call(this);MockWebGLRenderingContext.prototype.__init10.call(this);MockWebGLRenderingContext.prototype.__init11.call(this);MockWebGLRenderingContext.prototype.__init12.call(this);MockWebGLRenderingContext.prototype.__init13.call(this);MockWebGLRenderingContext.prototype.__init14.call(this);MockWebGLRenderingContext.prototype.__init15.call(this);MockWebGLRenderingContext.prototype.__init16.call(this);MockWebGLRenderingContext.prototype.__init17.call(this);MockWebGLRenderingContext.prototype.__init18.call(this);MockWebGLRenderingContext.prototype.__init19.call(this);MockWebGLRenderingContext.prototype.__init20.call(this);MockWebGLRenderingContext.prototype.__init21.call(this);MockWebGLRenderingContext.prototype.__init22.call(this);MockWebGLRenderingContext.prototype.__init23.call(this);MockWebGLRenderingContext.prototype.__init24.call(this);MockWebGLRenderingContext.prototype.__init25.call(this);MockWebGLRenderingContext.prototype.__init26.call(this);MockWebGLRenderingContext.prototype.__init27.call(this);MockWebGLRenderingContext.prototype.__init28.call(this);MockWebGLRenderingContext.prototype.__init29.call(this);MockWebGLRenderingContext.prototype.__init30.call(this);MockWebGLRenderingContext.prototype.__init31.call(this);MockWebGLRenderingContext.prototype.__init32.call(this);MockWebGLRenderingContext.prototype.__init33.call(this);MockWebGLRenderingContext.prototype.__init34.call(this);MockWebGLRenderingContext.prototype.__init35.call(this);MockWebGLRenderingContext.prototype.__init36.call(this);MockWebGLRenderingContext.prototype.__init37.call(this);MockWebGLRenderingContext.prototype.__init38.call(this);MockWebGLRenderingContext.prototype.__init39.call(this);MockWebGLRenderingContext.prototype.__init40.call(this); }
  // WebGL Constants
  __init() {this.VERTEX_SHADER = 0x8b31}
  __init2() {this.FRAGMENT_SHADER = 0x8b30}
  __init3() {this.COMPILE_STATUS = 0x8b81}
  __init4() {this.LINK_STATUS = 0x8b82}
  __init5() {this.ACTIVE_UNIFORMS = 0x8b86}
  __init6() {this.ACTIVE_ATTRIBUTES = 0x8b89}

  // Core methods
  __init7() {this.viewport = vi.fn()}
  __init8() {this.clear = vi.fn()}
  __init9() {this.clearColor = vi.fn()}
  __init10() {this.useProgram = vi.fn()}
  
  // Program and shader methods
  __init11() {this.createProgram = vi.fn(() => ({}))}
  __init12() {this.createShader = vi.fn(() => ({}))}
  __init13() {this.attachShader = vi.fn()}
  __init14() {this.compileShader = vi.fn()}
  __init15() {this.linkProgram = vi.fn()}
  __init16() {this.getProgramParameter = vi.fn((prog, param) => {
    if (param === this.LINK_STATUS) return true;
    return true;
  })}
  __init17() {this.getShaderParameter = vi.fn((shader, param) => {
    if (param === this.COMPILE_STATUS) return true;
    return 0;
  })}
  
  // Uniform and attribute methods
  __init18() {this.getUniformLocation = vi.fn(() => ({}))}
  __init19() {this.getAttribLocation = vi.fn(() => 0)}
  __init20() {this.enableVertexAttribArray = vi.fn()}
  __init21() {this.vertexAttribPointer = vi.fn()}
  __init22() {this.uniform1f = vi.fn()}
  __init23() {this.uniform2f = vi.fn()}
  __init24() {this.uniform3f = vi.fn()}
  __init25() {this.uniform4f = vi.fn()}
  __init26() {this.uniformMatrix4fv = vi.fn()}
  
  // Buffer methods
  __init27() {this.createBuffer = vi.fn(() => ({}))}
  __init28() {this.bindBuffer = vi.fn()}
  __init29() {this.bufferData = vi.fn()}
  
  // Texture methods
  __init30() {this.createTexture = vi.fn(() => ({}))}
  __init31() {this.bindTexture = vi.fn()}
  __init32() {this.texImage2D = vi.fn()}
  
  // Drawing methods
  __init33() {this.drawArrays = vi.fn()}
  __init34() {this.drawElements = vi.fn()}
  
  // State methods
  __init35() {this.enable = vi.fn()}
  __init36() {this.disable = vi.fn()}
  __init37() {this.blendFunc = vi.fn()}
  __init38() {this.depthFunc = vi.fn()}
  __init39() {this.cullFace = vi.fn()}
  
  // Extension methods
  __init40() {this.getExtension = vi.fn((name) => {
    if (name === 'WEBGL_lose_context') {
      return { loseContext: vi.fn(), restoreContext: vi.fn() };
    }
    return null;
  })}
}

/**
 * Mock WebGL 2 context extending WebGL 1.0 with WebGL 2.0 methods.
 */
class MockWebGL2RenderingContext extends MockWebGLRenderingContext {constructor(...args2) { super(...args2); MockWebGL2RenderingContext.prototype.__init41.call(this);MockWebGL2RenderingContext.prototype.__init42.call(this);MockWebGL2RenderingContext.prototype.__init43.call(this);MockWebGL2RenderingContext.prototype.__init44.call(this); }
  // WebGL 2.0 specific methods
  __init41() {this.createVertexArray = vi.fn(() => ({}))}
  __init42() {this.bindVertexArray = vi.fn()}
  __init43() {this.vertexAttribDivisor = vi.fn()}
  __init44() {this.drawArraysInstanced = vi.fn()}
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
    contextType,
    ...args
  ) {
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
