import {
  and,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  notInArray,
  sql,
  sum
} from "drizzle-orm"
import { database } from "@api/common/database"
import {
  bounceIncidents,
  domainWindowCounters,
  eventOutbox,
  incidentNotifications,
  incidents,
  installations
} from "@api/common/database/schema"
import { BOUNCE_MIN_SENT } from "@api/modules/incidents/constants/incidents.constants"
import type {
  Incident,
  OpenIncident
} from "@api/modules/incidents/types/incidents.repository.types"
import type {
  BounceCounts,
  DomainWindow,
  IncidentChange,
  IncidentSeverity
} from "@api/modules/incidents/types/incidents.types"

// Every connected installation: open incidents need runs to recover even without volume.
async function listConnectedInstallationIds(): Promise<string[]> {
  const connectedInstallations = await database
    .select({ id: installations.id })
    .from(installations)
    .where(isNull(installations.disconnectedAt))

  return connectedInstallations.map(({ id }) => id)
}

// Sums the counter buckets starting at or after `since`, per domain above the rule's volume floor.
async function listDomainWindows(
  installationId: string,
  since: Date
): Promise<DomainWindow[]> {
  return database
    .select({
      domain: domainWindowCounters.domain,
      sent: sum(domainWindowCounters.sent).mapWith(Number),
      bounced: sum(domainWindowCounters.bounced).mapWith(Number)
    })
    .from(domainWindowCounters)
    .where(
      and(
        eq(domainWindowCounters.installationId, installationId),
        gte(domainWindowCounters.windowStart, since)
      )
    )
    .groupBy(domainWindowCounters.domain)
    .having(sql`sum(${domainWindowCounters.sent}) >= ${BOUNCE_MIN_SENT}`)
}

// Incident, its metrics and its `incident.opened` event commit together; null when one is already open.
async function openWithEvent(openIncident: OpenIncident) {
  return database.transaction(async (tx) => {
    const { installationId, domain, severity } = openIncident
    const [incident] = await tx
      .insert(incidents)
      .values({ installationId, type: "bounce_spike", domain, severity })
      .onConflictDoNothing()
      .returning()

    if (!incident) {
      return null
    }

    await tx
      .insert(bounceIncidents)
      .values({ incidentId: incident.id, ...openIncident.bounce })

    await tx.insert(eventOutbox).values({
      eventName: "incident.opened",
      payload: { incidentId: incident.id },
      dedupeKey: `incident.opened~${incident.id}`
    })

    return incident
  })
}

async function findOpen(
  installationId: string,
  domain: string
): Promise<Incident | null> {
  const [incidentWithMetrics] = await database
    .select({ incident: incidents, bounce: bounceIncidents })
    .from(incidents)
    .innerJoin(bounceIncidents, eq(bounceIncidents.incidentId, incidents.id))
    .where(
      and(
        eq(incidents.installationId, installationId),
        eq(incidents.domain, domain),
        isNull(incidents.resolvedAt)
      )
    )

  if (!incidentWithMetrics) {
    return null
  }

  return { ...incidentWithMetrics.incident, bounce: incidentWithMetrics.bounce }
}

async function clearRecovery(incidentId: string) {
  await database
    .update(incidents)
    .set({ recoveredAt: null, updatedAt: new Date() })
    .where(and(eq(incidents.id, incidentId), isNull(incidents.resolvedAt)))
}

// Guarded by the peak and severity that were read, so a concurrent writer makes this a no-op; null then.
// `peak` is null when only the severity changes.
async function updateWithEvent(
  incident: Incident,
  severity: IncidentSeverity,
  peak: DomainWindow | null,
  change: IncidentChange
) {
  return database.transaction(async (tx) => {
    const updatedAt = new Date()
    // Every writer locks the incident first, so its metrics can't change under the guards below.
    const [lockedIncident] = await tx
      .select({ severity: incidents.severity })
      .from(incidents)
      .where(and(eq(incidents.id, incident.id), isNull(incidents.resolvedAt)))
      .for("update")

    if (lockedIncident?.severity !== incident.severity) {
      return null
    }

    const [bouncePeak] = peak
      ? await tx
          .update(bounceIncidents)
          .set({ peakSent: peak.sent, peakBounced: peak.bounced })
          .where(
            and(
              eq(bounceIncidents.incidentId, incident.id),
              eq(bounceIncidents.peakSent, incident.bounce.peakSent),
              eq(bounceIncidents.peakBounced, incident.bounce.peakBounced)
            )
          )
          .returning()
      : [null]

    // The guarded peak update matched nothing: another writer raised the peak first.
    if (bouncePeak === undefined) {
      return null
    }

    const [updatedIncident] = await tx
      .update(incidents)
      .set({ severity, recoveredAt: null, updatedAt })
      .where(eq(incidents.id, incident.id))
      .returning()

    if (!updatedIncident) {
      return null
    }

    await tx.insert(eventOutbox).values({
      eventName: "incident.updated",
      payload: {
        incidentId: incident.id,
        change,
        occurredAt: updatedAt.toISOString()
      },
      dedupeKey: `incident.updated~${incident.id}~${updatedAt.getTime()}`
    })

    return updatedIncident
  })
}

