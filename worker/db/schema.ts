import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
})
