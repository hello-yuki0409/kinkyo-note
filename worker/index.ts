import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { classmateAdminPatchSchema, classmateInputSchema } from '../shared/classmate'
import { classmates, groups } from './db/schema'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ message: error.message }, error.status)
  }

  if (error instanceof ZodError) {
    return c.json(
      {
        message: '入力内容を確認してください',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      400,
    )
  }

  console.error(error)
  return c.json({ message: 'サーバーで問題が発生しました' }, 500)
})

app.notFound((c) => {
  return c.json({ message: 'Not found' }, 404)
})

app.get('/api/health', (c) => {
  return c.json({ ok: true })
})

app.get('/api/groups/:slug', async (c) => {
  const db = drizzle(c.env.DB)
  const slug = c.req.param('slug')
  const group = await db.select().from(groups).where(eq(groups.slug, slug)).get()

  if (!group) {
    return c.json({ message: 'Group not found' }, 404)
  }

  return c.json({ group })
})

app.get('/api/groups/:slug/classmates', async (c) => {
  const db = drizzle(c.env.DB)
  const slug = c.req.param('slug')
  const group = await db.select().from(groups).where(eq(groups.slug, slug)).get()

  if (!group) {
    throw new HTTPException(404, { message: 'グループが見つかりません' })
  }

  const rows = await db
    .select()
    .from(classmates)
    .where(
      and(
        eq(classmates.groupId, group.id),
        eq(classmates.status, 'published'),
        eq(classmates.visibility, 'public'),
      ),
    )
    .orderBy(desc(classmates.createdAt))

  return c.json({ classmates: rows })
})

app.post('/api/groups/:slug/classmates', async (c) => {
  const db = drizzle(c.env.DB)
  const slug = c.req.param('slug')
  const group = await db.select().from(groups).where(eq(groups.slug, slug)).get()

  if (!group) {
    throw new HTTPException(404, { message: 'グループが見つかりません' })
  }

  const input = classmateInputSchema.parse(await c.req.json())
  const now = new Date()

  const classmate = await db
    .insert(classmates)
    .values({
      groupId: group.id,
      name: input.name,
      nickname: input.nickname,
      currentLocation: input.currentLocation,
      job: input.job,
      comment: input.comment,
      snsUrl: input.snsUrl,
      visibility: input.visibility,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get()

  return c.json({ classmate }, 201)
})

app.patch('/api/classmates/:id', async (c) => {
  const db = drizzle(c.env.DB)
  const id = Number(c.req.param('id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: '投稿IDを確認してください' })
  }

  const input = classmateAdminPatchSchema.parse(await c.req.json())
  const now = new Date()

  const classmate = await db
    .update(classmates)
    .set({
      ...input,
      updatedAt: now,
    })
    .where(eq(classmates.id, id))
    .returning()
    .get()

  if (!classmate) {
    throw new HTTPException(404, { message: '投稿が見つかりません' })
  }

  return c.json({ classmate })
})

export default app
