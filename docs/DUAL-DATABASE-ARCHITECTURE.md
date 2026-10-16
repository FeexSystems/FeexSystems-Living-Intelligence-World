# Dual Database Architecture: PostgreSQL + Firestore

## Overview

FeexSystems uses a dual database architecture to leverage the strengths of both PostgreSQL and Firebase Firestore:

- **PostgreSQL (via Prisma ORM)**: Canonical data storage, relational queries, World Model
- **Firebase Firestore**: Real-time synchronization, client-side access, telemetry & chat

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Client SDK (Auth, Firestore)                          │
│  HTTP API (Express)                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐   ┌───────────────────┐
        │  Firebase Functions│   │  Cloud SQL        │
        │  (Express Server)  │   │  PostgreSQL 15+   │
        └───────────────────┘   └───────────────────┘
                    │                   │
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐   ┌───────────────────┐
        │  Firebase         │   │  Prisma ORM       │
        │  Firestore        │   │  (PostgreSQL)     │
        └───────────────────┘   └───────────────────┘
```

---

## Database Responsibilities

### PostgreSQL (Canonical Data Store)

**Purpose**: Authoritative, relational data with complex queries

**Data Stored**:
- User accounts (canonical source of truth)
- Subscriptions & billing
- Repository metadata (World Model)
- Evidence Fabric (commit SHAs, artifacts)
- Security scans & results
- Team & workspace data
- Usage metrics & analytics
- Error logs & activity logs

**Access Patterns**:
- Server-side only (via Prisma)
- Complex relational queries
- Transactions and constraints
- Data integrity enforcement
- World Model graph queries

**Why PostgreSQL**:
- Strong data consistency (ACID)
- Complex joins and aggregations
- Full-text search (pgvector for semantic search)
- Mature ORM support (Prisma)
- Cost-effective for large datasets

---

### Firebase Firestore (Real-time & Client Data)

**Purpose**: Real-time synchronization, client-side access, temporary/state data

**Data Stored**:
- User profiles (mirrored from PostgreSQL for client access)
- Chat rooms and messages
- Telemetry events (Sovereign Engine HUD)
- Real-time collaboration state
- Session state
- Cached data for offline support

**Access Patterns**:
- Client-side via Firebase Client SDK
- Server-side via Firebase Admin SDK
- Real-time listeners (onSnapshot)
- Offline-first access
- Low-latency updates

**Why Firestore**:
- Real-time synchronization
- Automatic offline support
- Client-side SDK (no API layer needed)
- Built-in security rules
- Scalable real-time queries

---

## Data Flow

### User Registration Flow

```
1. User signs up via Firebase Auth (frontend)
   └─> Firebase Auth creates user account

2. Frontend sends user data to API (Express)
   └─> POST /api/auth/register

3. Server creates user in PostgreSQL (canonical)
   └─> Prisma creates user record

4. Server creates user profile in Firestore (client mirror)
   └─> Firebase Admin SDK writes to Firestore /users/{uid}

5. Client subscribes to Firestore user profile
   └─> Real-time updates for profile changes
```

### Authentication Flow

```
1. User signs in via Firebase Auth (frontend)
   └─> Firebase Auth returns ID token

2. Frontend sends ID token to API (Express)
   └─> Authorization: Bearer {firebase_id_token}

3. Server verifies token with Firebase Admin SDK
   └─> verifyFirebaseToken(idToken)

4. Server fetches user from PostgreSQL (canonical)
   └─> Prisma finds user by Firebase UID

5. Server returns user data to frontend
   └─> Response includes user role, permissions, etc.
```

### World Model Sync Flow

```
1. GitHub webhook triggers API (Express)
   └─> POST /api/world-model/webhook

2. Server processes webhook data
   └─> Parse commit, branch, files

3. Server writes canonical data to PostgreSQL
   └─> Prisma creates WorldModelEvent, WorldModelArtifact

