type N8nWebhookOptions = {
  webhookPath: string;
  payload: unknown;
};

type N8nWebhookResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
  status?: number;
  statusText?: string;
};

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Calls an n8n webhook endpoint
 * @param options - Webhook path and payload
 * @returns Response with success status and data or error details
 */
export async function callN8nWebhook({
  webhookPath,
  payload,
}: N8nWebhookOptions): Promise<N8nWebhookResponse> {
  const baseUrl = process.env.N8N_BASE_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!baseUrl) {
    return {
      success: false,
      error: "N8N_BASE_URL is not set. Please configure it in your environment.",
    };
  }

  if (!webhookSecret) {
    return {
      success: false,
      error: "N8N_WEBHOOK_SECRET is not set. Please configure it in your environment.",
    };
  }

  // Normalize webhook path (ensure it starts with /)
  const normalizedPath = webhookPath.startsWith("/") ? webhookPath : `/${webhookPath}`;
  const url = `${baseUrl.replace(/\/+$/, "")}${normalizedPath}`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bureauai-webhook-secret": webhookSecret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: `Request to n8n webhook timed out after ${DEFAULT_TIMEOUT_MS}ms`,
      };
    }

    return {
      success: false,
      error: `Failed to reach n8n webhook at ${url}: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  if (!response.ok) {
    let responseBody: string | undefined;
    try {
      responseBody = await response.text();
    } catch {
      // Ignore read errors
    }

    return {
      success: false,
      error: `n8n webhook returned error status ${response.status} ${response.statusText}`,
      status: response.status,
      statusText: response.statusText,
      data: responseBody,
    };
  }

  try {
    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (err) {
    // If response is not JSON, return as text
    const text = await response.text();
    return {
      success: true,
      data: text,
    };
  }
}

