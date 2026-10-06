# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListWorldProjects*](#listworldprojects)
  - [*GetWorldProject*](#getworldproject)
  - [*ListWorldEvidences*](#listworldevidences)
  - [*ListWorldTelemetryEvents*](#listworldtelemetryevents)
- [**Mutations**](#mutations)
  - [*UpsertWorldProject*](#upsertworldproject)
  - [*InsertWorldEvidence*](#insertworldevidence)
  - [*RecordTelemetryEvent*](#recordtelemetryevent)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@feexsystems/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@feexsystems/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@feexsystems/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListWorldProjects
You can execute the `ListWorldProjects` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listWorldProjects(options?: ExecuteQueryOptions): QueryPromise<ListWorldProjectsData, undefined>;

interface ListWorldProjectsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListWorldProjectsData, undefined>;
}
export const listWorldProjectsRef: ListWorldProjectsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listWorldProjects(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListWorldProjectsData, undefined>;

interface ListWorldProjectsRef {
  ...
  (dc: DataConnect): QueryRef<ListWorldProjectsData, undefined>;
}
export const listWorldProjectsRef: ListWorldProjectsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listWorldProjectsRef:
```typescript
const name = listWorldProjectsRef.operationName;
console.log(name);
```

### Variables
The `ListWorldProjects` query has no variables.
### Return Type
Recall that executing the `ListWorldProjects` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListWorldProjectsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListWorldProjectsData {
  worldProjects: ({
    id: string;
    name: string;
    repository: string;
    owner: string;
    url: string;
    description?: string | null;
    isPinned: boolean;
    lastObservedAt: TimestampString;
  } & WorldProject_Key)[];
}
```
### Using `ListWorldProjects`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listWorldProjects } from '@feexsystems/dataconnect';


// Call the `listWorldProjects()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listWorldProjects();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listWorldProjects(dataConnect);

console.log(data.worldProjects);

// Or, you can use the `Promise` API.
listWorldProjects().then((response) => {
  const data = response.data;
  console.log(data.worldProjects);
});
```

### Using `ListWorldProjects`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listWorldProjectsRef } from '@feexsystems/dataconnect';


// Call the `listWorldProjectsRef()` function to get a reference to the query.
const ref = listWorldProjectsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listWorldProjectsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.worldProjects);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.worldProjects);
});
```

## GetWorldProject
You can execute the `GetWorldProject` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getWorldProject(vars: GetWorldProjectVariables, options?: ExecuteQueryOptions): QueryPromise<GetWorldProjectData, GetWorldProjectVariables>;

interface GetWorldProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetWorldProjectVariables): QueryRef<GetWorldProjectData, GetWorldProjectVariables>;
}
export const getWorldProjectRef: GetWorldProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getWorldProject(dc: DataConnect, vars: GetWorldProjectVariables, options?: ExecuteQueryOptions): QueryPromise<GetWorldProjectData, GetWorldProjectVariables>;

interface GetWorldProjectRef {
  ...
  (dc: DataConnect, vars: GetWorldProjectVariables): QueryRef<GetWorldProjectData, GetWorldProjectVariables>;
}
export const getWorldProjectRef: GetWorldProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getWorldProjectRef:
```typescript
const name = getWorldProjectRef.operationName;
console.log(name);
```

### Variables
The `GetWorldProject` query requires an argument of type `GetWorldProjectVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetWorldProjectVariables {
  id: string;
}
```
### Return Type
Recall that executing the `GetWorldProject` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetWorldProjectData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetWorldProjectData {
  worldProject?: {
    id: string;
    name: string;
    repository: string;
    owner: string;
    url: string;
    description?: string | null;
    isPinned: boolean;
    lastObservedAt: TimestampString;
  } & WorldProject_Key;
}
```
### Using `GetWorldProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getWorldProject, GetWorldProjectVariables } from '@feexsystems/dataconnect';

// The `GetWorldProject` query requires an argument of type `GetWorldProjectVariables`:
const getWorldProjectVars: GetWorldProjectVariables = {
  id: ..., 
};

// Call the `getWorldProject()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getWorldProject(getWorldProjectVars);
// Variables can be defined inline as well.
const { data } = await getWorldProject({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getWorldProject(dataConnect, getWorldProjectVars);

console.log(data.worldProject);

// Or, you can use the `Promise` API.
getWorldProject(getWorldProjectVars).then((response) => {
  const data = response.data;
  console.log(data.worldProject);
});
```

### Using `GetWorldProject`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getWorldProjectRef, GetWorldProjectVariables } from '@feexsystems/dataconnect';

// The `GetWorldProject` query requires an argument of type `GetWorldProjectVariables`:
const getWorldProjectVars: GetWorldProjectVariables = {
  id: ..., 
};

// Call the `getWorldProjectRef()` function to get a reference to the query.
const ref = getWorldProjectRef(getWorldProjectVars);
// Variables can be defined inline as well.
const ref = getWorldProjectRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getWorldProjectRef(dataConnect, getWorldProjectVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.worldProject);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.worldProject);
});
```

## ListWorldEvidences
You can execute the `ListWorldEvidences` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listWorldEvidences(vars: ListWorldEvidencesVariables, options?: ExecuteQueryOptions): QueryPromise<ListWorldEvidencesData, ListWorldEvidencesVariables>;

interface ListWorldEvidencesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListWorldEvidencesVariables): QueryRef<ListWorldEvidencesData, ListWorldEvidencesVariables>;
}
export const listWorldEvidencesRef: ListWorldEvidencesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listWorldEvidences(dc: DataConnect, vars: ListWorldEvidencesVariables, options?: ExecuteQueryOptions): QueryPromise<ListWorldEvidencesData, ListWorldEvidencesVariables>;

interface ListWorldEvidencesRef {
  ...
  (dc: DataConnect, vars: ListWorldEvidencesVariables): QueryRef<ListWorldEvidencesData, ListWorldEvidencesVariables>;
}
export const listWorldEvidencesRef: ListWorldEvidencesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listWorldEvidencesRef:
```typescript
const name = listWorldEvidencesRef.operationName;
console.log(name);
```

### Variables
The `ListWorldEvidences` query requires an argument of type `ListWorldEvidencesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListWorldEvidencesVariables {
  projectId: string;
}
```
### Return Type
Recall that executing the `ListWorldEvidences` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListWorldEvidencesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListWorldEvidencesData {
  worldEvidences: ({
    id: UUIDString;
    commitSha: string;
    filePath?: string | null;
    observationType: string;
    timestamp: TimestampString;
  } & WorldEvidence_Key)[];
}
```
### Using `ListWorldEvidences`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listWorldEvidences, ListWorldEvidencesVariables } from '@feexsystems/dataconnect';

// The `ListWorldEvidences` query requires an argument of type `ListWorldEvidencesVariables`:
const listWorldEvidencesVars: ListWorldEvidencesVariables = {
  projectId: ..., 
};

// Call the `listWorldEvidences()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listWorldEvidences(listWorldEvidencesVars);
// Variables can be defined inline as well.
const { data } = await listWorldEvidences({ projectId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listWorldEvidences(dataConnect, listWorldEvidencesVars);

console.log(data.worldEvidences);

// Or, you can use the `Promise` API.
listWorldEvidences(listWorldEvidencesVars).then((response) => {
  const data = response.data;
  console.log(data.worldEvidences);
});
```

### Using `ListWorldEvidences`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listWorldEvidencesRef, ListWorldEvidencesVariables } from '@feexsystems/dataconnect';

// The `ListWorldEvidences` query requires an argument of type `ListWorldEvidencesVariables`:
const listWorldEvidencesVars: ListWorldEvidencesVariables = {
  projectId: ..., 
};

// Call the `listWorldEvidencesRef()` function to get a reference to the query.
const ref = listWorldEvidencesRef(listWorldEvidencesVars);
// Variables can be defined inline as well.
const ref = listWorldEvidencesRef({ projectId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listWorldEvidencesRef(dataConnect, listWorldEvidencesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.worldEvidences);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.worldEvidences);
});
```

## ListWorldTelemetryEvents
You can execute the `ListWorldTelemetryEvents` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listWorldTelemetryEvents(options?: ExecuteQueryOptions): QueryPromise<ListWorldTelemetryEventsData, undefined>;

interface ListWorldTelemetryEventsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListWorldTelemetryEventsData, undefined>;
}
export const listWorldTelemetryEventsRef: ListWorldTelemetryEventsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listWorldTelemetryEvents(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListWorldTelemetryEventsData, undefined>;

interface ListWorldTelemetryEventsRef {
  ...
  (dc: DataConnect): QueryRef<ListWorldTelemetryEventsData, undefined>;
}
export const listWorldTelemetryEventsRef: ListWorldTelemetryEventsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listWorldTelemetryEventsRef:
```typescript
const name = listWorldTelemetryEventsRef.operationName;
console.log(name);
```

### Variables
The `ListWorldTelemetryEvents` query has no variables.
### Return Type
Recall that executing the `ListWorldTelemetryEvents` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListWorldTelemetryEventsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListWorldTelemetryEventsData {
  worldTelemetryEvents: ({
    id: UUIDString;
    eventType: string;
    source: string;
    payload?: unknown | null;
    createdAt: TimestampString;
  } & WorldTelemetryEvent_Key)[];
}
```
### Using `ListWorldTelemetryEvents`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listWorldTelemetryEvents } from '@feexsystems/dataconnect';


// Call the `listWorldTelemetryEvents()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listWorldTelemetryEvents();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listWorldTelemetryEvents(dataConnect);

console.log(data.worldTelemetryEvents);

// Or, you can use the `Promise` API.
listWorldTelemetryEvents().then((response) => {
  const data = response.data;
  console.log(data.worldTelemetryEvents);
});
```

### Using `ListWorldTelemetryEvents`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listWorldTelemetryEventsRef } from '@feexsystems/dataconnect';


// Call the `listWorldTelemetryEventsRef()` function to get a reference to the query.
const ref = listWorldTelemetryEventsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listWorldTelemetryEventsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.worldTelemetryEvents);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.worldTelemetryEvents);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UpsertWorldProject
You can execute the `UpsertWorldProject` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
upsertWorldProject(vars: UpsertWorldProjectVariables): MutationPromise<UpsertWorldProjectData, UpsertWorldProjectVariables>;

interface UpsertWorldProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertWorldProjectVariables): MutationRef<UpsertWorldProjectData, UpsertWorldProjectVariables>;
}
export const upsertWorldProjectRef: UpsertWorldProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertWorldProject(dc: DataConnect, vars: UpsertWorldProjectVariables): MutationPromise<UpsertWorldProjectData, UpsertWorldProjectVariables>;

interface UpsertWorldProjectRef {
  ...
  (dc: DataConnect, vars: UpsertWorldProjectVariables): MutationRef<UpsertWorldProjectData, UpsertWorldProjectVariables>;
}
export const upsertWorldProjectRef: UpsertWorldProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertWorldProjectRef:
```typescript
const name = upsertWorldProjectRef.operationName;
console.log(name);
```

### Variables
The `UpsertWorldProject` mutation requires an argument of type `UpsertWorldProjectVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertWorldProjectVariables {
  id: string;
  name: string;
  repository: string;
  owner: string;
  url: string;
  description?: string | null;
  isPinned?: boolean | null;
}
```
### Return Type
Recall that executing the `UpsertWorldProject` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertWorldProjectData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertWorldProjectData {
  worldProject_upsert: WorldProject_Key;
}
```
### Using `UpsertWorldProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertWorldProject, UpsertWorldProjectVariables } from '@feexsystems/dataconnect';

// The `UpsertWorldProject` mutation requires an argument of type `UpsertWorldProjectVariables`:
const upsertWorldProjectVars: UpsertWorldProjectVariables = {
  id: ..., 
  name: ..., 
  repository: ..., 
  owner: ..., 
  url: ..., 
  description: ..., // optional
  isPinned: ..., // optional
};

// Call the `upsertWorldProject()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertWorldProject(upsertWorldProjectVars);
// Variables can be defined inline as well.
const { data } = await upsertWorldProject({ id: ..., name: ..., repository: ..., owner: ..., url: ..., description: ..., isPinned: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertWorldProject(dataConnect, upsertWorldProjectVars);

console.log(data.worldProject_upsert);

// Or, you can use the `Promise` API.
upsertWorldProject(upsertWorldProjectVars).then((response) => {
  const data = response.data;
  console.log(data.worldProject_upsert);
});
```

### Using `UpsertWorldProject`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertWorldProjectRef, UpsertWorldProjectVariables } from '@feexsystems/dataconnect';

// The `UpsertWorldProject` mutation requires an argument of type `UpsertWorldProjectVariables`:
const upsertWorldProjectVars: UpsertWorldProjectVariables = {
  id: ..., 
  name: ..., 
  repository: ..., 
  owner: ..., 
  url: ..., 
  description: ..., // optional
  isPinned: ..., // optional
};

// Call the `upsertWorldProjectRef()` function to get a reference to the mutation.
const ref = upsertWorldProjectRef(upsertWorldProjectVars);
// Variables can be defined inline as well.
const ref = upsertWorldProjectRef({ id: ..., name: ..., repository: ..., owner: ..., url: ..., description: ..., isPinned: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertWorldProjectRef(dataConnect, upsertWorldProjectVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.worldProject_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.worldProject_upsert);
});
```

## InsertWorldEvidence
You can execute the `InsertWorldEvidence` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
insertWorldEvidence(vars: InsertWorldEvidenceVariables): MutationPromise<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;

interface InsertWorldEvidenceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertWorldEvidenceVariables): MutationRef<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;
}
export const insertWorldEvidenceRef: InsertWorldEvidenceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertWorldEvidence(dc: DataConnect, vars: InsertWorldEvidenceVariables): MutationPromise<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;

interface InsertWorldEvidenceRef {
  ...
  (dc: DataConnect, vars: InsertWorldEvidenceVariables): MutationRef<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;
}
export const insertWorldEvidenceRef: InsertWorldEvidenceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertWorldEvidenceRef:
```typescript
const name = insertWorldEvidenceRef.operationName;
console.log(name);
```

### Variables
The `InsertWorldEvidence` mutation requires an argument of type `InsertWorldEvidenceVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertWorldEvidenceVariables {
  projectId: string;
  commitSha: string;
  filePath?: string | null;
  observationType: string;
}
```
### Return Type
Recall that executing the `InsertWorldEvidence` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertWorldEvidenceData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertWorldEvidenceData {
  worldEvidence_insert: WorldEvidence_Key;
}
```
### Using `InsertWorldEvidence`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertWorldEvidence, InsertWorldEvidenceVariables } from '@feexsystems/dataconnect';

// The `InsertWorldEvidence` mutation requires an argument of type `InsertWorldEvidenceVariables`:
const insertWorldEvidenceVars: InsertWorldEvidenceVariables = {
  projectId: ..., 
  commitSha: ..., 
  filePath: ..., // optional
  observationType: ..., 
};

// Call the `insertWorldEvidence()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertWorldEvidence(insertWorldEvidenceVars);
// Variables can be defined inline as well.
const { data } = await insertWorldEvidence({ projectId: ..., commitSha: ..., filePath: ..., observationType: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertWorldEvidence(dataConnect, insertWorldEvidenceVars);

console.log(data.worldEvidence_insert);

// Or, you can use the `Promise` API.
insertWorldEvidence(insertWorldEvidenceVars).then((response) => {
  const data = response.data;
  console.log(data.worldEvidence_insert);
});
```

### Using `InsertWorldEvidence`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertWorldEvidenceRef, InsertWorldEvidenceVariables } from '@feexsystems/dataconnect';

// The `InsertWorldEvidence` mutation requires an argument of type `InsertWorldEvidenceVariables`:
const insertWorldEvidenceVars: InsertWorldEvidenceVariables = {
  projectId: ..., 
  commitSha: ..., 
  filePath: ..., // optional
  observationType: ..., 
};

// Call the `insertWorldEvidenceRef()` function to get a reference to the mutation.
const ref = insertWorldEvidenceRef(insertWorldEvidenceVars);
// Variables can be defined inline as well.
const ref = insertWorldEvidenceRef({ projectId: ..., commitSha: ..., filePath: ..., observationType: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertWorldEvidenceRef(dataConnect, insertWorldEvidenceVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.worldEvidence_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.worldEvidence_insert);
});
```

## RecordTelemetryEvent
You can execute the `RecordTelemetryEvent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
recordTelemetryEvent(vars: RecordTelemetryEventVariables): MutationPromise<RecordTelemetryEventData, RecordTelemetryEventVariables>;

interface RecordTelemetryEventRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordTelemetryEventVariables): MutationRef<RecordTelemetryEventData, RecordTelemetryEventVariables>;
}
export const recordTelemetryEventRef: RecordTelemetryEventRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
recordTelemetryEvent(dc: DataConnect, vars: RecordTelemetryEventVariables): MutationPromise<RecordTelemetryEventData, RecordTelemetryEventVariables>;

interface RecordTelemetryEventRef {
  ...
  (dc: DataConnect, vars: RecordTelemetryEventVariables): MutationRef<RecordTelemetryEventData, RecordTelemetryEventVariables>;
}
export const recordTelemetryEventRef: RecordTelemetryEventRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the recordTelemetryEventRef:
```typescript
const name = recordTelemetryEventRef.operationName;
console.log(name);
```

### Variables
The `RecordTelemetryEvent` mutation requires an argument of type `RecordTelemetryEventVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface RecordTelemetryEventVariables {
  eventType: string;
  source: string;
  payload?: unknown | null;
}
```
### Return Type
Recall that executing the `RecordTelemetryEvent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `RecordTelemetryEventData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface RecordTelemetryEventData {
  worldTelemetryEvent_insert: WorldTelemetryEvent_Key;
}
```
### Using `RecordTelemetryEvent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, recordTelemetryEvent, RecordTelemetryEventVariables } from '@feexsystems/dataconnect';

// The `RecordTelemetryEvent` mutation requires an argument of type `RecordTelemetryEventVariables`:
const recordTelemetryEventVars: RecordTelemetryEventVariables = {
  eventType: ..., 
  source: ..., 
  payload: ..., // optional
};

// Call the `recordTelemetryEvent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await recordTelemetryEvent(recordTelemetryEventVars);
// Variables can be defined inline as well.
const { data } = await recordTelemetryEvent({ eventType: ..., source: ..., payload: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await recordTelemetryEvent(dataConnect, recordTelemetryEventVars);

console.log(data.worldTelemetryEvent_insert);

// Or, you can use the `Promise` API.
recordTelemetryEvent(recordTelemetryEventVars).then((response) => {
  const data = response.data;
  console.log(data.worldTelemetryEvent_insert);
});
```

### Using `RecordTelemetryEvent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, recordTelemetryEventRef, RecordTelemetryEventVariables } from '@feexsystems/dataconnect';

// The `RecordTelemetryEvent` mutation requires an argument of type `RecordTelemetryEventVariables`:
const recordTelemetryEventVars: RecordTelemetryEventVariables = {
  eventType: ..., 
  source: ..., 
  payload: ..., // optional
};

// Call the `recordTelemetryEventRef()` function to get a reference to the mutation.
const ref = recordTelemetryEventRef(recordTelemetryEventVars);
// Variables can be defined inline as well.
const ref = recordTelemetryEventRef({ eventType: ..., source: ..., payload: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = recordTelemetryEventRef(dataConnect, recordTelemetryEventVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.worldTelemetryEvent_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.worldTelemetryEvent_insert);
});
```

