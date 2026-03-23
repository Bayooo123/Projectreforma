export interface BicaContext {
  platformEntity: any;
  platformEntityType: string;
  requestId: string;
}

export interface BicaResponse {
  status: 'success' | 'failed';
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}
