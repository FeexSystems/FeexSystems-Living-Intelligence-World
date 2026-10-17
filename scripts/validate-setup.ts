#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

interface ValidationResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: ValidationResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string) {
  results.push({ name, status, message });
}

function checkFileExists(filePath: string, description: string) {
  const fullPath = path.join(process.cwd(), filePath);
  if (existsSync(fullPath)) {
    addResult(description, 'pass', `✅ ${filePath} exists`);
    return true;
  } else {
    addResult(description, 'fail', `❌ ${filePath} not found`);
    return false;
  }
}

function checkEnvironmentFile() {
  const envPath = '.env';
  if (checkFileExists(envPath, 'Environment file')) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const requiredVars = ['DATABASE_URL', 'REDIS_URL'];
      const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
      
      if (missingVars.length === 0) {
        addResult('Environment variables', 'pass', '✅ All required environment variables present');
      } else {
        addResult('Environment variables', 'warning', `⚠️ Missing variables: ${missingVars.join(', ')}`);
      }
    } catch (error) {
      addResult('Environment variables', 'fail', `❌ Error reading .env file: ${error}`);
    }
  }
}

function checkNodeModules() {
  if (existsSync('node_modules')) {
    addResult('Dependencies', 'pass', '✅ node_modules directory exists');
    
    // Check for key dependencies
    const keyDeps = ['@prisma/client', 'ioredis', 'express'];
    const missingDeps = keyDeps.filter(dep => !existsSync(`node_modules/${dep}`));
    
    if (missingDeps.length === 0) {
      addResult('Key dependencies', 'pass', '✅ All key dependencies installed');
    } else {
      addResult('Key dependencies', 'fail', `❌ Missing dependencies: ${missingDeps.join(', ')}`);
    }
  } else {
    addResult('Dependencies', 'fail', '❌ node_modules not found. Run: npm install');
  }
}

function checkPrismaSetup() {
  if (checkFileExists('prisma/schema.prisma', 'Prisma schema')) {
    try {
      // Check if Prisma client is generated
      if (existsSync('node_modules/.prisma/client')) {
        addResult('Prisma client', 'pass', '✅ Prisma client generated');
      } else {
        addResult('Prisma client', 'warning', '⚠️ Prisma client not generated. Run: npx prisma generate');
      }
    } catch (error) {
      addResult('Prisma client', 'fail', `❌ Error checking Prisma client: ${error}`);
    }
  }
}

function checkDockerSetup() {
  checkFileExists('docker-compose.yml', 'Docker Compose file');
  checkFileExists('docker/Dockerfile.dev', 'Development Dockerfile');
  checkFileExists('docker/Dockerfile.prod', 'Production Dockerfile');
  
  try {
    execSync('docker --version', { stdio: 'pipe' });
    addResult('Docker', 'pass', '✅ Docker is installed');
    
    try {
      execSync('docker-compose --version', { stdio: 'pipe' });
      addResult('Docker Compose', 'pass', '✅ Docker Compose is installed');
    } catch {
      addResult('Docker Compose', 'warning', '⚠️ Docker Compose not found');
    }
  } catch {
    addResult('Docker', 'warning', '⚠️ Docker not found or not running');
  }
}

function checkPackageJsonScripts() {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const requiredScripts = ['db:init', 'db:migrate', 'docker:dev', 'docker:prod'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length === 0) {
      addResult('Package.json scripts', 'pass', '✅ All required scripts present');
    } else {
      addResult('Package.json scripts', 'fail', `❌ Missing scripts: ${missingScripts.join(', ')}`);
    }
  } catch (error) {
    addResult('Package.json scripts', 'fail', `❌ Error reading package.json: ${error}`);
  }
}

async function testDatabaseConnection() {
  if (!existsSync('.env')) {
    addResult('Database connection', 'warning', '⚠️ Cannot test database connection without .env file');
    return;
  }

  try {
    // This would require the actual database to be running
    addResult('Database connection', 'warning', '⚠️ Database connection test requires running database');
  } catch (error) {
    addResult('Database connection', 'fail', `❌ Database connection failed: ${error}`);
  }
}

function printResults() {
  console.log('\n🔍 FeexSystems Infrastructure Validation Report\n');
  console.log('='.repeat(60));
  
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}: ${result.message}`);
    
    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warningCount++;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary: ${passCount} passed, ${warningCount} warnings, ${failCount} failed`);
  
  if (failCount > 0) {
    console.log('\n❌ Setup validation failed. Please address the issues above.');
    console.log('\n💡 Quick fixes:');
    console.log('   - Run: npm install');
    console.log('   - Copy: cp .env.example .env');
    console.log('   - Generate Prisma client: npx prisma generate');
    return false;
  } else if (warningCount > 0) {
    console.log('\n⚠️ Setup validation passed with warnings. Consider addressing them.');
    return true;
  } else {
    console.log('\n🎉 All checks passed! Your infrastructure setup is ready.');
    return true;
  }
}

function printNextSteps() {
  console.log('\n📋 Next Steps:');
  console.log('   1. Start services: npm run docker:dev');
  console.log('   2. Initialize database: npm run db:init');
  console.log('   3. Check health: curl http://localhost:3001/health');
  console.log('   4. View API docs: http://localhost:3001/api/ping');
  console.log('\n📖 For detailed instructions, see: INFRASTRUCTURE_SETUP.md');
}

async function main() {
  console.log('🚀 Validating FeexSystems infrastructure setup...\n');
  
  // Run all validation checks
  checkFileExists('package.json', 'Package.json');
  checkEnvironmentFile();
  checkNodeModules();
  checkPrismaSetup();
  checkDockerSetup();
  checkPackageJsonScripts();
  await testDatabaseConnection();
  
  // Print results
  const success = printResults();
  
  if (success) {
    printNextSteps();
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});