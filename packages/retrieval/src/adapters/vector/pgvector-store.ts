import type {
  HealthStatus,
  VectorRecord,
  VectorSearchFilters,
  VectorSearchHit,
} from '../../domain/types';
import { cosineSimilarity } from '../../domain/utils';
import type { SqlExecutor, VectorStorePort } from '../../ports';

export type PgVectorStoreOptions = {
  tableName?: string;
  dimensions: number;
  /**
   * `pgvector` — usa tipo `vector` + operador `<=>`.
   * `float_array` — fallback sem extensão (cosine em app após filtro SQL).
   */
  mode?: 'pgvector' | 'float_array';
};

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Adapter PostgreSQL + pgvector (substituível).
 * Depende apenas de SqlExecutor — sem import de `pg`/`drizzle`.
 */
export class PgVectorStore implements VectorStorePort {
  private readonly table: string;
  private readonly dimensions: number;
  private readonly mode: 'pgvector' | 'float_array';

  constructor(
    private readonly sql: SqlExecutor,
    opts: PgVectorStoreOptions,
  ) {
    this.table = opts.tableName ?? 'retrieval_vectors';
    this.dimensions = opts.dimensions;
    this.mode = opts.mode ?? 'pgvector';
  }

  async ensureSchema(): Promise<void> {
    if (this.mode === 'pgvector') {
      await this.sql.query(`CREATE EXTENSION IF NOT EXISTS vector`);
      await this.sql.query(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          id text PRIMARY KEY,
          chunk_id text NOT NULL,
          embedding vector(${this.dimensions}) NOT NULL,
          text text NOT NULL,
          token_estimate integer NOT NULL DEFAULT 0,
          knowledge_document_id text,
          learning_resource_id text,
          course_id text,
          module_id text,
          lesson_id text,
          owner_company_id text,
          tenant_id text,
          language text,
          version text,
          tags text[] DEFAULT '{}',
          category text,
          page integer,
          priority integer DEFAULT 0,
          allow_ai_use boolean DEFAULT true,
          publication_status text,
          visibility text,
          status text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `);
      await this.sql.query(
        `CREATE INDEX IF NOT EXISTS ${this.table}_chunk_idx ON ${this.table} (chunk_id)`,
      );
      await this.sql.query(
        `CREATE INDEX IF NOT EXISTS ${this.table}_doc_idx ON ${this.table} (knowledge_document_id)`,
      );
      await this.sql.query(
        `CREATE INDEX IF NOT EXISTS ${this.table}_resource_idx ON ${this.table} (learning_resource_id)`,
      );
    } else {
      await this.sql.query(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          id text PRIMARY KEY,
          chunk_id text NOT NULL,
          embedding double precision[] NOT NULL,
          text text NOT NULL,
          token_estimate integer NOT NULL DEFAULT 0,
          knowledge_document_id text,
          learning_resource_id text,
          course_id text,
          module_id text,
          lesson_id text,
          owner_company_id text,
          tenant_id text,
          language text,
          version text,
          tags text[] DEFAULT '{}',
          category text,
          page integer,
          priority integer DEFAULT 0,
          allow_ai_use boolean DEFAULT true,
          publication_status text,
          visibility text,
          status text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `);
    }
  }