4. Server writes telemetry to Firestore (for HUD)
   └─> Firebase Admin SDK writes to /telemetry/{docId}

5. Frontend subscribes to Firestore telemetry
   └─> Real-time updates for Sovereign Engine HUD
```

---

## Security Model

### PostgreSQL Security

**Access**: Server-side only (via Prisma)

**Security Mechanisms**:
- Database-level authentication (DATABASE_URL)
- Row-level security (application-level via Prisma)
- Encryption at rest (Cloud SQL encryption)
- Network isolation (VPC connectors)

**No Direct Client Access**: Clients never connect directly to PostgreSQL

---

### Firebase Firestore Security

**Access**: Client-side + Server-side

**Security Mechanisms**:
- Firebase Authentication (required for all operations)
- Firestore Security Rules (document-level access control)
- Data validation (rules enforce schema)
- Admin SDK bypass (server-side writes ignore rules)

**Security Rules Reference**: `firestore.rules`

**Key Rules**:
- `/users/{userId}`: Owner-only access
- `/chat_rooms/{roomId}`: Owner or room member access
- `/telemetry/{docId}`: Authenticated read-only (immutable)
- Default deny for all other collections

---

## Data Consistency Strategy

### Primary Source of Truth

**PostgreSQL is the canonical source** for all critical business data:
- User accounts
- Subscriptions
- Billing
- World Model
- Evidence Fabric

### Firestore as Projection/Mirror

**Firestore contains**:
- User profiles (mirrored from PostgreSQL)
- Real-time state (chat, telemetry)
- Temporary/cached data

### Sync Strategy

**PostgreSQL → Firestore** (Server-initiated):
```typescript
// When user profile updated in PostgreSQL
async function syncUserToFirestore(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  await admin.firestore().collection('users').doc(userId).set({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    // ... other fields
  });
}
```

**Firestore → PostgreSQL** (Rare, for analytics only):
```typescript
// Periodic sync of telemetry data for analytics
async function syncTelemetryToPostgres() {
  const telemetry = await admin.firestore().collection('telemetry').get();
  // Aggregate and write to PostgreSQL analytics tables
}
```

---

## Backup & Disaster Recovery

### PostgreSQL Backup

**Strategy**: Cloud SQL automated backups

- **Point-in-time recovery**: 7 days
- **Automated backups**: Daily
- **Cross-region replication**: Optional (configure in Cloud SQL)

**Restore Process**:
```bash
# Restore from backup
gcloud sql instances restore INSTANCE_NAME \
  --backup-id BACKUP_ID \
  --project PROJECT_ID
```

### Firestore Backup

**Strategy**: Firestore exports to Cloud Storage

- **Scheduled exports**: Daily via Cloud Scheduler
- **Export location**: Cloud Storage bucket
- **Retention**: 30 days

**Export Process**:
```bash
# Export Firestore to Cloud Storage
gcloud firestore export gs://BUCKET_NAME \
  --collection-ids=users,chat_rooms,telemetry
