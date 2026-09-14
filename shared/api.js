/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */




// Team Collaboration Types
export var TeamRole; (function (TeamRole) {
  const OWNER = 'OWNER'; TeamRole["OWNER"] = OWNER;
  const ADMIN = 'ADMIN'; TeamRole["ADMIN"] = ADMIN;
  const MEMBER = 'MEMBER'; TeamRole["MEMBER"] = MEMBER;
  const VIEWER = 'VIEWER'; TeamRole["VIEWER"] = VIEWER;
})(TeamRole || (TeamRole = {}));

export var MemberStatus; (function (MemberStatus) {
  const ACTIVE = 'ACTIVE'; MemberStatus["ACTIVE"] = ACTIVE;
  const INACTIVE = 'INACTIVE'; MemberStatus["INACTIVE"] = INACTIVE;
  const SUSPENDED = 'SUSPENDED'; MemberStatus["SUSPENDED"] = SUSPENDED;
})(MemberStatus || (MemberStatus = {}));

export var InvitationStatus; (function (InvitationStatus) {
  const PENDING = 'PENDING'; InvitationStatus["PENDING"] = PENDING;
  const ACCEPTED = 'ACCEPTED'; InvitationStatus["ACCEPTED"] = ACCEPTED;
  const DECLINED = 'DECLINED'; InvitationStatus["DECLINED"] = DECLINED;
  const EXPIRED = 'EXPIRED'; InvitationStatus["EXPIRED"] = EXPIRED;
})(InvitationStatus || (InvitationStatus = {}));

export var ResourceType; (function (ResourceType) {
  const AI_REQUEST = 'AI_REQUEST'; ResourceType["AI_REQUEST"] = AI_REQUEST;
  const REPOSITORY = 'REPOSITORY'; ResourceType["REPOSITORY"] = REPOSITORY;
  const PIPELINE = 'PIPELINE'; ResourceType["PIPELINE"] = PIPELINE;
  const DEPLOYMENT = 'DEPLOYMENT'; ResourceType["DEPLOYMENT"] = DEPLOYMENT;
  const SECURITY_SCAN = 'SECURITY_SCAN'; ResourceType["SECURITY_SCAN"] = SECURITY_SCAN;
  const WORKSPACE = 'WORKSPACE'; ResourceType["WORKSPACE"] = WORKSPACE;
})(ResourceType || (ResourceType = {}));

// Team interfaces







































































































































































































