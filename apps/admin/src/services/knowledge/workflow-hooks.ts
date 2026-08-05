import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload';
import { APIError } from 'payload';

import {
  assertTransition,
  canTransition,
  requiresHumanReview,
  type KnowledgeStatus,
  type SecurityClassification,
  type TechnicalRiskLevel,
  KNOWLEDGE_STATUSES,
} from '@omnia/neurofrigo-knowledge';

import { isKnowledgePublisher, isTechnicalReviewer } from '../../access/knowledge';
import { isEditor, getUserRole } from '../../access/rbac';
import { writeKnowledgeAudit } from './audit';

function isKnowledgeStatus(value: unknown): value is KnowledgeStatus {
  return typeof value === 'string' && (KNOWLEDGE_STATUSES as readonly string[]).includes(value);
}

function resolveTenantId(doc: Record<string, unknown> | null | undefined): string | null {
  if (!doc) return null;
  const owner = doc.ownerCompany;
  if (owner == null) return null;
  if (typeof owner === 'object' && owner !== null && 'id' in owner) {
    return String((owner as { id: unknown }).id);
  }
  return String(owner);
}

function pickAuditSnapshot(doc: Record<string, unknown> | null | undefined) {
  if (!doc) return null;
  const tenant = resolveTenantId(doc);
  return {
    id: doc.id ?? null,
    status: doc.status ?? null,
    publicationStatus: doc.publicationStatus ?? null,
    processingStatus: doc.processingStatus ?? null,
    securityClassification: doc.securityClassification ?? null,
    versionNumber: doc.versionNumber ?? null,
    allowAiUse: doc.allowAiUse ?? null,
    humanReviewRequired: doc.humanReviewRequired ?? null,
    technicalRiskLevel: doc.technicalRiskLevel ?? null,
    ownerCompany: doc.ownerCompany ?? null,
    tenant,
  };
}

function auditReason(parts: Record<string, string | null | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
}

/**
 * beforeChange do knowledge-documents:
 * - valida transições via canTransition/assertTransition
 * - preenche createdBy/updatedBy
 * - audita mudanças de status / ACL / classificação (update)
 * - create/delete audit ficam em afterChange / afterDelete (entityId disponível)
 * - NUNCA chama embeddings / providers
 */
