import Flagship, {
  BucketingDTO,
  DecisionMode,
  EventCategory,
  HitType,
  LogLevel,
} from "@flagship.io/js-sdk/dist/edge.js";
import { after } from "next/server";
import { get } from "@vercel/edge-config";

export const runtime = "edge";

/**
 * ================================================
 * FLAGSHIP SDK INITIALIZATION AND VISITOR CREATION
 * ================================================
 *
 * @param request - The incoming request object containing headers and query parameters.
 * @returns
 */
async function initFlagship(request: Request) {
  // Access Flagship credentials from environment variables
  const { FLAGSHIP_ENV_ID, FLAGSHIP_API_KEY } = process.env;

  // Retrieve cached bucketing data from edge config (improves performance)
  const initialBucketing = await get("initialBucketing");

  // Initialize Flagship SDK with credentials and configuration
  await Flagship.start(FLAGSHIP_ENV_ID as string, FLAGSHIP_API_KEY as string, {
    // Use edge bucketing mode for optimal performance in serverless environments
    decisionMode: DecisionMode.BUCKETING_EDGE,
    // Pass cached bucketing data
    initialBucketing: initialBucketing as BucketingDTO,
    // Defer fetching campaign data until explicitly needed
    fetchNow: false,
    logLevel: LogLevel.DEBUG,
  });

  const { searchParams } = new URL(request.url);

  // Get visitor ID from query params or let SDK generate one
  const visitorId = (searchParams.get("visitorId") as string) || undefined;

  // Create a visitor with context data extracted from request headers
  // This context can be used for targeting rules in Flagship campaigns
  const visitor = Flagship.newVisitor({
    visitorId,
    // Set GDPR consent status for data collection
    hasConsented: true,
    context: {
      userAgent: request.headers.get("user-agent") || "unknown",
      path: request.url,
      referrer: request.headers.get("referer") || "unknown",
    },
  });

  // Fetch feature flags assigned to this visitor
  await visitor.fetchFlags();

  return visitor;
}

/**
 * ===================================
 * MAIN API HANDLER
 * ===================================
 */
export async function GET(request: Request) {
  // Initialize Flagship SDK and create a visitor
  const visitor = await initFlagship(request);

  // Retrieve specific flag values with default fallbacks if flags aren't defined
  const welcomeMessage = visitor
    .getFlag("welcome_message")
    .getValue("Welcome to our site!'");
  const isFeatureEnabled = visitor
    .getFlag("new_feature_enabled")
    .getValue(false);

  // Send analytics data back to Flagship for campaign reporting
  visitor.sendHits([
    {
      type: HitType.PAGE_VIEW,
      documentLocation: request.url,
    },
    {
      type: HitType.EVENT,
      category: EventCategory.ACTION_TRACKING,
      action: "feature_view",
      label: "new_feature",
      value: isFeatureEnabled ? 1 : 0,
    },
  ]);

  // Ensure analytics are sent before the worker terminates
  after(async () => {
    await Flagship.close();
  });

  return Response.json({
    message: welcomeMessage,
    features: {
      newFeatureEnabled: isFeatureEnabled,
    },
  });
}
