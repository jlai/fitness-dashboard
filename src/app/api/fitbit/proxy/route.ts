import { NextRequest, NextResponse } from "next/server";

const FITBIT_API_BASE_URL = "https://api.fitbit.com";
const DEBUG = process.env.DEBUG === "true";
const PATH_REGEX = /^\/[0-9]+(?:\.[0-9]+)?\/user\/-\/.+\.(json|tcx)$/;

export async function GET(request: NextRequest) {
  return handleRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleRequest(request, "POST");
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, "PUT");
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, "DELETE");
}

/**
 * Validates that the path is a valid Fitbit API path format
 * @param path - The path to validate
 * @returns true if the path is valid, false otherwise
 */
function validatePath(path: string): boolean {
  return path.startsWith("/") && !path.includes("..") && PATH_REGEX.test(path);
}

async function handleRequest(request: NextRequest, method: string) {
  const startTime = Date.now();

  try {
    // Get the path from the URL query parameter
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    // Log request details (sanitized) - only in debug mode
    if (DEBUG) {
      console.log("=== FITBIT API PROXY REQUEST ===");
      console.log("Method:", method);
      console.log("Path:", path);
      console.log("==============================");
    }

    if (!path) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    // Validate path format and prevent security issues
    // Valid format: /{version}/user/-/{endpoint}/{resource}.{ext}
    // Examples: /1/user/-/profile.json, /1.2/user/-/sleep/date/2026-03-30.json, /1/user/-/activities/{log-id}.tcx
    // Tested passing against all Fitbit API paths from swagger file in docs/fitbit-web-api-swagger.json
    if (!validatePath(path)) {
      return NextResponse.json(
        { error: "Invalid path: must be a valid Fitbit API path" },
        { status: 400 }
      );
    }

    // Build the Fitbit API URL and forward query parameters
    const fitbitUrl = new URL(`${FITBIT_API_BASE_URL}${path}`);
    searchParams.forEach((value, key) => {
      if (key !== "path") {
        fitbitUrl.searchParams.set(key, value);
      }
    });

    // Get authorization header from the request
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    // Prepare headers for the Fitbit API request
    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Accept-Language": "metric",
    };

    // Preserve Content-Type from original request if present
    const contentTypeHeader = request.headers.get("content-type");
    if (contentTypeHeader) {
      headers["Content-Type"] = contentTypeHeader;
    }

    // Get request body for POST/PUT requests
    let body: string | undefined;
    if (method === "POST" || method === "PUT") {
      try {
        body = await request.text();
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to read request body" },
          { status: 400 }
        );
      }
    }

    // Make the request to Fitbit API
    const response = await fetch(fitbitUrl, {
      method,
      headers,
      body,
    });

    // Handle the response
    const responseHeaders = new Headers();

    // Copy relevant headers from Fitbit response
    const allowedHeaders = [
      "content-type",
      "cache-control",
      "expires",
      "last-modified",
    ];
    response.headers.forEach((value, key) => {
      if (allowedHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Get response body
    let responseData;
    const contentType = response.headers.get("content-type");

    try {
      if (contentType?.includes("application/json")) {
        const jsonText = await response.text();
        responseData = jsonText; // Return as text, let frontend parse
      } else if (
        contentType?.includes("text/") ||
        contentType?.includes("application/xml")
      ) {
        responseData = await response.text();
      } else {
        responseData = await response.arrayBuffer();
      }
    } catch (error: any) {
      console.error("Error parsing response:", error);
      console.error("Response status:", response.status);
      console.error("Content-Type:", contentType);

      // If JSON parsing fails, try to get text response
      try {
        const text = await response.text();
        console.error("Raw response text:", text);
        responseData = text;
      } catch (textError: any) {
        console.error("Error getting text response:", textError);
        responseData = "Error reading response";
      }
    }

    // Set proper content-type header
    if (contentType?.includes("application/json")) {
      responseHeaders.set("content-type", "application/json");
    }

    // Log response details (sanitized) - only in debug mode
    const duration = Date.now() - startTime;
    if (DEBUG) {
      console.log("=== FITBIT API PROXY RESPONSE ===");
      console.log("Status:", response.status);
      console.log("Content-Type:", contentType);
      console.log("Duration:", `${duration}ms`);
      console.log("================================");
    }

    // Return the response with proper status and headers
    return new NextResponse(responseData, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Fitbit API proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
