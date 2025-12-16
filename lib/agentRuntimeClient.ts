type AgentRunInput = {
  workspaceId: string;
  userId: string;
  agentId: string;
  message: string;
  runId?: string;
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

  let text: string | undefined;
  if (!response.ok) {
    try {
      text = await response.text();
    } catch {
      // ignore read errors
    }
    const details = text ? ` Response body: ${text}` : "";
    throw new Error(
      `Agent runtime request failed with status ${response.status} ${response.statusText}.${details}`,
    );
  }

  try {
    const json = (await response.json()) as AgentRunOutput;
    return json;
  } catch (err) {
    throw new Error(`Failed to parse agent runtime response as JSON: ${(err as Error).message}`);
  }
}


