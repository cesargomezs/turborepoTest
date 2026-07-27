import { db } from "../../../../packages/db/src";
import { auditLogs } from "../../../../packages/db/src/schema";

interface AuditParams {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
  metadata?: any;
}

/**
 * Registra un evento de auditoría de forma asíncrona sin bloquear el hilo principal.
 */
export const logAuditEvent = (params: AuditParams) => {
  // Lo ejecutamos sin "await" para que se guarde en segundo plano 
  // y no haga más lenta la petición del usuario original.
  db.insert(auditLogs).values({
    userId: params.userId || null,
    action: params.action,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    ipAddress: params.ipAddress || null,
    metadata: params.metadata || null,
  }).catch(error => {
    console.error("🚨 [ERROR CRÍTICO DE AUDITORÍA]: No se pudo guardar el log de", params.action, error);
  });
};