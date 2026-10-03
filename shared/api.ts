/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Team Collaboration Types
export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

export enum ResourceType {
  AI_REQUEST = 'AI_REQUEST',
  REPOSITORY = 'REPOSITORY',
  PIPELINE = 'PIPELINE',
  DEPLOYMENT = 'DEPLOYMENT',
  SECURITY_SCAN = 'SECURITY_SCAN',
  WORKSPACE = 'WORKSPACE'
}

// Team interfaces
export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  settings?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  members?: TeamMember[];
  workspaces?: Workspace[];
  memberCount?: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  permissions?: Record<string, any>;
  status: MemberStatus;
  joinedAt: Date;
  invitedBy?: string;
  lastActiveAt?: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  permissions?: Record<string, any>;
  status: InvitationStatus;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  team?: {
    id: string;
    name: string;
  };
}

export interface Workspace {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  settings?: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  resourceCount?: number;
}

export interface ResourceShare {
  id: string;
  teamId: string;
  workspaceId?: string;
  resourceType: ResourceType;
  resourceId: string;
  permissions: Record<string, any>;
  sharedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamActivityLog {
  id: string;
  teamId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Request/Response types for API endpoints
export interface CreateTeamRequest {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface CreateTeamResponse {
  team: Team;
  success: boolean;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface UpdateTeamResponse {
  team: Team;
  success: boolean;
}

export interface InviteTeamMemberRequest {
  email: string;
  role: TeamRole;
  permissions?: Record<string, any>;
}

export interface InviteTeamMemberResponse {
  invitation: TeamInvitation;
  success: boolean;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface AcceptInvitationResponse {
  teamMember: TeamMember;
  team: Team;
  success: boolean;
}

export interface UpdateMemberRoleRequest {
  role: TeamRole;
  permissions?: Record<string, any>;
}

export interface UpdateMemberRoleResponse {
  member: TeamMember;
  success: boolean;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface CreateWorkspaceResponse {
  workspace: Workspace;
  success: boolean;
}

export interface ShareResourceRequest {
  workspaceId?: string;
  resourceType: ResourceType;
  resourceId: string;
  permissions: Record<string, any>;
}

export interface ShareResourceResponse {
  resourceShare: ResourceShare;
  success: boolean;
}

export interface TeamActivityResponse {
  activities: TeamActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

// Permission definitions
export interface TeamPermissions {
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canManageWorkspaces: boolean;
  canShareResources: boolean;
  canViewActivity: boolean;
  canManageSettings: boolean;
}

export interface ResourcePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canExecute?: boolean; // For pipelines, scans, etc.
}

// Utility functions for permissions
export const getTeamPermissions = (role: TeamRole): TeamPermissions => {
  switch (role) {
    case TeamRole.OWNER:
      return {
        canManageTeam: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canManageWorkspaces: true,
        canShareResources: true,
        canViewActivity: true,
        canManageSettings: true
      };
    case TeamRole.ADMIN:
      return {
        canManageTeam: false,
        canInviteMembers: true,
        canRemoveMembers: true,
        canManageWorkspaces: true,
        canShareResources: true,
        canViewActivity: true,
        canManageSettings: false
      };
    case TeamRole.MEMBER:
      return {
        canManageTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canManageWorkspaces: false,
        canShareResources: true,
        canViewActivity: true,
        canManageSettings: false
      };
    case TeamRole.VIEWER:
      return {
        canManageTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canManageWorkspaces: false,
        canShareResources: false,
        canViewActivity: true,
        canManageSettings: false
      };
    default:
      return {
        canManageTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canManageWorkspaces: false,
        canShareResources: false,
        canViewActivity: false,
        canManageSettings: false
      };
  }
};

export const getDefaultResourcePermissions = (role: TeamRole): ResourcePermissions => {
  switch (role) {
    case TeamRole.OWNER:
    case TeamRole.ADMIN:
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExecute: true
      };
    case TeamRole.MEMBER:
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canShare: true,
        canExecute: true
      };
    case TeamRole.VIEWER:
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canExecute: false
      };
    default:
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canExecute: false
      };
  }
};

// Subscription and Billing Types
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
  UNPAID = 'UNPAID',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  TRIALING = 'TRIALING'
}

export enum PlanInterval {
  MONTH = 'MONTH',
  YEAR = 'YEAR'
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: PlanInterval;
  currency: string;
  features: string[];
  limits: {
    aiRequests: number;
    deployments: number;
    securityScans: number;
    teamMembers: number;
    storage: number; // in GB
  };
  isPopular?: boolean;
  isEnterprise?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan?: SubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetrics {
  userId: string;
  subscriptionId: string;
  period: string;
  aiRequestsUsed: number;
  deploymentsUsed: number;
  securityScansUsed: number;
  storageUsed: number; // in GB
  bandwidthUsed: number; // in GB
  resetDate: Date;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  invoiceUrl?: string;
  invoicePdf?: string;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

// Request/Response types for Subscription API
export interface GetSubscriptionPlansResponse {
  plans: SubscriptionPlan[];
  success: boolean;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId: string;
}

export interface CreateSubscriptionResponse {
  subscription: Subscription;
  clientSecret?: string; // For 3D Secure authentication
  success: boolean;
}

export interface UpdateSubscriptionRequest {
  planId: string;
}

export interface UpdateSubscriptionResponse {
  subscription: Subscription;
  prorationAmount?: number;
  success: boolean;
}

export interface CancelSubscriptionRequest {
  cancelAtPeriodEnd: boolean;
  reason?: string;
}

export interface CancelSubscriptionResponse {
  subscription: Subscription;
  success: boolean;
}

export interface GetUsageMetricsResponse {
  usage: UsageMetrics;
  limits: SubscriptionPlan['limits'];
  success: boolean;
}

export interface GetInvoicesResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

// -----------------------------------------------------------------------------
// Paystack Payment & Subscription API Contracts
// -----------------------------------------------------------------------------
export interface PaystackInitializeRequest {
  email?: string;
  planId?: string;
  amount?: number; // In base currency (e.g. 29 for $29 or 29000 for NGN 29000)
  currency?: string; // 'USD' | 'NGN' | 'GHS' | 'ZAR'
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResponse {
  success: boolean;
  data: {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
    publicKey: string;
  };
}

export interface PaystackVerifyResponse {
  success: boolean;
  data: {
    reference: string;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    amount: number;
    currency: string;
    paidAt: string;
    channel: string;
    customer: {
      id: number;
      email: string;
      customerCode?: string;
    };
    plan?: string;
    subscription?: {
      id: string;
      status: string;
      planId: string;
      currentPeriodEnd: string;
    };
  };
}

export interface PaystackConfigResponse {
  success: boolean;
  data: {
    publicKey: string;
    isLive: boolean;
    supportedCurrencies: string[];
    plans: {
      id: string;
      name: string;
      price: number;
      currency: string;
      interval: string;
    }[];
  };
}

export interface GetPaymentMethodsResponse {
  paymentMethods: PaymentMethod[];
  success: boolean;
}

export interface AddPaymentMethodRequest {
  paymentMethodId: string;
  setAsDefault?: boolean;
}

export interface AddPaymentMethodResponse {
  paymentMethod: PaymentMethod;
  success: boolean;
}

export interface UpdatePaymentMethodRequest {
  paymentMethodId: string;
  setAsDefault: boolean;
}

export interface UpdatePaymentMethodResponse {
  paymentMethod: PaymentMethod;
  success: boolean;
}

// AI Services Types
export enum AIServiceCategory {
  CHAT = 'CHAT',
  ANALYSIS = 'ANALYSIS',
  GENERATION = 'GENERATION',
  PROCESSING = 'PROCESSING',
  VISION = 'VISION',
  AUDIO = 'AUDIO'
}

export enum AIRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum AIRequestPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface AIService {
  id: string;
  name: string;
  description: string;
  category: AIServiceCategory;
  provider: string;
  model: string;
  pricing: {
    inputTokenPrice: number;
    outputTokenPrice: number;
    currency: string;
  };
  limits: {
    maxTokens: number;
    maxRequests: number;
    rateLimitPerMinute: number;
  };
  capabilities: string[];
  isActive: boolean;
  iconUrl?: string;
  documentationUrl?: string;
}

export interface AIRequest {
  id: string;
  userId: string;
  serviceId: string;
  title?: string;
  input: any;
  parameters?: Record<string, any>;
  priority: AIRequestPriority;
  status: AIRequestStatus;
  result?: any;
  metadata?: {
    processingTime?: number;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    model?: string;
    citations?: string[];
    confidence?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  service?: AIService;
}

export interface AIRequestTemplate {
  id: string;
  name: string;
  description: string;
  serviceId: string;
  category: string;
  input: any;
  parameters: Record<string, any>;
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  createdAt: Date;
}

export interface AIUsageAnalytics {
  userId: string;
  period: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageProcessingTime: number;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    requestCount: number;
    tokenCount: number;
    cost: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

// Request/Response types for AI API
export interface GetAIServicesResponse {
  services: AIService[];
  categories: AIServiceCategory[];
  success: boolean;
}

export interface CreateAIRequestRequest {
  serviceId: string;
  title?: string;
  input: any;
  parameters?: Record<string, any>;
  priority?: AIRequestPriority;
}

export interface CreateAIRequestResponse {
  request: AIRequest;
  success: boolean;
}

export interface GetAIRequestResponse {
  request: AIRequest;
  success: boolean;
}

export interface GetAIRequestsResponse {
  requests: AIRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

export interface GetAIUsageAnalyticsResponse {
  analytics: AIUsageAnalytics;
  success: boolean;
}

export interface GetAITemplatesResponse {
  templates: AIRequestTemplate[];
  success: boolean;
}

export interface CreateAITemplateRequest {
  name: string;
  description: string;
  serviceId: string;
  category: string;
  input: any;
  parameters: Record<string, any>;
  isPublic?: boolean;
}

export interface CreateAITemplateResponse {
  template: AIRequestTemplate;
  success: boolean;
}

// DevOps Types
export enum GitProvider {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET'
}

export enum PipelineStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DISABLED = 'DISABLED'
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED'
}

export interface Repository {
  id: string;
  userId: string;
  provider: GitProvider;
  repoUrl: string;
  branch: string;
  accessTokenEncrypted?: string;
  webhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  pipelines?: Pipeline[];
  deployments?: Deployment[];
}

export interface PipelineStage {
  id: string;
  name: string;
  commands: string[];
  environment?: Record<string, string>;
  dependsOn?: string[];
  timeout?: number;
}

export interface PipelineTrigger {
  type: 'push' | 'pull_request' | 'schedule' | 'manual';
  branches?: string[];
  schedule?: string; // cron expression
  conditions?: Record<string, any>;
}

export interface Pipeline {
  id: string;
  repositoryId: string;
  name: string;
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  environment: Record<string, string>;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  repository?: Repository;
  deployments?: Deployment[];
}

export interface DeploymentLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stage?: string;
  metadata?: Record<string, any>;
}

export interface Deployment {
  id: string;
  repositoryId: string;
  pipelineId?: string;
  commit: string;
  status: DeploymentStatus;
  logs?: DeploymentLog[];
  startedAt: Date;
  completedAt?: Date;
  repository?: Repository;
  pipeline?: Pipeline;
  duration?: number;
  triggeredBy?: string;
}

export interface DeploymentAnalytics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  averageDeploymentTime: number;
  successRate: number;
  deploymentsThisWeek: number;
  deploymentsThisMonth: number;
  recentDeployments: Deployment[];
  deploymentTrends: Array<{
    date: string;
    successful: number;
    failed: number;
    averageTime: number;
  }>;
}

// Request/Response types for DevOps API
export interface ConnectRepositoryRequest {
  provider: GitProvider;
  repoUrl: string;
  branch?: string;
  accessToken: string;
}

export interface ConnectRepositoryResponse {
  repository: Repository;
  success: boolean;
}

export interface GetRepositoriesResponse {
  repositories: Repository[];
  success: boolean;
}

export interface CreatePipelineRequest {
  repositoryId: string;
  name: string;
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  environment?: Record<string, string>;
}

export interface CreatePipelineResponse {
  pipeline: Pipeline;
  success: boolean;
}

export interface UpdatePipelineRequest {
  name?: string;
  stages?: PipelineStage[];
  triggers?: PipelineTrigger[];
  environment?: Record<string, string>;
  status?: PipelineStatus;
}

export interface UpdatePipelineResponse {
  pipeline: Pipeline;
  success: boolean;
}

export interface GetPipelinesResponse {
  pipelines: Pipeline[];
  success: boolean;
}

export interface TriggerDeploymentRequest {
  repositoryId: string;
  pipelineId?: string;
  commit?: string;
  environment?: Record<string, string>;
}

export interface TriggerDeploymentResponse {
  deployment: Deployment;
  success: boolean;
}

export interface GetDeploymentsResponse {
  deployments: Deployment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

export interface GetDeploymentResponse {
  deployment: Deployment;
  success: boolean;
}

export interface GetDeploymentAnalyticsResponse {
  analytics: DeploymentAnalytics;
  success: boolean;
}

// Security Scanning Types
export enum SecurityScanType {
  VULNERABILITY = 'VULNERABILITY',
  PENETRATION = 'PENETRATION',
  COMPLIANCE = 'COMPLIANCE'
}

export enum ScanStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED'
}

export enum VulnerabilitySeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export enum ComplianceFramework {
  OWASP_TOP_10 = 'OWASP_TOP_10',
  PCI_DSS = 'PCI_DSS',
  SOC_2 = 'SOC_2',
  ISO_27001 = 'ISO_27001',
  NIST = 'NIST',
  GDPR = 'GDPR'
}

export interface ScanTarget {
  type: 'url' | 'repository' | 'network' | 'file';
  value: string;
  metadata?: Record<string, any>;
}

export interface Vulnerability {
  id: string;
  cve?: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  score?: number; // CVSS score
  category: string;
  affectedComponents: string[];
  remediation: string;
  references: string[];
  discoveredAt: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive';
  assignedTo?: string;
  dueDate?: Date;
  tags: string[];
}

export interface ComplianceCheck {
  id: string;
  framework: ComplianceFramework;
  control: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  evidence?: string;
  remediation?: string;
}

export interface ScanResults {
  summary: {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    resolvedCount: number;
    falsePositiveCount: number;
  };
  vulnerabilities: Vulnerability[];
  complianceChecks?: ComplianceCheck[];
  recommendations: string[];
  scanDuration: number;
  coverage: {
    endpoints: number;
    files: number;
    lines?: number;
  };
}

export interface SecurityScan {
  id: string;
  userId: string;
  name: string;
  target: ScanTarget;
  scanType: SecurityScanType;
  status: ScanStatus;
  results?: ScanResults;
  configuration?: {
    framework?: ComplianceFramework;
    depth?: 'shallow' | 'medium' | 'deep';
    includePatterns?: string[];
    excludePatterns?: string[];
    customRules?: string[];
  };
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  progress?: number;
  logs?: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
}

export interface RecurringScan {
  id: string;
  userId: string;
  name: string;
  target: ScanTarget;
  scanType: SecurityScanType;
  configuration: SecurityScan['configuration'];
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
  scanHistory: SecurityScan[];
}

export interface SecurityAnalytics {
  totalScans: number;
  scansThisWeek: number;
  scansThisMonth: number;
  averageScanTime: number;
  vulnerabilityTrends: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  }>;
  topVulnerabilities: Array<{
    title: string;
    severity: VulnerabilitySeverity;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  complianceScores: Array<{
    framework: ComplianceFramework;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  remediationMetrics: {
    averageTimeToResolve: number;
    resolvedThisWeek: number;
    overdueTasks: number;
  };
}

// Request/Response types for Security API
export interface CreateSecurityScanRequest {
  name: string;
  target: ScanTarget;
  scanType: SecurityScanType;
  configuration?: SecurityScan['configuration'];
  scheduledAt?: Date;
}

export interface CreateSecurityScanResponse {
  scan: SecurityScan;
  success: boolean;
}

export interface GetSecurityScansResponse {
  scans: SecurityScan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

export interface GetSecurityScanResponse {
  scan: SecurityScan;
  success: boolean;
}

export interface UpdateVulnerabilityRequest {
  status: Vulnerability['status'];
  assignedTo?: string;
  dueDate?: Date;
  notes?: string;
}

export interface UpdateVulnerabilityResponse {
  vulnerability: Vulnerability;
  success: boolean;
}

export interface CreateRecurringScanRequest {
  name: string;
  target: ScanTarget;
  scanType: SecurityScanType;
  configuration?: SecurityScan['configuration'];
  schedule: RecurringScan['schedule'];
}

export interface CreateRecurringScanResponse {
  recurringScan: RecurringScan;
  success: boolean;
}

export interface GetSecurityAnalyticsResponse {
  analytics: SecurityAnalytics;
  success: boolean;
}
