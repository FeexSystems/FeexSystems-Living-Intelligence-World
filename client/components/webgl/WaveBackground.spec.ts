import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

/**
 * Task 2.4.1 & 2.4.2: WebGL Component Tests
 * 
 * These tests verify that Three.js components can initialize
 * their WebGL contexts through the canvas polyfill.
 */

describe('WaveBackground WebGL Component', () => {
  describe('2.4.1 - Canvas Context Availability', () => {
    it('should have canvas context available', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      
      // Act
      const context = canvas.getContext('webgl');

      // Assert
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(context).toBeDefined();
      expect(context).not.toBeNull();
    });

    it('should return WebGL context from mock polyfill', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      
      // Act
      const context = canvas.getContext('webgl');

      // Assert
      expect(context).toBeTruthy();
      // Mock context should have required methods
      expect(typeof context?.viewport).toBe('function');
      expect(typeof context?.clear).toBe('function');
      expect(typeof context?.clearColor).toBe('function');
    });

    it('should support WebGL2 context', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      
      // Act
      const context = canvas.getContext('webgl2');

      // Assert
      expect(context).toBeDefined();
      expect(context).not.toBeNull();
    });

    it('should support 2D context fallback', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      
      // Act
      const context = canvas.getContext('2d');

      // Assert
      // 2D context should work normally through the original implementation
      expect(context).toBeDefined();
    });

    it('should allow canvas element insertion into DOM', () => {
      // Arrange
      const container = document.createElement('div');
      const canvas = document.createElement('canvas');
      document.body.appendChild(container);

      // Act
      container.appendChild(canvas);

      // Assert
      expect(container.querySelector('canvas')).toBe(canvas);
      
      // Cleanup
      document.body.removeChild(container);
    });
  });

  describe('2.4.2 - Shader Material Creation', () => {
    it('should create shader material', () => {
      // Arrange
      const vertexShader = `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const fragmentShader = `
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;

      // Act
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
      });

      // Assert
      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(material.vertexShader).toBe(vertexShader);
      expect(material.fragmentShader).toBe(fragmentShader);
    });

    it('should include uniforms in shader material', () => {
      // Arrange
      const uniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xff0000) },
        uPosition: { value: new THREE.Vector3(0, 0, 0) },
      };

      const vertexShader = `
        uniform float uTime;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const fragmentShader = `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
        }
      `;

      // Act
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
      });

      // Assert
      expect(material.uniforms).toBeDefined();
      expect(material.uniforms.uTime).toBeDefined();
      expect(material.uniforms.uTime.value).toBe(0);
      expect(material.uniforms.uColor).toBeDefined();
      expect(material.uniforms.uColor.value).toBeInstanceOf(THREE.Color);
      expect(material.uniforms.uPosition).toBeDefined();
      expect(material.uniforms.uPosition.value).toBeInstanceOf(THREE.Vector3);
    });

    it('should support material properties', () => {
      // Arrange
      const material = new THREE.ShaderMaterial({
        vertexShader: 'void main() {}',
        fragmentShader: 'void main() {}',
        transparent: true,
        side: THREE.DoubleSide,
      });

      // Act & Assert
      expect(material.transparent).toBe(true);
      expect(material.side).toBe(THREE.DoubleSide);
    });

    it('should work with geometry and mesh', () => {
      // Arrange
      const geometry = new THREE.PlaneGeometry(10, 10);
      const material = new THREE.ShaderMaterial({
        vertexShader: `
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          void main() {
            gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
          }
        `,
      });

      // Act
      const mesh = new THREE.Mesh(geometry, material);

      // Assert
      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBe(geometry);
      expect(mesh.material).toBe(material);
    });

    it('should handle material uniform updates', () => {
      // Arrange
      const uniforms = {
        uTime: { value: 0 },
      };

      const material = new THREE.ShaderMaterial({
        vertexShader: 'uniform float uTime; void main() {}',
        fragmentShader: 'void main() {}',
        uniforms,
      });

      // Act
      material.uniforms.uTime.value = 1.5;

      // Assert
      expect(material.uniforms.uTime.value).toBe(1.5);
    });

    it('should support complex shader with multiple uniforms', () => {
      // Arrange
      const vertexShader = `
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uFrequency;
        
        void main() {
          vec3 newPosition = position;
          newPosition.z += sin(newPosition.x * uFrequency + uTime) * uAmplitude;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `;

      const fragmentShader = `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        
        void main() {
          vec3 color = mix(uColorA, uColorB, 0.5);
          gl_FragColor = vec4(color, 1.0);
        }
      `;

      const uniforms = {
        uTime: { value: 0 },
        uAmplitude: { value: 1.0 },
        uFrequency: { value: 2.0 },
        uColorA: { value: new THREE.Color(0x0000ff) },
        uColorB: { value: new THREE.Color(0xff0000) },
      };

      // Act
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
      });

      // Assert
      expect(material.uniforms.uTime.value).toBe(0);
      expect(material.uniforms.uAmplitude.value).toBe(1.0);
      expect(material.uniforms.uFrequency.value).toBe(2.0);
      expect(material.uniforms.uColorA.value).toBeInstanceOf(THREE.Color);
      expect(material.uniforms.uColorB.value).toBeInstanceOf(THREE.Color);
    });

    it('should support material extensions', () => {
      // Arrange
      const material = new THREE.ShaderMaterial({
        vertexShader: 'void main() {}',
        fragmentShader: 'void main() {}',
        extensions: {
          derivatives: true,
        },
      });

      // Act & Assert
      expect(material.extensions).toBeDefined();
      expect(material.extensions.derivatives).toBe(true);
    });

    it('should handle material cloning', () => {
      // Arrange
      const uniforms = {
        uTime: { value: 5.0 },
        uColor: { value: new THREE.Color(0xffff00) },
      };

      const originalMaterial = new THREE.ShaderMaterial({
        vertexShader: 'void main() {}',
        fragmentShader: 'void main() {}',
        uniforms,
        transparent: true,
      });

      // Act
      const clonedMaterial = originalMaterial.clone();

      // Assert
      expect(clonedMaterial).toBeInstanceOf(THREE.ShaderMaterial);
      expect(clonedMaterial.transparent).toBe(true);
      expect(clonedMaterial.uniforms).toBeDefined();
    });
  });

  describe('WebGL Context API Compliance', () => {
    it('should have standard WebGL constants', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');

      // Act & Assert
      expect((context as any)?.VERTEX_SHADER).toBeDefined();
      expect((context as any)?.FRAGMENT_SHADER).toBeDefined();
      expect((context as any)?.COMPILE_STATUS).toBeDefined();
      expect((context as any)?.LINK_STATUS).toBeDefined();
    });

    it('should support shader compilation methods', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');

      // Act & Assert
      expect(typeof context?.createShader).toBe('function');
      expect(typeof context?.compileShader).toBe('function');
      expect(typeof context?.getShaderParameter).toBe('function');
    });

    it('should support program linking methods', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');

      // Act & Assert
      expect(typeof context?.createProgram).toBe('function');
      expect(typeof context?.attachShader).toBe('function');
      expect(typeof context?.linkProgram).toBe('function');
      expect(typeof context?.getProgramParameter).toBe('function');
    });

    it('should support uniform methods', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');

      // Act & Assert
      expect(typeof context?.getUniformLocation).toBe('function');
      expect(typeof context?.uniform1f).toBe('function');
      expect(typeof context?.uniform2f).toBe('function');
      expect(typeof context?.uniform3f).toBe('function');
      expect(typeof context?.uniform4f).toBe('function');
      expect(typeof context?.uniformMatrix4fv).toBe('function');
    });

    it('should support attribute methods', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');

      // Act & Assert
      expect(typeof context?.getAttribLocation).toBe('function');
      expect(typeof context?.enableVertexAttribArray).toBe('function');
      expect(typeof context?.vertexAttribPointer).toBe('function');
    });

    it('should support buffer methods', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');

      // Act & Assert
      expect(typeof context?.createBuffer).toBe('function');
      expect(typeof context?.bindBuffer).toBe('function');
      expect(typeof context?.bufferData).toBe('function');
    });

    it('should support drawing methods', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl');

      // Act & Assert
      expect(typeof context?.drawArrays).toBe('function');
      expect(typeof context?.drawElements).toBe('function');
    });
  });
});