```

**Import Process**:
```bash
# Import Firestore from Cloud Storage
gcloud firestore import gs://BUCKET_NAME/EXPORT_PATH
```

---

## Performance Optimization

### PostgreSQL Optimization

**Indexing**:
- Foreign key indexes (automatic in Prisma)
- Composite indexes for common query patterns
- Full-text search indexes (pgvector)

**Connection Pooling**:
- Prisma connection pool (default: 10 connections)
- Cloud SQL connection pooling (PgBouncer)

**Query Optimization**:
- Use Prisma's `select` to limit fields
- Use `include` vs `select` appropriately
- Avoid N+1 queries with `include`

### Firestore Optimization

**Indexing**:
- Composite indexes for complex queries
- Single-field indexes (automatic)
- Reference: `firestore.indexes.json`

**Query Optimization**:
- Limit query results with `limit()`
- Use cursor-based pagination
- Avoid large documents (>1MB)
- Use subcollections for hierarchical data

**Real-time Optimization**:
- Debounce rapid updates
- Use batch writes for bulk operations
- Offline persistence for client SDK

---

## Monitoring & Observability

### PostgreSQL Monitoring

**Metrics**:
- Connection pool usage
- Query latency (Prisma logs)
- Database size growth
- Slow query logs

**Tools**:
- Cloud SQL Insights
- Cloud Monitoring dashboards
- Prisma query logging

### Firestore Monitoring

**Metrics**:
- Read/write operations
- Document size
- Query latency
- Security rule evaluation

**Tools**:
- Firebase Console → Firestore → Usage
- Cloud Monitoring (via Firebase)
- Security rule evaluation logs

---

## Migration Strategy

### When to Use PostgreSQL

Use PostgreSQL for:
- Canonical data (single source of truth)
- Complex relational queries
- Data integrity constraints
- Financial data (billing, subscriptions)
- World Model (graph relationships)
- Evidence Fabric (cryptographic provenance)

### When to Use Firestore

Use Firestore for:
- Real-time synchronization
- Client-side direct access
- Temporary/state data
- Chat/messaging
- Telemetry streams
- Offline-first features

### Data Migration

**PostgreSQL → Firestore** (Sync):
```typescript
// One-time migration of existing users
async function migrateUsersToFirestore() {
  const users = await prisma.user.findMany();
  const batch = admin.firestore().batch();

  users.forEach(user => {
    const docRef = admin.firestore().collection('users').doc(user.id);
    batch.set(docRef, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      // ... other fields
    });
  });

  await batch.commit();
}
```

**Firestore → PostgreSQL** (Rare):
- Only for analytics aggregation
- Not for canonical data migration

---

## Troubleshooting

### Common Issues

**Issue**: User profile out of sync between PostgreSQL and Firestore

**Solution**:
```typescript
// Force sync from PostgreSQL (canonical) to Firestore
await syncUserToFirestore(userId);
```

**Issue**: Firestore security rules blocking legitimate access

**Solution**:
- Test rules in Firebase Console Simulator
- Check Firebase Auth token validity
- Verify rule logic matches data structure

**Issue**: PostgreSQL query slow

**Solution**:
- Check Cloud SQL Insights
- Add missing indexes
- Optimize Prisma query (use `select` instead of `include`)

**Issue**: Firestore quota exceeded

**Solution**:
- Monitor usage in Firebase Console
- Optimize queries (use pagination)
- Consider moving cold data to PostgreSQL

---

## Best Practices

### PostgreSQL Best Practices

1. **Always use PostgreSQL as canonical source** for critical data
2. **Use Prisma transactions** for multi-step operations
3. **Add indexes** for frequently queried fields
4. **Use connection pooling** in production
5. **Monitor query performance** regularly
6. **Backup daily** with point-in-time recovery

### Firestore Best Practices

1. **Use security rules** to enforce data validation
2. **Limit document size** (<1MB recommended)
3. **Use subcollections** for hierarchical data
4. **Batch writes** for bulk operations
5. **Offline persistence** for better UX
6. **Export regularly** to Cloud Storage

### Dual Database Best Practices

1. **Never write to Firestore from client as canonical data**
2. **Always sync from PostgreSQL to Firestore** (not reverse)
3. **Use PostgreSQL for financial data** (billing, subscriptions)
4. **Use Firestore for real-time features** (chat, telemetry)
5. **Monitor both databases** for consistency
6. **Have a sync strategy** for data recovery

---

## Related Documentation

- [Secret Rotation Guide](./SECRET-ROTATION-GUIDE.md)
- [Secret Manager Setup](./SECRET-MANAGER-SETUP.md)
- [Security Audit Checklist](./SECURITY-AUDIT-CHECKLIST.md)
- [AGENTS.md](../AGENTS.md) - Project architecture
- [firestore.rules](../firestore.rules) - Firestore security rules
- [firestore.indexes.json](../firestore.indexes.json) - Firestore indexes
