type AgentRunInput = {
  workspaceId: string;
  userId: string;
  agentId: string;
  message: string;
  runId?: string;
  organizationId: string;
  projectId?: string | null;
  useGlobalLibrary?: boolean;
};

type AgentRunOutput = {
  reply: string;
  answer_from_sources: any[];
  additional_reasoning: any[];
  missing_info_questions: string[];
};

export async function runAgentRuntime(payload: AgentRunInput): Promise<AgentRunOutput> {
  const baseUrl = process.env.AGENT_RUNTIME_URL;
  const secret = process.env.AGENT_RUNTIME_SECRET;

  if (!baseUrl) {
    throw new Error("AGENT_RUNTIME_URL is not set. Please configure it in your environment.");
  }

  if (!secret) {
    throw new Error("AGENT_RUNTIME_SECRET is not set. Please configure it in your environment.");
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/v1/agents/run`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-runtime-secret": secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(`Failed to reach agent runtime at ${url}: ${(err as Error).message}`);
  }

  if (!response.ok) {
    let responseBody: string | undefined;
    try {
      responseBody = await response.text();
    } catch {
      // ignore read errors
    }

    const errorPayload: {
      httpStatus: number;
      statusText: string;
      responseBody?: string;
    } = {
      httpStatus: response.status,
      statusText: response.statusText,
    };

    if (responseBody !== undefined) {
      errorPayload.responseBody = responseBody;
    }

    // Throw a JSON-stringified error so the API route can surface real details
    throw new Error(JSON.stringify(errorPayload));
  }

  try {
    const json = (await response.json()) as AgentRunOutput;
    return json;
  } catch (err) {
    throw new Error(`Failed to parse agent runtime response as JSON: ${(err as Error).message}`);
  }
}