// Utility functions for permissions
export const getTeamPermissions = (role) => {
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

export const getDefaultResourcePermissions = (role) => {
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
export var SubscriptionStatus; (function (SubscriptionStatus) {
  const ACTIVE = 'ACTIVE'; SubscriptionStatus["ACTIVE"] = ACTIVE;
  const CANCELED = 'CANCELED'; SubscriptionStatus["CANCELED"] = CANCELED;
  const PAST_DUE = 'PAST_DUE'; SubscriptionStatus["PAST_DUE"] = PAST_DUE;
  const UNPAID = 'UNPAID'; SubscriptionStatus["UNPAID"] = UNPAID;
  const INCOMPLETE = 'INCOMPLETE'; SubscriptionStatus["INCOMPLETE"] = INCOMPLETE;
  const INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED'; SubscriptionStatus["INCOMPLETE_EXPIRED"] = INCOMPLETE_EXPIRED;
  const TRIALING = 'TRIALING'; SubscriptionStatus["TRIALING"] = TRIALING;
})(SubscriptionStatus || (SubscriptionStatus = {}));

export var PlanInterval; (function (PlanInterval) {
  const MONTH = 'MONTH'; PlanInterval["MONTH"] = MONTH;
  const YEAR = 'YEAR'; PlanInterval["YEAR"] = YEAR;
})(PlanInterval || (PlanInterval = {}));
























































































































































































































// AI Services Types
export var AIServiceCategory; (function (AIServiceCategory) {
  const CHAT = 'CHAT'; AIServiceCategory["CHAT"] = CHAT;
  const ANALYSIS = 'ANALYSIS'; AIServiceCategory["ANALYSIS"] = ANALYSIS;
  const GENERATION = 'GENERATION'; AIServiceCategory["GENERATION"] = GENERATION;
  const PROCESSING = 'PROCESSING'; AIServiceCategory["PROCESSING"] = PROCESSING;
  const VISION = 'VISION'; AIServiceCategory["VISION"] = VISION;
  const AUDIO = 'AUDIO'; AIServiceCategory["AUDIO"] = AUDIO;
})(AIServiceCategory || (AIServiceCategory = {}));

export var AIRequestStatus; (function (AIRequestStatus) {
  const PENDING = 'PENDING'; AIRequestStatus["PENDING"] = PENDING;
  const PROCESSING = 'PROCESSING'; AIRequestStatus["PROCESSING"] = PROCESSING;
  const COMPLETED = 'COMPLETED'; AIRequestStatus["COMPLETED"] = COMPLETED;
  const FAILED = 'FAILED'; AIRequestStatus["FAILED"] = FAILED;
  const CANCELLED = 'CANCELLED'; AIRequestStatus["CANCELLED"] = CANCELLED;
})(AIRequestStatus || (AIRequestStatus = {}));

export var AIRequestPriority; (function (AIRequestPriority) {
  const LOW = 'LOW'; AIRequestPriority["LOW"] = LOW;
  const NORMAL = 'NORMAL'; AIRequestPriority["NORMAL"] = NORMAL;
  const HIGH = 'HIGH'; AIRequestPriority["HIGH"] = HIGH;
  const URGENT = 'URGENT'; AIRequestPriority["URGENT"] = URGENT;
})(AIRequestPriority || (AIRequestPriority = {}));

























































































































































// DevOps Types
export var GitProvider; (function (GitProvider) {
  const GITHUB = 'GITHUB'; GitProvider["GITHUB"] = GITHUB;
  const GITLAB = 'GITLAB'; GitProvider["GITLAB"] = GITLAB;
  const BITBUCKET = 'BITBUCKET'; GitProvider["BITBUCKET"] = BITBUCKET;
})(GitProvider || (GitProvider = {}));

export var PipelineStatus; (function (PipelineStatus) {
  const ACTIVE = 'ACTIVE'; PipelineStatus["ACTIVE"] = ACTIVE;
  const PAUSED = 'PAUSED'; PipelineStatus["PAUSED"] = PAUSED;
  const DISABLED = 'DISABLED'; PipelineStatus["DISABLED"] = DISABLED;
})(PipelineStatus || (PipelineStatus = {}));

export var DeploymentStatus; (function (DeploymentStatus) {
  const PENDING = 'PENDING'; DeploymentStatus["PENDING"] = PENDING;
  const RUNNING = 'RUNNING'; DeploymentStatus["RUNNING"] = RUNNING;
  const SUCCESS = 'SUCCESS'; DeploymentStatus["SUCCESS"] = SUCCESS;
  const FAILED = 'FAILED'; DeploymentStatus["FAILED"] = FAILED;
  const CANCELED = 'CANCELED'; DeploymentStatus["CANCELED"] = CANCELED;
})(DeploymentStatus || (DeploymentStatus = {}));








































































































































































// Security Scanning Types
export var SecurityScanType; (function (SecurityScanType) {
  const VULNERABILITY = 'VULNERABILITY'; SecurityScanType["VULNERABILITY"] = VULNERABILITY;
  const PENETRATION = 'PENETRATION'; SecurityScanType["PENETRATION"] = PENETRATION;
  const COMPLIANCE = 'COMPLIANCE'; SecurityScanType["COMPLIANCE"] = COMPLIANCE;
})(SecurityScanType || (SecurityScanType = {}));

export var ScanStatus; (function (ScanStatus) {
  const QUEUED = 'QUEUED'; ScanStatus["QUEUED"] = QUEUED;
  const RUNNING = 'RUNNING'; ScanStatus["RUNNING"] = RUNNING;
  const COMPLETED = 'COMPLETED'; ScanStatus["COMPLETED"] = COMPLETED;
  const FAILED = 'FAILED'; ScanStatus["FAILED"] = FAILED;
  const CANCELED = 'CANCELED'; ScanStatus["CANCELED"] = CANCELED;
})(ScanStatus || (ScanStatus = {}));

export var VulnerabilitySeverity; (function (VulnerabilitySeverity) {
  const CRITICAL = 'CRITICAL'; VulnerabilitySeverity["CRITICAL"] = CRITICAL;
  const HIGH = 'HIGH'; VulnerabilitySeverity["HIGH"] = HIGH;
  const MEDIUM = 'MEDIUM'; VulnerabilitySeverity["MEDIUM"] = MEDIUM;
  const LOW = 'LOW'; VulnerabilitySeverity["LOW"] = LOW;
  const INFO = 'INFO'; VulnerabilitySeverity["INFO"] = INFO;
})(VulnerabilitySeverity || (VulnerabilitySeverity = {}));

export var ComplianceFramework; (function (ComplianceFramework) {
  const OWASP_TOP_10 = 'OWASP_TOP_10'; ComplianceFramework["OWASP_TOP_10"] = OWASP_TOP_10;
  const PCI_DSS = 'PCI_DSS'; ComplianceFramework["PCI_DSS"] = PCI_DSS;
  const SOC_2 = 'SOC_2'; ComplianceFramework["SOC_2"] = SOC_2;
  const ISO_27001 = 'ISO_27001'; ComplianceFramework["ISO_27001"] = ISO_27001;
  const NIST = 'NIST'; ComplianceFramework["NIST"] = NIST;
  const GDPR = 'GDPR'; ComplianceFramework["GDPR"] = GDPR;
})(ComplianceFramework || (ComplianceFramework = {}));




































































































































































































