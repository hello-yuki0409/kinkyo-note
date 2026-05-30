import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull().default(''),
  avatarUrl: text('avatar_url').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const authIdentities = sqliteTable(
  'auth_identities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider', { enum: ['line'] }).notNull(),
    providerUserId: text('provider_user_id').notNull(),
    email: text('email').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('auth_identities_provider_user_unique').on(
      table.provider,
      table.providerUserId,
    ),
  ],
)

export const authSessions = sqliteTable('auth_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  sessionTokenHash: text('session_token_hash').notNull().unique(),
  csrfTokenHash: text('csrf_token_hash').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerUserId: integer('owner_user_id').references(() => users.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const classmates = sqliteTable('classmates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id),
  authorUserId: integer('author_user_id').references(() => users.id),
  name: text('name').notNull(),
  nickname: text('nickname').notNull().default(''),
  currentLocation: text('current_location').notNull().default(''),
  job: text('job').notNull().default(''),
  comment: text('comment').notNull(),
  snsUrl: text('sns_url').notNull().default(''),
  visibility: text('visibility', {
    enum: ['public', 'organizer_only', 'private'],
  })
    .notNull()
    .default('public'),
  status: text('status', {
    enum: ['published', 'hidden', 'deleted'],
  })
    .notNull()
    .default('published'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('classmates_group_author_unique').on(
    table.groupId,
    table.authorUserId,
  ),
])
