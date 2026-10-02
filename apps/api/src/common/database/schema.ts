import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core"
import type { JsonValue } from "@api/common/json/types"
import type { OutboxEventName } from "@api/modules/events/types/events.types"
import type {
  IncidentSeverity,
  IncidentType
} from "@api/modules/incidents/types/incidents.types"

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
})

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.userId)]
)

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.userId)]
)

export const verifications = pgTable(
  "verifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.identifier)]
)

export const installations = pgTable(
  "installations",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: text().notNull().unique(),
    accessTokenEncrypted: text().notNull(),
    refreshTokenEncrypted: text().notNull(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }).notNull(),
    scope: text().notNull(),
    disconnectedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.userId)]
)

export const discordGuilds = pgTable("discord_guilds", {
  id: uuid().primaryKey().defaultRandom(),
  installationId: uuid()
    .notNull()
    .unique()
    .references(() => installations.id, { onDelete: "cascade" }),
  guildId: text().notNull(),
  guildName: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
})

// A Discord channel that receives the installation's alerts.
export const destinations = pgTable(
  "destinations",
  {
    id: uuid().primaryKey().defaultRandom(),
    installationId: uuid()
      .notNull()
      .references(() => installations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    guildId: text().notNull(),
    channelId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [unique().on(table.installationId, table.channelId)]
)

export const resendWebhooks = pgTable("resend_webhooks", {
  installationId: uuid()
    .primaryKey()
    .references(() => installations.id, { onDelete: "cascade" }),
  webhookId: text().notNull(),
  signingSecretEncrypted: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
})

// Svix message ids already counted; retries of a delivery reuse the same id.
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    installationId: uuid()
      .notNull()
      .references(() => installations.id, { onDelete: "cascade" }),
    svixId: text().notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.installationId, table.svixId] }),
    index().on(table.receivedAt)
  ]
)

export const domainWindowCounters = pgTable(
  "domain_window_counters",
  {
    installationId: uuid()
      .notNull()
      .references(() => installations.id, { onDelete: "cascade" }),
    domain: text().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    sent: integer().notNull().default(0),
    bounced: integer().notNull().default(0)
  },
  (table) => [
    primaryKey({
      columns: [table.installationId, table.domain, table.windowStart]
    }),
    index().on(table.installationId, table.windowStart),
    index().on(table.windowStart)
  ]
)

export const incidents = pgTable(
  "incidents",
  {
    id: uuid().primaryKey().defaultRandom(),
    installationId: uuid()
      .notNull()
      .references(() => installations.id, { onDelete: "cascade" }),
    type: text().$type<IncidentType>().notNull(),
    domain: text().notNull(),
    severity: text().$type<IncidentSeverity>().notNull(),
    openedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    recoveredAt: timestamp({ withTimezone: true }),
    resolvedAt: timestamp({ withTimezone: true }),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("incidents_open_unique")
      .on(table.installationId, table.domain, table.type)
      .where(sql`${table.resolvedAt} is null`),
    index().on(table.installationId)
  ]
)

// Peak window that set the severity; `affected*` is filled when the incident resolves.
export const bounceIncidents = pgTable("bounce_incidents", {
  incidentId: uuid()
    .primaryKey()
    .references(() => incidents.id, { onDelete: "cascade" }),
  peakSent: integer().notNull(),
  peakBounced: integer().notNull(),
  affectedSent: integer(),
  affectedBounced: integer()
})

export const incidentNotifications = pgTable(
  "incident_notifications",
  {
    incidentId: uuid()
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    destinationId: uuid()
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    messageRef: text().notNull(),
    sentAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.incidentId, table.destinationId] }),
    index().on(table.destinationId)
  ]
)

export const eventOutbox = pgTable(
  "event_outbox",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventName: text().$type<OutboxEventName>().notNull(),
    payload: jsonb().$type<JsonValue>().notNull(),
    dedupeKey: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp({ withTimezone: true })
  },
  (table) => [index().on(table.processedAt, table.createdAt)]
)
