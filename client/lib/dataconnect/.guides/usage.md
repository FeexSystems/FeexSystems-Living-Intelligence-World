# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertWorldProject, insertWorldEvidence, recordTelemetryEvent, listWorldProjects, getWorldProject, listWorldEvidences, listWorldTelemetryEvents } from '@feexsystems/dataconnect';


// Operation UpsertWorldProject:  For variables, look at type UpsertWorldProjectVars in ../index.d.ts
const { data } = await UpsertWorldProject(dataConnect, upsertWorldProjectVars);

// Operation InsertWorldEvidence:  For variables, look at type InsertWorldEvidenceVars in ../index.d.ts
const { data } = await InsertWorldEvidence(dataConnect, insertWorldEvidenceVars);

// Operation RecordTelemetryEvent:  For variables, look at type RecordTelemetryEventVars in ../index.d.ts
const { data } = await RecordTelemetryEvent(dataConnect, recordTelemetryEventVars);

// Operation ListWorldProjects: 
const { data } = await ListWorldProjects(dataConnect);

// Operation GetWorldProject:  For variables, look at type GetWorldProjectVars in ../index.d.ts
const { data } = await GetWorldProject(dataConnect, getWorldProjectVars);

// Operation ListWorldEvidences:  For variables, look at type ListWorldEvidencesVars in ../index.d.ts
const { data } = await ListWorldEvidences(dataConnect, listWorldEvidencesVars);

// Operation ListWorldTelemetryEvents: 
const { data } = await ListWorldTelemetryEvents(dataConnect);


```