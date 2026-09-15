#!/usr/bin/env tsx

import { registerUserSchema, loginUserSchema, updateUserProfileSchema } from '../user';

console.log('🧪 Testing User Validation Schemas...\n');

// Test registerUserSchema
console.log('Testing registerUserSchema:');
const validRegistration = {
  email: 'test@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
};

const registrationResult = registerUserSchema.safeParse(validRegistration);
console.log('✅ Valid registration data:', registrationResult.success);

const invalidRegistration = {
  email: 'invalid-email',
  password: 'weak',
  firstName: 'John123',
  lastName: 'Doe',
};

const invalidRegistrationResult = registerUserSchema.safeParse(invalidRegistration);
console.log('❌ Invalid registration data:', invalidRegistrationResult.success);
if (!invalidRegistrationResult.success) {
  console.log('   Errors:', invalidRegistrationResult.error.issues.map(i => i.message));
}

// Test loginUserSchema
console.log('\nTesting loginUserSchema:');
const validLogin = {
  email: 'test@example.com',
  password: 'anypassword',
};

const loginResult = loginUserSchema.safeParse(validLogin);
console.log('✅ Valid login data:', loginResult.success);

// Test updateUserProfileSchema
console.log('\nTesting updateUserProfileSchema:');
const validUpdate = {
  firstName: 'Jane',
  email: 'jane@example.com',
};

const updateResult = updateUserProfileSchema.safeParse(validUpdate);
console.log('✅ Valid update data:', updateResult.success);

const emptyUpdate = {};
const emptyUpdateResult = updateUserProfileSchema.safeParse(emptyUpdate);
console.log('✅ Empty update data (should be valid):', emptyUpdateResult.success);

console.log('\n🎉 All validation schema tests completed!');