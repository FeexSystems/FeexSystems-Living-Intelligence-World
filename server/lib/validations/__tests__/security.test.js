import {
  validateScanTarget,
  validateScanConfiguration,
  sanitizeScanConfiguration,
  validateRequestSize,
  scanTargetSchema,
  scanConfigurationSchema,
  securityScanRequestSchema
} from '../security';

describe('Security Validations', () => {
  describe('scanTargetSchema', () => {
    it('should validate valid URL target', () => {
      const target = {
        type: 'url',
        value: 'https://example.com'
      };

      const result = scanTargetSchema.safeParse(target);
      expect(result.success).toBe(true);
    });

    it('should validate valid IP target with port', () => {
      const target = {
        type: 'ip',
        value: '192.168.1.1',
        port: 80
      };

      const result = scanTargetSchema.safeParse(target);
      expect(result.success).toBe(true);
    });

    it('should validate target with credentials', () => {
      const target = {
        type: 'url',
        value: 'https://example.com',
        credentials: {
          username: 'admin',
          password: 'secret'
        }
      };

      const result = scanTargetSchema.safeParse(target);
      expect(result.success).toBe(true);
    });

    it('should reject invalid target type', () => {
      const target = {
        type: 'invalid',
        value: 'https://example.com'
      };

      const result = scanTargetSchema.safeParse(target);
      expect(result.success).toBe(false);
    });

    it('should reject empty target value', () => {
      const target = {
        type: 'url',
        value: ''
      };

      const result = scanTargetSchema.safeParse(target);
      expect(result.success).toBe(false);
    });

    it('should reject invalid port range', () => {
      const target = {
        type: 'ip',
        value: '192.168.1.1',
        port: 70000
      };

      const result = scanTargetSchema.safeParse(target);
      expect(result.success).toBe(false);
    });
  });

  describe('scanConfigurationSchema', () => {
    it('should validate valid configuration', () => {
      const config = {
        depth: 'medium',
        timeout: 300,
        maxConcurrency: 3,
        excludePatterns: ['*.log'],
        reportFormat: 'json'
      };

      const result = scanConfigurationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid depth', () => {
      const config = {
        depth: 'invalid'
      };

      const result = scanConfigurationSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject timeout outside range', () => {
      const config = {
        timeout: 10 // Too low
      };

      const result = scanConfigurationSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject high concurrency', () => {
      const config = {
        maxConcurrency: 20 // Too high
      };

      const result = scanConfigurationSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('validateScanTarget', () => {
    it('should validate valid URL target', () => {
      const target = {
        type: 'url',
        value: 'https://example.com'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid URL format', () => {
      const target = {
        type: 'url',
        value: 'not-a-url'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });

    it('should validate valid IP address', () => {
      const target = {
        type: 'ip',
        value: '192.168.1.1'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid IP address', () => {
      const target = {
        type: 'ip',
        value: '999.999.999.999'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should validate valid domain', () => {
      const target = {
        type: 'domain',
        value: 'example.com'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid domain', () => {
      const target = {
        type: 'domain',
        value: 'invalid..domain'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid domain format');
    });

    it('should validate valid repository URL', () => {
      const target = {
        type: 'repository',
        value: 'https://github.com/user/repo'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid repository URL', () => {
      const target = {
        type: 'repository',
        value: 'https://example.com/repo'
      };

      const result = validateScanTarget(target);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid repository URL');
    });
  });

  describe('validateScanConfiguration', () => {
    it('should validate valid configuration', () => {
      const config = {
        depth: 'medium',
        timeout: 300,
        maxConcurrency: 3
      };

      const result = validateScanConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid configuration', () => {
      const config = {
        depth: 'invalid',
        timeout: 10
      };

      const result = validateScanConfiguration(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeScanConfiguration', () => {
    it('should remove dangerous configurations', () => {
      const config = {
        depth: 'medium',
        timeout: 300,
        executable: '/bin/rm',
        command: 'rm -rf /',
        script: 'malicious.sh'
      };

      const sanitized = sanitizeScanConfiguration(config);
      
      expect(sanitized.depth).toBe('medium');
      expect(sanitized.timeout).toBe(300);
      expect(sanitized.executable).toBeUndefined();
      expect(sanitized.command).toBeUndefined();
      expect(sanitized.script).toBeUndefined();
    });

    it('should enforce timeout limits', () => {
      const config = {
        timeout: 5000 // Too high
      };

      const sanitized = sanitizeScanConfiguration(config);
      expect(sanitized.timeout).toBe(3600); // Max allowed
    });

    it('should enforce concurrency limits', () => {
      const config = {
        maxConcurrency: 50 // Too high
      };

      const sanitized = sanitizeScanConfiguration(config);
      expect(sanitized.maxConcurrency).toBe(10); // Max allowed
    });

    it('should sanitize patterns to prevent injection', () => {
      const config = {
        excludePatterns: ['*.log', '$(rm -rf /)', '*.txt; cat /etc/passwd'],
        includePatterns: ['*.js', '`whoami`']
      };

      const sanitized = sanitizeScanConfiguration(config);
      
      expect(sanitized.excludePatterns).toEqual(['*.log', 'rm -rf /', '*.txt cat /etc/passwd']);
      expect(sanitized.includePatterns).toEqual(['*.js', 'whoami']);
    });
  });

  describe('validateRequestSize', () => {
    it('should accept small requests', () => {
      const data = { small: 'data' };
      const result = validateRequestSize(data);
      expect(result).toBe(true);
    });

    it('should reject large requests', () => {
      const largeData = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      const result = validateRequestSize(largeData, 1024 * 1024); // 1MB limit
      expect(result).toBe(false);
    });

    it('should use default size limit', () => {
      const data = { test: 'data' };
      const result = validateRequestSize(data);
      expect(result).toBe(true);
    });
  });

  describe('securityScanRequestSchema', () => {
    it('should validate complete scan request', () => {
      const request = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY',
        configuration: {
          depth: 'medium',
          timeout: 300
        },
        priority: 'high'
      };

      const result = securityScanRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should use default priority', () => {
      const request = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'VULNERABILITY'
      };

      const result = securityScanRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('normal');
      }
    });

    it('should reject invalid scan type', () => {
      const request = {
        target: {
          type: 'url',
          value: 'https://example.com'
        },
        scanType: 'INVALID'
      };

      const result = securityScanRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});