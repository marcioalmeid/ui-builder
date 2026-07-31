export interface JobSubmission {
  id: string;
  templateId: string;
  templateVersion?: number;
  templateName?: string;
  data: Record<string, unknown>;
  submittedAt: number;
}
