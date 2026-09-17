import { getBusinessSession } from "./_auth.js";
import { clean, fail, noStore, parseJsonBody } from "./_util.js";

const ALLOWED_STATUSES = new Set(["available", "paused", "removed"]);

function cents(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function resourceFields(body) {
  return {
    title: clean(body.title, 180),
    category: clean(body.category, 100),
    description: clean(body.description, 3000),
    quantityText: clean(body.quantityText, 200) || null,
    estimatedValueCents: cents(body.estimatedValue),
    availabilityNotes: clean(body.availabilityNotes, 1000) || null,
    pickupInstructions: clean(body.pickupInstructions, 1000) || null,
    expiresAt: clean(body.expiresAt, 50) || null
  };
}

function validateResource(fields, res) {
  if (!fields.title || !fields.category || !fields.description) {
    fail(res, 400, "Resource title, category and description are required.");
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  noStore(res);

  if (!["POST", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "POST, PATCH");
    fail(res, 405, "Method not allowed.");
    return;
  }

  const session = await getBusinessSession(req, res);
  if (!session) return;

  try {
    const body = parseJsonBody(req);
    const { sql, business } = session;
    const action = clean(body.action, 50) || "create";

    async function ensureResourcePostingEligibility() {
      const rows = await sql`
        SELECT
          status,
          plan_tier,
          approved_at,
          city,
          state
        FROM hub_business_accounts
        WHERE id = ${business.id}
        LIMIT 1
      `;

      const account = rows[0];

      const memberTiers = new Set([
        "community_free",
        "community_partner",
        "impact_partner",
        "community_champion",
        "presenting_partner"
      ]);

      const lakeNormanCities = new Set([
        "huntersville",
        "cornelius",
        "davidson",
        "mooresville",
        "denver",
        "sherrills ford",
        "troutman",
        "statesville"
      ]);

      const city = String(account?.city || "")
        .trim()
        .toLowerCase()
        .replace(/\\s+/g, " ");

      const state = String(account?.state || "")
        .trim()
        .toUpperCase();

      if (
        !account ||
        account.status !== "active" ||
        !memberTiers.has(account.plan_tier) ||
        !account.approved_at
      ) {
        fail(
          res,
          403,
          "Resource posting is available to approved LINK Resource Contributors and business members."
        );
        return false;
      }

      if (
        state !== "NC" ||
        !lakeNormanCities.has(city)
      ) {
        fail(
          res,
          403,
          "Resource posting is limited to approved LINK business members located in the Lake Norman service area. Update your business address or contact LINK."
        );
        return false;
      }

      return true;
    }

    if (action === "create") {
      if (!(await ensureResourcePostingEligibility())) return;
      if (body.connectorAcknowledged !== true) {
        fail(
          res,
          400,
          "Acknowledge LINK\'s connector role before saving this resource."
        );
        return;
      }
      const fields = resourceFields(body);
      if (!validateResource(fields, res)) return;

      const activeRows = await sql`
        SELECT count(*)::int AS count
        FROM hub_resource_items
        WHERE business_id = ${business.id}
          AND status = 'available'
          AND (expires_at IS NULL OR expires_at > now())
      `;

      if (Number(activeRows[0]?.count || 0) >= Number(business.active_listing_limit || 1)) {
        fail(res, 409, "You have reached the active resource limit for your current LINK participation level.");
        return;
      }

      const rows = await sql`
        INSERT INTO hub_resource_items (
          business_id,
          title,
          category,
          description,
          quantity_text,
          estimated_value_cents,
          availability_notes,
          pickup_instructions,
          expires_at,
          status,
          approval_status,
          submitted_at
        )
        VALUES (
          ${business.id},
          ${fields.title},
          ${fields.category},
          ${fields.description},
          ${fields.quantityText},
          ${fields.estimatedValueCents},
          ${fields.availabilityNotes},
          ${fields.pickupInstructions},
          ${fields.expiresAt},
          'paused',
          'pending-review',
          now()
        )
        RETURNING id
      `;

      res.status(200).json({
        ok: true,
        itemId: rows[0].id,
        message: "Resource submitted to LINK for review."
      });
      return;
    }

    const itemId = clean(body.itemId, 80);
    if (!itemId) {
      fail(res, 400, "Resource item is required.");
      return;
    }

    const owned = await sql`
      SELECT id, status
      FROM hub_resource_items
      WHERE id = ${itemId} AND business_id = ${business.id}
      LIMIT 1
    `;

    if (!owned.length) {
      fail(res, 404, "Resource item not found.");
      return;
    }

    if (action === "status") {
      const status = clean(body.status, 30);

      if (!ALLOWED_STATUSES.has(status)) {
        fail(res, 400, "Invalid resource status.");
        return;
      }

      if (status === "available") {
        if (!(await ensureResourcePostingEligibility())) return;

        if (owned[0].status === "available") {
          res.status(200).json({
            ok: true,
            message: "This resource is already available."
          });
          return;
        }

        const activeRows = await sql`
          SELECT count(*)::int AS count
          FROM hub_resource_items
          WHERE business_id = ${business.id}
            AND status = 'available'
            AND id <> ${itemId}
            AND (expires_at IS NULL OR expires_at > now())
        `;

        if (
          Number(activeRows[0]?.count || 0) >=
          Number(business.active_listing_limit || 1)
        ) {
          fail(
            res,
            409,
            "You have reached the active resource limit for your current LINK participation level."
          );
          return;
        }

        await sql`
          UPDATE hub_resource_items
          SET
            status = 'paused',
            approval_status = 'pending-review',
            submitted_at = now(),
            approved_at = NULL,
            approved_by = NULL,
            published_at = NULL,
            removed_at = NULL,
            updated_at = now()
          WHERE
            id = ${itemId}
            AND business_id = ${business.id}
        `;

        res.status(200).json({
          ok: true,
          message: "Resource submitted to LINK for approval."
        });
        return;
      }

      await sql`
        UPDATE hub_resource_items
        SET
          status = ${status},
          removed_at =
            CASE
              WHEN ${status} = 'removed'
                THEN now()
              ELSE NULL
            END,
          updated_at = now()
        WHERE
          id = ${itemId}
          AND business_id = ${business.id}
      `;

      res.status(200).json({
        ok: true,
        message: "Resource status updated."
      });
      return;
    }

    if (action === "update") {
      if (!(await ensureResourcePostingEligibility())) return;
      if (body.connectorAcknowledged !== true) {
        fail(
          res,
          400,
          "Acknowledge LINK\'s connector role before saving this resource."
        );
        return;
      }
      const fields = resourceFields(body);

      if (!validateResource(fields, res)) return;

      await sql`
        UPDATE hub_resource_items
        SET
          title = ${fields.title},
          category = ${fields.category},
          description = ${fields.description},
          quantity_text = ${fields.quantityText},
          estimated_value_cents = ${fields.estimatedValueCents},
          availability_notes = ${fields.availabilityNotes},
          pickup_instructions = ${fields.pickupInstructions},
          expires_at = ${fields.expiresAt},
          status = 'paused',
          approval_status = 'pending-review',
          submitted_at = now(),
          approved_at = NULL,
          approved_by = NULL,
          published_at = NULL,
          updated_at = now()
        WHERE
          id = ${itemId}
          AND business_id = ${business.id}
      `;

      res.status(200).json({
        ok: true,
        message: "Changes saved and submitted to LINK for approval."
      });
      return;
    }

    fail(res, 400, "Invalid resource action.");
  } catch (error) {
    console.error("LINK business resource error:", error);
    fail(res, 500, "Resource changes could not be saved.");
  }
}