export const knowledgeDocumentBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) {
    return data;
  }

  const userId = req.user?.id ?? null;

  if (operation === 'create') {
    if (!data.status) {
      data.status = 'draft';
    }
    if (userId != null) {
      data.createdBy = userId;
      data.updatedBy = userId;
    }
  }

  if (operation === 'update' && userId != null) {
    data.updatedBy = userId;
  }

  const fromRaw = originalDoc?.status ?? 'draft';
  const toRaw = data.status ?? fromRaw;

  if (isKnowledgeStatus(fromRaw) && isKnowledgeStatus(toRaw) && fromRaw !== toRaw) {
    if (!canTransition(fromRaw, toRaw)) {
      try {
        assertTransition(fromRaw, toRaw);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transição inválida.';
        throw new APIError(message, 400);
      }
    }

    if (isEditor(req.user) && !isKnowledgePublisher(req.user) && !isTechnicalReviewer(req.user)) {
      if (fromRaw !== 'draft' || (toRaw !== 'draft' && toRaw !== 'in_review')) {
        throw new APIError('Editor só pode manter rascunho ou enviar para revisão.', 403);
      }
    }

    if (
      (toRaw === 'approved' || toRaw === 'published') &&
      !isKnowledgePublisher(req.user)
    ) {
      throw new APIError('Somente papéis autorizados podem aprovar ou publicar.', 403);
    }

    if (toRaw === 'approved' || toRaw === 'published') {
      const merged = {
        ...(originalDoc as Record<string, unknown> | undefined),
        ...data,
      };
      const reviewNeeded = requiresHumanReview({
        technicalRiskLevel: merged.technicalRiskLevel as TechnicalRiskLevel | null | undefined,
        humanReviewRequired: merged.humanReviewRequired as boolean | null | undefined,
        securityClassification: merged.securityClassification as
          | SecurityClassification
          | null
          | undefined,
      });
      if (reviewNeeded) {
        if (toRaw === 'approved' && fromRaw !== 'in_review') {
          throw new APIError(
            'Documento exige revisão humana: só pode ser aprovado a partir de in_review.',
            403,
          );
        }
        if (toRaw === 'published' && fromRaw !== 'approved' && fromRaw !== 'indexed') {
          throw new APIError(
            'Documento exige revisão humana: só pode ser publicado a partir de approved ou indexed.',
            403,
          );
        }
      }
    }

    if (toRaw === 'published') {
      data.publicationStatus = 'published';
      if (!data.publishedAt && !originalDoc?.publishedAt) {
        data.publishedAt = new Date().toISOString();
      }
    }

    if (toRaw === 'archived') {
      data.publicationStatus = 'archived';
      if (!data.archivedAt) {
        data.archivedAt = new Date().toISOString();
      }
    }

    await writeKnowledgeAudit(
      req.payload,
      {
        action: `knowledge.status.${fromRaw}_to_${toRaw}`,
        entityType: 'knowledge-documents',
        entityId: originalDoc?.id ?? null,
        previousState: pickAuditSnapshot(originalDoc as Record<string, unknown> | undefined),
        nextState: pickAuditSnapshot({ ...(originalDoc as object), ...data } as Record<
          string,
          unknown
        >),
        reason: auditReason({
          operation: `status.${fromRaw}_to_${toRaw}`,
          tenant: resolveTenantId({ ...(originalDoc as object), ...data } as Record<string, unknown>),
          note: typeof data.revisionNotes === 'string' ? data.revisionNotes : null,
        }),
      },
      req,
    );
  }

  if (operation === 'update' && originalDoc) {
    const aclKeys = [
      'securityClassification',
      'allowedRoles',
      'allowedAgents',
      'allowedCompanies',
      'allowedCourses',
      'allowAiUse',
      'requiresEnrollment',
    ] as const;

    const changed = aclKeys.some((key) => {
      if (!(key in data)) return false;
      return JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key]);
    });

    if (changed) {
      await writeKnowledgeAudit(
        req.payload,
        {
          action: 'knowledge.acl_or_classification.updated',
          entityType: 'knowledge-documents',
          entityId: originalDoc.id,
          previousState: pickAuditSnapshot(originalDoc as Record<string, unknown>),
          nextState: pickAuditSnapshot({ ...(originalDoc as object), ...data } as Record<
            string,
            unknown
          >),
          reason: auditReason({
            operation: 'update',
            tenant: resolveTenantId({ ...(originalDoc as object), ...data } as Record<string, unknown>),
          }),
        },
        req,
      );
    }
  }

  return data;
};

/**
 * afterChange: create audit com entityId persistido (id já existe).
 */
export const knowledgeDocumentAfterChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create' || !doc) {
    return doc;
  }

  const docRecord = doc as Record<string, unknown>;
  await writeKnowledgeAudit(
    req.payload,
    {
      action: 'knowledge.document.created',
      entityType: 'knowledge-documents',
      entityId: doc.id,
      nextState: pickAuditSnapshot(docRecord),
      reason: auditReason({
        operation: 'create',
        tenant: resolveTenantId(docRecord),
        role: getUserRole(req.user) ?? String(req.user?.role ?? 'anonymous'),
      }),
    },
    req,
  );

  return doc;
};

/**
 * afterDelete: auditoria de exclusão com entityId + snapshot sanitizado.
 */
export const knowledgeDocumentAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  if (!doc) {
    return;
  }

  const docRecord = doc as Record<string, unknown>;
  await writeKnowledgeAudit(
    req.payload,
    {
      action: 'knowledge.document.deleted',
      entityType: 'knowledge-documents',
      entityId: doc.id,
      previousState: pickAuditSnapshot(docRecord),
      reason: auditReason({
        operation: 'delete',
        tenant: resolveTenantId(docRecord),
        role: getUserRole(req.user) ?? String(req.user?.role ?? 'anonymous'),
      }),
    },
    req,
  );
};
