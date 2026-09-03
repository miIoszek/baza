export interface JobApplication {
  id: string;
  jobOfferId: string;
  companyId: string;
  email: string;
  phone: string;
  /** Storage key / URL — visible only to the receiving company. */
  cvFileKey: string;
  message?: string;
  createdAt: string;
}

/** Driver apply form — no account required in MVP. */
export interface CreateJobApplicationRequest {
  email: string;
  phone: string;
  /** Client sends multipart; API stores file and keeps key private to company. */
  message?: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}
