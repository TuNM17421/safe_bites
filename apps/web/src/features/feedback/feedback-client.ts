import {
  FeedbackReportResponseSchema,
  type FeedbackReportInput,
  type FeedbackReportResponse,
} from '@safebite/domain';

export class FeedbackSubmitError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'FeedbackSubmitError';
  }
}

export async function submitFeedback(
  payload: FeedbackReportInput,
): Promise<FeedbackReportResponse> {
  const res = await fetch('/api/v1/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 400) {
    throw new FeedbackSubmitError(400, 'validation');
  }
  if (!res.ok) {
    throw new FeedbackSubmitError(res.status, 'failed');
  }

  const json = (await res.json()) as { data: unknown };
  return FeedbackReportResponseSchema.parse(json.data);
}
