export type FeedbackSuccess = {
  ok: true;
  newProfileVersion: number;
};

export type FeedbackError = {
  ok: false;
  code: string;
  message: string;
  action?: string;
};

export type FeedbackResponse = FeedbackSuccess | FeedbackError;

export async function submitFeedback(args: {
  outputId: string;
  rating: number;
  notes?: string;
}): Promise<FeedbackSuccess> {
  const res = await fetch("/api/output/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      outputId: args.outputId,
      rating: args.rating,
      notes: args.notes ?? null,
    }),
  });

  const data: FeedbackResponse = await res.json();

  if (!res.ok || !data.ok) {
    const err = data as FeedbackError;
    throw {
      code: err.code ?? "UNKNOWN_ERROR",
      message:
        err.message ??
        "Er is een onbekende fout opgetreden bij het opslaan van feedback.",
      action: err.action,
    };
  }

  return data;
}


