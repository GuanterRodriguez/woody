import { getDatabase } from "./database.service";
import { WoodyError } from "@/types/errors";

export type EntityType = "dossier" | "fabric_encours" | "imported_doc";

/**
 * Mark a specific entity as seen by the user
 */
export async function markEntitySeen(
  entityType: EntityType,
  entityId: string,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    await db.execute(
      `INSERT INTO user_activity (id, entity_type, entity_id, last_seen_at, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(entity_type, entity_id)
       DO UPDATE SET last_seen_at = $6`,
      [
        `${entityType}_${entityId}`,
        entityType,
        entityId,
        now,
        now,
        now,
      ],
    );
  } catch (error) {
    throw new WoodyError(
      "Impossible de marquer l'entite comme vue",
      "USER_ACTIVITY_MARK_FAILED",
      error,
    );
  }
}

/**
 * Mark all entities of a specific type as seen (batch operation)
 */
export async function markAllEntitiesSeen(
  entityType: EntityType,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Get all entity IDs based on type
    let entityIds: string[] = [];

    if (entityType === "fabric_encours") {
      const rows = await db.select<Array<{ id: number }>>(
        "SELECT id FROM fabric_cv_encours",
      );
      entityIds = rows.map((r) => r.id.toString());
    } else if (entityType === "dossier") {
      const rows = await db.select<Array<{ id: string }>>(
        "SELECT id FROM cdv_sessions",
      );
      entityIds = rows.map((r) => r.id);
    }
    // imported_doc is not persisted in DB, skip for now

    // Batch insert/update
    for (const entityId of entityIds) {
      await db.execute(
        `INSERT INTO user_activity (id, entity_type, entity_id, last_seen_at, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(entity_type, entity_id)
         DO UPDATE SET last_seen_at = $6`,
        [`${entityType}_${entityId}`, entityType, entityId, now, now, now],
      );
    }
  } catch (error) {
    throw new WoodyError(
      "Impossible de marquer toutes les entites comme vues",
      "USER_ACTIVITY_MARK_ALL_FAILED",
      error,
    );
  }
}

/**
 * Get count of unseen entities with optional filter
 */
export async function getUnseenCount(
  entityType: EntityType,
  filterFn?: (row: Record<string, unknown>) => boolean,
): Promise<number> {
  const db = await getDatabase();

  try {
    let query = "";

    if (entityType === "dossier") {
      query = `
        SELECT s.id, s.statut, s.fabric_matched, a.last_seen_at
        FROM cdv_sessions s
        LEFT JOIN user_activity a
          ON a.entity_type = 'dossier' AND a.entity_id = s.id
      `;
    } else if (entityType === "fabric_encours") {
      query = `
        SELECT f.id, a.last_seen_at
        FROM fabric_cv_encours f
        LEFT JOIN user_activity a
          ON a.entity_type = 'fabric_encours' AND a.entity_id = CAST(f.id AS TEXT)
      `;
    } else {
      // imported_doc not in DB, return 0
      return 0;
    }

    const rows = await db.select<Array<Record<string, unknown>>>(query);

    // Filter unseen + optional additional filter
    const filtered = rows.filter((row) => {
      const isUnseen = !row["last_seen_at"];
      return isUnseen && (filterFn ? filterFn(row) : true);
    });

    return filtered.length;
  } catch (error) {
    throw new WoodyError(
      "Impossible de compter les entites non vues",
      "USER_ACTIVITY_COUNT_FAILED",
      error,
    );
  }
}

/**
 * Get total count of entities with optional filter (seen + unseen)
 */
export async function getTotalCount(
  entityType: EntityType,
  filterFn?: (row: Record<string, unknown>) => boolean,
): Promise<number> {
  const db = await getDatabase();

  try {
    let query = "";

    if (entityType === "dossier") {
      query = `
        SELECT s.id, s.statut, s.fabric_matched
        FROM cdv_sessions s
      `;
    } else if (entityType === "fabric_encours") {
      query = "SELECT id FROM fabric_cv_encours";
    } else {
      return 0;
    }

    const rows = await db.select<Array<Record<string, unknown>>>(query);

    if (!filterFn) {
      return rows.length;
    }

    return rows.filter(filterFn).length;
  } catch (error) {
    throw new WoodyError(
      "Impossible de compter les entites",
      "USER_ACTIVITY_TOTAL_COUNT_FAILED",
      error,
    );
  }
}