// Starts the recovery clock for open incidents whose rule stopped firing; a running clock is kept.
async function markRecovering(
  installationId: string,
  firingDomains: string[],
  recoveredAt: Date
) {
  await database
    .update(incidents)
    .set({ recoveredAt, updatedAt: recoveredAt })
    .where(
      and(
        eq(incidents.installationId, installationId),
        notInArray(incidents.domain, firingDomains),
        isNull(incidents.resolvedAt),
        isNull(incidents.recoveredAt)
      )
    )
}

async function listRecovered(installationId: string, recoveredBefore: Date) {
  return database
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.installationId, installationId),
        isNull(incidents.resolvedAt),
        isNotNull(incidents.recoveredAt),
        lte(incidents.recoveredAt, recoveredBefore)
      )
    )
}

async function sumDomainCounts(
  installationId: string,
  domain: string,
  since: Date
): Promise<BounceCounts> {
  const [counts] = await database
    .select({
      sent: sum(domainWindowCounters.sent).mapWith(Number),
      bounced: sum(domainWindowCounters.bounced).mapWith(Number)
    })
    .from(domainWindowCounters)
    .where(
      and(
        eq(domainWindowCounters.installationId, installationId),
        eq(domainWindowCounters.domain, domain),
        gte(domainWindowCounters.windowStart, since)
      )
    )

  return { sent: counts?.sent ?? 0, bounced: counts?.bounced ?? 0 }
}

// Incident, its affected counts and its resolved event commit together; null when it already resolved.
async function resolveWithEvent(incidentId: string, affected: BounceCounts) {
  return database.transaction(async (tx) => {
    const resolvedAt = new Date()
    const [incident] = await tx
      .update(incidents)
      .set({ resolvedAt, updatedAt: resolvedAt })
      .where(and(eq(incidents.id, incidentId), isNull(incidents.resolvedAt)))
      .returning()

    if (!incident) {
      return null
    }

    await tx
      .update(bounceIncidents)
      .set({ affectedSent: affected.sent, affectedBounced: affected.bounced })
      .where(eq(bounceIncidents.incidentId, incidentId))

    await tx.insert(eventOutbox).values({
      eventName: "incident.updated",
      payload: {
        incidentId,
        change: "resolved",
        occurredAt: resolvedAt.toISOString()
      },
      dedupeKey: `incident.updated~${incidentId}~resolved`
    })

    return incident
  })
}

async function findById(incidentId: string): Promise<Incident | null> {
  const [incidentWithMetrics] = await database
    .select({ incident: incidents, bounce: bounceIncidents })
    .from(incidents)
    .innerJoin(bounceIncidents, eq(bounceIncidents.incidentId, incidents.id))
    .where(eq(incidents.id, incidentId))

  if (!incidentWithMetrics) {
    return null
  }

  return { ...incidentWithMetrics.incident, bounce: incidentWithMetrics.bounce }
}

async function hasNotification(incidentId: string, destinationId: string) {
  const [notification] = await database
    .select({ incidentId: incidentNotifications.incidentId })
    .from(incidentNotifications)
    .where(
      and(
        eq(incidentNotifications.incidentId, incidentId),
        eq(incidentNotifications.destinationId, destinationId)
      )
    )

  return notification !== undefined
}

async function listNotifiedDestinationIds(incidentId: string) {
  const notifications = await database
    .select({ destinationId: incidentNotifications.destinationId })
    .from(incidentNotifications)
    .where(eq(incidentNotifications.incidentId, incidentId))

  return notifications.map(({ destinationId }) => destinationId)
}

async function findMessageRef(incidentId: string, destinationId: string) {
  const [notification] = await database
    .select({ messageRef: incidentNotifications.messageRef })
    .from(incidentNotifications)
    .where(
      and(
        eq(incidentNotifications.incidentId, incidentId),
        eq(incidentNotifications.destinationId, destinationId)
      )
    )

  return notification?.messageRef ?? null
}

async function recordNotification(
  incidentId: string,
  destinationId: string,
  messageRef: string
) {
  await database
    .insert(incidentNotifications)
    .values({ incidentId, destinationId, messageRef })
    .onConflictDoNothing()
}

export const incidentsRepository = {
  listConnectedInstallationIds,
  listDomainWindows,
  openWithEvent,
  findOpen,
  clearRecovery,
  updateWithEvent,
  markRecovering,
  listRecovered,
  sumDomainCounts,
  resolveWithEvent,
  findById,
  hasNotification,
  listNotifiedDestinationIds,
  findMessageRef,
  recordNotification
}
