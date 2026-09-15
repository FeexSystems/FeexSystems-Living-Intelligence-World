/**
 * Test fixture types for world model entities.
 * These are simplified types for testing purposes.
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  gitHubUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Repository {
  id: string;
  projectId: string;
  name: string;
  gitHubUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Technology {
  id: string;
  name: string;
  category?: string;
}

/**
 * Create a test project fixture with default values.
 * Supports optional overrides to customize any field.
 */
export function createProjectFixture(
  overrides?: Partial<Project>
): Project {
  return {
    id: 'proj-001',
    name: 'FeexSystems Core',
    description: 'Core platform',
    gitHubUrl: 'https://github.com/feexsystems/core',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create a test repository fixture with default values.
 * Supports optional overrides to customize any field.
 * 
 * @param projectId - The project ID this repository belongs to
 * @param overrides - Optional field overrides
 */
export function createRepositoryFixture(
  projectId: string,
  overrides?: Partial<Repository>
): Repository {
  return {
    id: 'repo-001',
    projectId,
    name: 'core',
    gitHubUrl: 'https://github.com/feexsystems/core',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}
