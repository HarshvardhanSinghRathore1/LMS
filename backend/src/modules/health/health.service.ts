import { checkDatabaseHealth } from '../../config/database';

export interface HealthStatus {
  isHealthy: boolean;
  service: string;
  databaseStatus: 'connected' | 'disconnected';
  errorDetails?: string;
}

export class HealthService {
  async getHealthStatus(): Promise<HealthStatus> {
    const dbCheck = await checkDatabaseHealth();

    const isHealthy = dbCheck.isConnected;

    return {
      isHealthy,
      service: 'capacity-connect-api',
      databaseStatus: dbCheck.isConnected ? 'connected' : 'disconnected',
      ...(dbCheck.error ? { errorDetails: dbCheck.error } : {}),
    };
  }
}

export const healthService = new HealthService();