  private upsertSql(record: VectorRecord): { sql: string; params: unknown[] } {
    const tags = record.tags ?? [];
    const now = new Date().toISOString();
    if (this.mode === 'pgvector') {
      return {
        sql: `
          INSERT INTO ${this.table} (
            id, chunk_id, embedding, text, token_estimate,
            knowledge_document_id, learning_resource_id, course_id, module_id, lesson_id,
            owner_company_id, tenant_id, language, version, tags, category, page, priority,
            allow_ai_use, publication_status, visibility, status, created_at, updated_at
          ) VALUES (
            $1,$2,$3::vector,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
          )
          ON CONFLICT (id) DO UPDATE SET
            chunk_id = EXCLUDED.chunk_id,
            embedding = EXCLUDED.embedding,
            text = EXCLUDED.text,
            token_estimate = EXCLUDED.token_estimate,
            knowledge_document_id = EXCLUDED.knowledge_document_id,
            learning_resource_id = EXCLUDED.learning_resource_id,
            course_id = EXCLUDED.course_id,
            module_id = EXCLUDED.module_id,
            lesson_id = EXCLUDED.lesson_id,
            owner_company_id = EXCLUDED.owner_company_id,
            tenant_id = EXCLUDED.tenant_id,
            language = EXCLUDED.language,
            version = EXCLUDED.version,
            tags = EXCLUDED.tags,
            category = EXCLUDED.category,
            page = EXCLUDED.page,
            priority = EXCLUDED.priority,
            allow_ai_use = EXCLUDED.allow_ai_use,
            publication_status = EXCLUDED.publication_status,
            visibility = EXCLUDED.visibility,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
        params: [
          record.id,
          record.chunkId,
          toVectorLiteral(record.embedding),
          record.text,
          record.tokenEstimate,
          record.knowledgeDocumentId ?? null,
          record.learningResourceId ?? null,
          record.courseId ?? null,
          record.moduleId ?? null,
          record.lessonId ?? null,
          record.ownerCompanyId ?? null,
          record.tenantId ?? null,
          record.language ?? null,
          record.version ?? null,
          tags,
          record.category ?? null,
          record.page ?? null,
          record.priority ?? 0,
          record.allowAiUse ?? true,
          record.publicationStatus ?? null,
          record.visibility ?? null,
          record.status ?? null,
          record.createdAt ?? now,
          record.updatedAt ?? now,
        ],
      };
    }

    return {
      sql: `
        INSERT INTO ${this.table} (
          id, chunk_id, embedding, text, token_estimate,
          knowledge_document_id, learning_resource_id, course_id, module_id, lesson_id,
          owner_company_id, tenant_id, language, version, tags, category, page, priority,
          allow_ai_use, publication_status, visibility, status, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        )
        ON CONFLICT (id) DO UPDATE SET
          chunk_id = EXCLUDED.chunk_id,
          embedding = EXCLUDED.embedding,
          text = EXCLUDED.text,
          token_estimate = EXCLUDED.token_estimate,
          knowledge_document_id = EXCLUDED.knowledge_document_id,
          learning_resource_id = EXCLUDED.learning_resource_id,
          course_id = EXCLUDED.course_id,
          module_id = EXCLUDED.module_id,
          lesson_id = EXCLUDED.lesson_id,
          owner_company_id = EXCLUDED.owner_company_id,
          tenant_id = EXCLUDED.tenant_id,
          language = EXCLUDED.language,
          version = EXCLUDED.version,
          tags = EXCLUDED.tags,
          category = EXCLUDED.category,
          page = EXCLUDED.page,
          priority = EXCLUDED.priority,
          allow_ai_use = EXCLUDED.allow_ai_use,
          publication_status = EXCLUDED.publication_status,
          visibility = EXCLUDED.visibility,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `,
      params: [
        record.id,
        record.chunkId,
        record.embedding,
        record.text,
        record.tokenEstimate,
        record.knowledgeDocumentId ?? null,
        record.learningResourceId ?? null,
        record.courseId ?? null,
        record.moduleId ?? null,
        record.lessonId ?? null,
        record.ownerCompanyId ?? null,
        record.tenantId ?? null,
        record.language ?? null,
        record.version ?? null,
        tags,
        record.category ?? null,
        record.page ?? null,
        record.priority ?? 0,
        record.allowAiUse ?? true,
        record.publicationStatus ?? null,
        record.visibility ?? null,
        record.status ?? null,
        record.createdAt ?? now,
        record.updatedAt ?? now,
      ],
    };
  }

  async insert(record: VectorRecord): Promise<void> {
    const q = this.upsertSql(record);
    await this.sql.query(q.sql, q.params);
  }

  async update(record: VectorRecord): Promise<void> {
    await this.insert(record);
  }

  async delete(id: string): Promise<void> {
    await this.sql.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
  }

  async deleteDocument(documentId: string): Promise<number> {
    const res = await this.sql.query(
      `DELETE FROM ${this.table} WHERE knowledge_document_id = $1 RETURNING id`,
      [documentId],
    );
    return res.rows.length;
  }

  async deleteResource(resourceId: string): Promise<number> {
    const res = await this.sql.query(
      `DELETE FROM ${this.table} WHERE learning_resource_id = $1 RETURNING id`,
      [resourceId],
    );
    return res.rows.length;
  }

  private buildWhere(
    filters: VectorSearchFilters,
    startIndex = 1,
  ): { clause: string; params: unknown[] } {
    const parts: string[] = [];
    const params: unknown[] = [];
    let i = startIndex;

    const add = (col: string, value: unknown) => {
      parts.push(`${col} = $${i++}`);
      params.push(value);
    };

    if (filters.tenantId) add('tenant_id', filters.tenantId);
    if (filters.ownerCompanyId) add('owner_company_id', filters.ownerCompanyId);
    if (filters.courseId) add('course_id', filters.courseId);
    if (filters.lessonId) add('lesson_id', filters.lessonId);
    if (filters.moduleId) add('module_id', filters.moduleId);
    if (filters.language) add('language', filters.language);
    if (filters.publicationStatus) add('publication_status', filters.publicationStatus);
    if (filters.visibility) add('visibility', filters.visibility);
    if (filters.status) add('status', filters.status);
    if (filters.allowAiUse === true) {
      parts.push(`(allow_ai_use IS DISTINCT FROM false)`);
    }
    if (filters.tags?.length) {
      parts.push(`tags @> $${i++}`);
      params.push(filters.tags);
    }

    return {
      clause: parts.length ? `WHERE ${parts.join(' AND ')}` : '',
      params,
    };
  }

  private rowToRecord(row: Record<string, unknown>): VectorRecord {
    let embedding: number[] = [];
    const raw = row.embedding;
    if (Array.isArray(raw)) {
      embedding = raw.map(Number);
    } else if (typeof raw === 'string') {
      embedding = raw
        .replace(/^\[|\]$/g, '')
        .split(',')
        .filter(Boolean)
        .map(Number);
    }

    return {
      id: String(row.id),
      chunkId: String(row.chunk_id),
      embedding,
      text: String(row.text ?? ''),
      tokenEstimate: Number(row.token_estimate ?? 0),
      knowledgeDocumentId: row.knowledge_document_id ? String(row.knowledge_document_id) : null,
      learningResourceId: row.learning_resource_id ? String(row.learning_resource_id) : null,
      courseId: row.course_id ? String(row.course_id) : null,
      moduleId: row.module_id ? String(row.module_id) : null,
      lessonId: row.lesson_id ? String(row.lesson_id) : null,
      ownerCompanyId: row.owner_company_id ? String(row.owner_company_id) : null,
      tenantId: row.tenant_id ? String(row.tenant_id) : null,
      language: row.language ? String(row.language) : null,
      version: row.version ? String(row.version) : null,
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      category: row.category ? String(row.category) : null,
      page: row.page == null ? null : Number(row.page),
      priority: Number(row.priority ?? 0),
      allowAiUse: row.allow_ai_use !== false,
      publicationStatus: row.publication_status ? String(row.publication_status) : null,
      visibility: row.visibility ? String(row.visibility) : null,
      status: row.status ? String(row.status) : null,
      createdAt: row.created_at ? String(row.created_at) : undefined,
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    };
  }

  async search(
    embedding: number[],
    filters: VectorSearchFilters,
    limit: number,
  ): Promise<VectorSearchHit[]> {
    if (this.mode === 'pgvector') {
      const where = this.buildWhere(filters, 3);
      const sql = `
        SELECT *, 1 - (embedding <=> $1::vector) AS similarity
        FROM ${this.table}
        ${where.clause}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;
      const res = await this.sql.query(sql, [
        toVectorLiteral(embedding),
        limit,
        ...where.params,
      ]);
      return res.rows.map((row) => ({
        record: this.rowToRecord(row),
        similarity: Math.max(0, Math.min(1, Number(row.similarity ?? 0))),
      }));
    }

    const where = this.buildWhere(filters, 1);
    const res = await this.sql.query(
      `SELECT * FROM ${this.table} ${where.clause}`,
      where.params,
    );
    const hits = res.rows.map((row) => {
      const record = this.rowToRecord(row);
      return {
        record,
        similarity: cosineSimilarity(embedding, record.embedding),
      };
    });
    hits.sort((a, b) => b.similarity - a.similarity);
    return hits.slice(0, limit);
  }

  async health(): Promise<HealthStatus> {
    try {
      const res = await this.sql.query(`SELECT COUNT(*)::int AS c FROM ${this.table}`);
      const count = Number(res.rows[0]?.c ?? 0);
      return { ok: true, detail: `${this.mode} vectors=${count}` };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : 'vector store unhealthy',
      };
    }
  }
}
