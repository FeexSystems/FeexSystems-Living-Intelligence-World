 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { SecurityScannerRegistry } from '../security-scanner-registry.service';


describe('SecurityScannerRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new SecurityScannerRegistry();
  });

  describe('initialization', () => {
    it('should initialize with default scanners', () => {
      const scanners = registry.getScanners();
      expect(scanners.length).toBeGreaterThan(0);
      
      // Check for expected default scanners
      const scannerIds = scanners.map(s => s.id);
      expect(scannerIds).toContain('owasp-zap');
      expect(scannerIds).toContain('nmap');
      expect(scannerIds).toContain('nikto');
      expect(scannerIds).toContain('compliance-checker');
    });

    it('should have all default scanners active', () => {
      const activeScanners = registry.getActiveScanners();
      const allScanners = registry.getScanners();
      expect(activeScanners.length).toBe(allScanners.length);
    });
  });

  describe('scanner management', () => {
    it('should register a new scanner', () => {
      const newScanner = {
        id: 'test-scanner',
        name: 'Test Scanner',
        description: 'A test scanner',
        scanTypes: ['vulnerability'],
        targetTypes: ['url'],
        isActive: true,
        configuration: {
          timeout: 300,
          maxConcurrency: 1,
          defaultParameters: {}
        },
        limits: {
          maxScansPerHour: 10,
          maxScansPerDay: 50,
          maxTargetsPerScan: 1,
          maxScanDuration: 1800
        }
      };

      registry.registerScanner(newScanner);
      const retrieved = registry.getScanner('test-scanner');
      expect(retrieved).toEqual(newScanner);
    });

    it('should get scanner by ID', () => {
      const scanner = registry.getScanner('owasp-zap');
      expect(scanner).toBeDefined();
      expect(_optionalChain([scanner, 'optionalAccess', _ => _.id])).toBe('owasp-zap');
      expect(_optionalChain([scanner, 'optionalAccess', _2 => _2.name])).toBe('OWASP ZAP');
    });

    it('should return undefined for non-existent scanner', () => {
      const scanner = registry.getScanner('non-existent');
      expect(scanner).toBeUndefined();
    });

    it('should update scanner configuration', () => {
      const updated = registry.updateScanner('owasp-zap', {
        isActive: false
      });
      expect(updated).toBe(true);

      const scanner = registry.getScanner('owasp-zap');
      expect(_optionalChain([scanner, 'optionalAccess', _3 => _3.isActive])).toBe(false);
    });

    it('should toggle scanner status', () => {
      const toggled = registry.toggleScanner('owasp-zap', false);
      expect(toggled).toBe(true);

      const scanner = registry.getScanner('owasp-zap');
      expect(_optionalChain([scanner, 'optionalAccess', _4 => _4.isActive])).toBe(false);

      // Toggle back
      registry.toggleScanner('owasp-zap', true);
      const scannerAgain = registry.getScanner('owasp-zap');
      expect(_optionalChain([scannerAgain, 'optionalAccess', _5 => _5.isActive])).toBe(true);
    });

    it('should remove scanner', () => {
      const removed = registry.removeScanner('owasp-zap');
      expect(removed).toBe(true);

      const scanner = registry.getScanner('owasp-zap');
      expect(scanner).toBeUndefined();
    });
  });

  describe('scanner filtering', () => {
    it('should get scanners by scan type', () => {
      const vulnScanners = registry.getScannersByScanType('vulnerability');
      expect(vulnScanners.length).toBeGreaterThan(0);
      
      vulnScanners.forEach(scanner => {
        expect(scanner.scanTypes).toContain('vulnerability');
        expect(scanner.isActive).toBe(true);
      });
    });

    it('should get scanners by target type', () => {
      const urlScanners = registry.getScannersByTargetType('url');
      expect(urlScanners.length).toBeGreaterThan(0);
      
      urlScanners.forEach(scanner => {
        expect(scanner.targetTypes).toContain('url');
        expect(scanner.isActive).toBe(true);
      });
    });

    it('should get compatible scanners', () => {
      const compatibleScanners = registry.getCompatibleScanners('vulnerability', 'url');
      expect(compatibleScanners.length).toBeGreaterThan(0);
      
      compatibleScanners.forEach(scanner => {
        expect(scanner.scanTypes).toContain('vulnerability');
        expect(scanner.targetTypes).toContain('url');
        expect(scanner.isActive).toBe(true);
      });
    });

    it('should return empty array for incompatible combinations', () => {
      const incompatibleScanners = registry.getCompatibleScanners('compliance', 'ip');
      // Based on default scanners, compliance checker doesn't support IP targets
      expect(incompatibleScanners.length).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should provide scanner statistics', () => {
      const stats = registry.getScannerStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThan(0);
      expect(stats.inactive).toBe(0); // All default scanners are active
      expect(stats.byType).toBeDefined();
      expect(stats.byType.vulnerability).toBeGreaterThan(0);
    });

    it('should update statistics when scanner is disabled', () => {
      registry.toggleScanner('owasp-zap', false);
      const stats = registry.getScannerStats();
      
      expect(stats.inactive).toBe(1);
      expect(stats.active).toBe(stats.total - 1);
    });
  });
});