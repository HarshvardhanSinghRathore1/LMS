import { PoolClient } from 'pg';
import { DomainEvent } from './event.types';
import { notificationsService } from '../modules/notifications/notifications.service';
import { auditService } from '../modules/audit/audit.service';

export class EventDispatcher {
  async dispatch(event: DomainEvent): Promise<void> {
    try {
      await Promise.all([
        notificationsService.handleDomainEvent(event),
        auditService.handleDomainEvent(event),
      ]);
    } catch (err) {
      console.error('Error dispatching domain event:', err);
    }
  }

  async dispatchTransactional(event: DomainEvent, client: PoolClient): Promise<void> {
    // Both notification and audit must execute within the supplied transaction client
    await notificationsService.handleDomainEvent(event, client);
    await auditService.handleDomainEvent(event, client);
  }
}

export const eventDispatcher = new EventDispatcher();
