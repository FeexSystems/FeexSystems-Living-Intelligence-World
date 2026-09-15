# FeexSystems API Integration Guide

Complete guide to integrating the FeexSystems API using the OpenAPI 3.0 specification.

## Table of Contents

1. [OpenAPI Documentation Tools](#openapi-documentation-tools)
2. [Client Library Generation](#client-library-generation)
3. [Testing & Validation](#testing--validation)
4. [IDE & Editor Setup](#ide--editor-setup)
5. [Popular Frameworks](#popular-frameworks)
6. [Deployment & CI/CD](#deployment--cicd)

---

## OpenAPI Documentation Tools

### Swagger UI (Interactive Docs)

**Best for**: Interactive API exploration, testing endpoints in browser

#### Docker

```bash
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/openapi.3.0.yaml \
  -v $(pwd)/docs:/specs \
  swaggerapi/swagger-ui

# Visit: http://localhost:8080/?url=/specs/openapi.3.0.yaml
```

#### Docker Compose

```yaml
version: '3'
services:
  swagger-ui:
    image: swaggerapi/swagger-ui
    ports:
      - "8080:8080"
    environment:
      SWAGGER_JSON: /specs/openapi.3.0.yaml
    volumes:
      - ./docs:/specs
```

#### npm/yarn

```bash
npm install -g swagger-ui-express

# In your server code:
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');

const spec = yaml.load(fs.readFileSync('./docs/openapi.3.0.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

# Visit: http://localhost:3000/api-docs
```

### Redoc (Beautiful Docs)

**Best for**: Static documentation site, clean presentation

#### Docker

```bash
docker run -p 8000:8080 \
  -e SPEC_URL=https://raw.githubusercontent.com/your-org/repo/main/docs/openapi.3.0.yaml \
  redocly/redoc

# Visit: http://localhost:8000
```

#### npm/yarn

```bash
npm install -g redoc-cli

redoc-cli bundle docs/openapi.3.0.yaml -o docs/index.html

# Open docs/index.html in browser
```

#### Host on GitHub Pages

```bash
redoc-cli bundle docs/openapi.3.0.yaml -o public/api-docs.html

git add public/api-docs.html
git commit -m "Update API docs"
git push

# Visit: https://your-org.github.io/repo/api-docs.html
```

### Elements (by Stoplight)

**Best for**: Reference docs with examples and code samples

```bash
npm install -g @stoplight/elements-cli

elements build --input docs/openapi.3.0.yaml --output docs/elements
```

### OpenAPI.tools

**Best for**: Quick previews, no installation

Visit: https://openapi.tools/

Upload your `openapi.3.0.yaml` or paste URL:
```
https://raw.githubusercontent.com/your-org/repo/main/docs/openapi.3.0.yaml
```

---

## Client Library Generation

### OpenAPI Generator

**Install**

```bash
brew install openapi-generator  # macOS
# or
npm install -g @openapitools/openapi-generator-cli
```

### TypeScript Client

```bash
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g typescript-fetch \
  -o generated/typescript-client \
  -c ./openapi-config.json
```

**openapi-config.json**:

```json
{
  "packageName": "@feexsystems/api-client",
  "packageVersion": "2.0.0",
  "supportsES6": true,
  "typescriptThreePlus": true
}
```

**Usage**:

```typescript
import { FeexSystemsApi } from '@feexsystems/api-client';

const api = new FeexSystemsApi(
  new Configuration({
    basePath: 'https://api.feexsystems.codes',
    accessToken: firebaseToken,
  })
);

const user = await api.getCurrentUser();
const projects = await api.getWorldModelProjects();
```

### Python Client

```bash
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g python \
  -o generated/python-client \
  --package-name feexsystems_api
```

**Usage**:

```python
from feexsystems_api import Configuration, ApiClient
from feexsystems_api.apis import WorldModelApi

config = Configuration(
    host="https://api.feexsystems.codes",
    access_token="your-firebase-token"
)

with ApiClient(config) as api_client:
    api = WorldModelApi(api_client)
    projects = api.get_world_model_projects()
```

### Go Client

```bash
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g go \
  -o generated/go-client \
  --package-name feexsystems
```

**Usage**:

```go
package main

import "github.com/your-org/feexsystems-go"

client := feexsystems.NewClient("https://api.feexsystems.codes")
client.SetBearerToken(firebaseToken)

projects, err := client.GetWorldModelProjects(ctx)
```

### Java Client

```bash
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g java \
  -o generated/java-client \
  --package-name com.feexsystems.api
```

### C# / .NET Client

```bash
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g csharp-netcore \
  -o generated/csharp-client \
  --package-name FeexSystems.Api
```

### Publish Generated Client

```bash
# npm
cd generated/typescript-client
npm publish --access public

# PyPI
python -m pip install twine
twine upload dist/*

# Maven
mvn deploy

# NuGet
dotnet nuget push generated/csharp-client/FeexSystems.Api.1.0.0.nupkg
```

---

## Testing & Validation

### Validate OpenAPI Spec

```bash
# Using spectacle
npm install -g spectacle-docs
spectacle validate docs/openapi.3.0.yaml

# Using swagger-cli
npm install -g swagger-cli
swagger-cli validate docs/openapi.3.0.yaml
```

### Test with Postman

1. **Import Spec**
   - Postman > Import > Select `openapi.3.0.yaml`
   - Creates collection with all endpoints

2. **Set Environment Variables**
   ```json
   {
     "base_url": "http://localhost:3001",
     "firebase_token": "{{$randomUUID}}"
   }
   ```

3. **Run Collection Tests**
   ```bash
   npm install -g newman
   
   newman run FeexSystems.postman_collection.json \
     -e environment.json \
     --reporters cli,json
   ```

### Test with Insomnia

1. Import OpenAPI: File > Import > `openapi.3.0.yaml`
2. Create workspace environment
3. Use request chaining for multi-step flows

### Contract Testing

Test API implementation against spec:

```bash
npm install --save-dev @openapitools/openapi-generator-cli
npm install --save-dev swagger-assert
```

Example test:

```javascript
const swaggerAssert = require('swagger-assert');
const spec = require('./openapi.3.0.json');

describe('API Compliance', () => {
  it('GET /api/auth/me matches spec', async () => {
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer token' }
    });
    
    await swaggerAssert.assertResponse(
      spec,
      response,
      'GET',
      '/api/auth/me',
      '200'
    );
  });
});
```

---

## IDE & Editor Setup

### VS Code

#### Extensions

```json
{
  "recommendations": [
    "Arjun.swagger-viewer",
    "42Crunch.vscode-openapi",
    "mermade.openapi-preview"
  ]
}
```

Install:
```
ext install Arjun.swagger-viewer 42Crunch.vscode-openapi
```

#### Settings

**.vscode/settings.json**:

```json
{
  "openapi.preview.style": "swagger",
  "openapi.docExpand": "list",
  "openapi.defaultModel": "example"
}
```

#### Quick Action

Right-click `openapi.3.0.yaml` → "Preview OpenAPI"

### JetBrains IDEs (IntelliJ, PyCharm, WebStorm)

Built-in support:
1. Open `openapi.3.0.yaml`
2. Click preview icon (top-right)
3. Get live schema validation

### Vim/Neovim

```bash
# Install Swagger LSP
npm install -g swagger-lsp

# Add to init.vim / init.lua:
# lspconfig.swagger_lsp.setup({})
```

### Sublime Text

Install package:
```
Package Control > Install Package > OpenAPI
```

---

## Popular Frameworks

### React + TypeScript

#### 1. Generate Client

```bash
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g typescript-fetch \
  -o src/generated/api
```

#### 2. Create API Hook

```typescript
// src/hooks/useFeexApi.ts
import { useState, useEffect } from 'react';
import { Configuration, FeexSystemsApi } from '../generated/api';

export function useFeexApi(token?: string) {
  const [api, setApi] = useState<FeexSystemsApi | null>(null);

  useEffect(() => {
    const config = new Configuration({
      basePath: process.env.REACT_APP_API_URL,
      accessToken: token,
    });
    setApi(new FeexSystemsApi(undefined, undefined, config));
  }, [token]);

  return api;
}
```

#### 3. Use in Components

```typescript
function UserProfile() {
  const api = useFeexApi(firebaseToken);
  const [user, setUser] = useState(null);

  useEffect(() => {
    api?.getCurrentUser().then(setUser);
  }, [api]);

  return <div>{user?.email}</div>;
}
```

### Next.js

#### 1. Generate Client

```bash
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g typescript-fetch \
  -o lib/api
```

#### 2. Create API Instance

```typescript
// lib/api/client.ts
import { Configuration, FeexSystemsApi } from './index';

export function getApiClient(accessToken?: string) {
  return new FeexSystemsApi(
    new Configuration({
      basePath: process.env.NEXT_PUBLIC_API_URL,
      accessToken,
    })
  );
}
```

#### 3. Server-Side Usage (App Router)

```typescript
// app/profile/page.tsx
import { getApiClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth';

export default async function ProfilePage() {
  const session = await getSession();
  const api = getApiClient(session?.accessToken);
  const user = await api.getCurrentUser();

  return <div>{user.email}</div>;
}
```

### Vue 3

```typescript
// src/plugins/api.ts
import { provide, inject } from 'vue';
import { FeexSystemsApi, Configuration } from '@/generated/api';

const ApiKey = Symbol('api');

export function useFeexApi() {
  const api = inject(ApiKey) as FeexSystemsApi;
  if (!api) throw new Error('API not provided');
  return api;
}

export default {
  install(app, options) {
    const api = new FeexSystemsApi(
      new Configuration({
        basePath: options.baseUrl,
        accessToken: options.token,
      })
    );
    provide(ApiKey, api);
  },
};
```

### Python/Flask

```python
# config/api.py
from feexsystems_api import Configuration, ApiClient

def get_api_client(access_token: str):
    config = Configuration(
        host=os.environ.get('API_URL'),
        access_token=access_token
    )
    return ApiClient(config)

# routes/users.py
from flask import Blueprint, session
from config.api import get_api_client

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile')
def profile():
    api = get_api_client(session.get('access_token'))
    user = api.get_current_user()
    return {'user': user}
```

### Go/Gin

```go
package main

import (
	"github.com/your-org/feexsystems-go"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.GET("/api/profile", func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		client := feexsystems.NewClient(os.Getenv("API_URL"))
		client.SetBearerToken(token)

		user, err := client.GetCurrentUser(c)
		if err != nil {
			c.JSON(500, err)
			return
		}
		c.JSON(200, user)
	})

	r.Run()
}
```

---

## Deployment & CI/CD

### GitHub Actions - Validate Spec

```yaml
name: Validate OpenAPI

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Validate OpenAPI
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install -g swagger-cli
      - run: swagger-cli validate docs/openapi.3.0.yaml

      - name: Generate Client
        run: |
          npm install -g @openapitools/openapi-generator-cli
          openapi-generator-cli generate \
            -i docs/openapi.3.0.yaml \
            -g typescript-fetch \
            -o generated/typescript-client

      - name: Publish to npm (on release)
        if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/')
        run: |
          cd generated/typescript-client
          npm publish --access public
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pre-commit Hook

**.git/hooks/pre-commit**:

```bash
#!/bin/bash
swagger-cli validate docs/openapi.3.0.yaml
if [ $? -ne 0 ]; then
  echo "❌ OpenAPI spec validation failed"
  exit 1
fi
echo "✅ OpenAPI spec is valid"
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Docker Build with Docs

```dockerfile
FROM node:18 AS builder
WORKDIR /app

COPY docs/ ./docs/
COPY docs/openapi.3.0.yaml ./docs/

RUN npm install -g redoc-cli
RUN redoc-cli bundle ./docs/openapi.3.0.yaml -o ./docs/index.html

FROM node:18
WORKDIR /app
COPY --from=builder /app/docs /app/docs
COPY package.json .
RUN npm install
COPY . .

EXPOSE 3001
CMD ["npm", "start"]
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-docs
data:
  openapi.yaml: |
    openapi: 3.0.0
    info:
      title: FeexSystems API
      ...
```

Mount in pod:

```yaml
volumes:
  - name: api-docs
    configMap:
      name: api-docs
containers:
  - name: app
    volumeMounts:
      - name: api-docs
        mountPath: /app/docs
```

---

## Best Practices

### 1. Keep Spec in Sync

- Update OpenAPI spec when adding/modifying endpoints
- Use spec-driven development (generate from spec)
- Use contract tests to verify implementation

### 2. Version Your API

```yaml
info:
  version: 2.0.0  # Follow semantic versioning
```

### 3. Document Changes

```yaml
info:
  version: 2.1.0
  x-changelog:
    - version: 2.1.0
      date: 2026-09-14
      changes:
        - added: /api/world-model/navigator POST endpoint
        - fixed: Rate limiting headers
```

### 4. Security

- Never commit API keys to OpenAPI spec
- Use `x-security` extension for special rules
- Document authentication clearly
- Validate all inputs

### 5. Examples

Include realistic examples:

```yaml
responses:
  '200':
    content:
      application/json:
        example:
          success: true
          data:
            id: user-123
            email: user@example.com
```

---

## Troubleshooting

### Client Generation Issues

**Problem**: `swagger-cli bundle` fails
```bash
# Solution: Update swagger-cli
npm install -g swagger-cli@latest
```

**Problem**: TypeScript client has compilation errors
```bash
# Solution: Regenerate with strict mode disabled
openapi-generator-cli generate ... \
  -c=./config.json
  # In config.json: "supportsES6": false
```

### Documentation Rendering

**Problem**: Swagger UI shows blank page
```
- Check YAML syntax (use online validator)
- Verify file exists at mounted path
- Check browser console for CORS errors
```

**Problem**: Images not loading in Redoc
```
- Use absolute URLs for images
- Enable CORS if hosting externally
```

---

## Additional Resources

- **OpenAPI Spec**: https://spec.openapis.org/
- **OpenAPI Generator**: https://openapi-generator.tech/
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **Redoc**: https://redoc.ly/
- **OpenAPI Tools**: https://openapi.tools/

---

Last updated: 2026-09-14
