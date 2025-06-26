This project demonstrates how to integrate [Flagship](https://www.flagship.io/) feature flags with [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions), enabling feature flagging and A/B testing at the edge.

## Overview

This example shows how to:

- Initialize the Flagship SDK in a Vercel Edge Function
- Use Edge Config for caching bucketing data to improve performance
- Extract visitor context from request headers
- Fetch and apply feature flags for each visitor
- Send analytics data back to Flagship

## How It Works

The Edge Function performs the following operations:

1. Retrieves Flagship credentials from environment variables
2. Loads cached bucketing data from Vercel Edge Config
3. Initializes the Flagship SDK in edge bucketing mode
4. Creates a visitor with context data from request headers
5. Fetches feature flags for the visitor
6. Flushes analytics data back to Flagship
7. Returns flag values in a JSON response

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/) (v4 or later)
- A [Vercel account](https://vercel.com/signup)
- A [Flagship account](https://app.flagship.io/login) with API credentials

## Setup

1. Clone this repository:

```bash
git clone https://github.com/flagship-io/flagship-vercel-edge-function-example.git
cd flagship-vercel-edge-function-example
```

2. Install dependencies:

```bash
yarn install
```

3. Configure your Flagship credentials as environment variables:

Create or update .env.local file:

```
FLAGSHIP_ENV_ID=your_env_id
FLAGSHIP_API_KEY=your_api_key
```

4. Create an Edge Config in the Vercel dashboard and add it to your project

```bash
npx vercel link
npx vercel env pull .env.local
```

## Use Edge Config or direct integration for bucketing data

Bucketing data contains information about your Flagship campaigns and variations, allowing the Edge Function to make flag decisions without calling the Flagship API for every request.

### Development Approach

#### Option 1: Edge Config Storage (Recommended)

1. Fetch bucketing data directly from the Flagship CDN:

```bash
# Replace YOUR_ENV_ID with your Flagship Environment ID
curl -s https://cdn.flagship.io/YOUR_ENV_ID/bucketing.json > bucketing-data.json
```

2. Upload the bucketing data to your Vercel Edge Config:

Adding the bucketing to Edge config can be done using the Vercel [dashboard](https://vercel.com/docs/edge-config/edge-config-dashboard) or via the Vercel API.

Here’s how to do it via the API:

```bash
# Using Vercel API to upload the bucketing data
curl -X PATCH "https://api.vercel.com/v1/edge-config/ecfg_YOUR_EDGE_CONFIG_ID/items" \
  -H "Authorization: Bearer YOUR_VERCEL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "operation": "create",
        "key": "initialBucketing",
        "value": '"$(cat bucketing-data.json | jq -c .)"'
      }
    ]
  }'
```

3. Access this data in your code (already implemented):

```typescript
import { get } from "@vercel/edge-config";
const initialBucketing = await get("initialBucketing");
```

#### Option 2: Direct Integration

For direct integration, you can:

1. Fetch the bucketing data during your build process
2. Save it as a JSON file in your project
3. Import it directly in your Edge Function

```bash
# During build/deployment:
curl -s https://cdn.flagship.io/YOUR_ENV_ID/bucketing.json > src/bucketing-data.json
```

Then modify your code to import the file directly:

```typescript
import bucketingData from './bucketing-data.json';

async function initFlagship(request: Request) {
  // ...existing code...
  
  // Use the imported bucketing data instead of Edge Config
  await Flagship.start(FLAGSHIP_ENV_ID as string, FLAGSHIP_API_KEY as string, {
    decisionMode: DecisionMode.BUCKETING_EDGE,
    initialBucketing: bucketingData as BucketingDTO,
    fetchNow: false,
    logLevel: LogLevel.DEBUG,
  });
  
  // ...existing code...
}
```

### Production Approach

For production environments, there are two recommended approaches. Both require setting up webhooks in the Flagship platform that trigger your CI/CD pipeline when campaigns are updated.
Find more details in the [Flagship documentation](https://docs.developers.flagship.io/docs/flagship-cloudflare-worker-integration#/production-approach-to-retrieve-and-update-bucketing-data).


## Development

Start a local development server:

```bash
yarn dev
```

Test your Edge Function:

```bash
curl http://localhost:3000/api/hello
```

With a visitor ID:

```bash
curl http://localhost:3000/api/hello?visitorId=user123
```

## Deployment

Deploy to Vercel:

```bash
yarn build
vercel deploy --prod
```

## Code Explanation

The key file in this example is route.ts, which implements the Edge Function. It:

1. Specifies `edge` runtime for Next.js
2. Initializes Flagship SDK with credentials and cached bucketing data
3. Creates a visitor with context from request headers
4. Fetches and returns feature flags

## Learn More

- [Flagship Documentation](https://docs.developers.flagship.io/)
- [Vercel Edge Functions Documentation](https://vercel.com/docs/functions/edge-functions)
- [Vercel Edge Config Documentation](https://vercel.com/docs/storage/edge-config)
