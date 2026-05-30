import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { drizzle } from 'drizzle-orm/d1'
import { and, desc, eq, gt, ne } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import {
  classmateAdminPatchSchema,
  classmateInputSchema,
  groupInputSchema,
} from '../shared/classmate'
import {
  authIdentities,
  authSessions,
  classmates,
  groups,
  users,
} from './db/schema'

type Bindings = {
  DB: D1Database
  ADMIN_TOKEN?: string
  APP_ORIGIN?: string
  ALLOWED_ORIGINS?: string
  LINE_CHANNEL_ID?: string
  LINE_CHANNEL_SECRET?: string
  LINE_REDIRECT_URI?: string
}

type AuthenticatedSession = {
  id: number
  csrfTokenHash: string
  user: {
    id: number
    displayName: string
    avatarUrl: string
  }
}

type LineTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  scope?: string
}

type LineProfileResponse = {
  userId: string
  displayName: string
  pictureUrl?: string
}

const app = new Hono<{ Bindings: Bindings }>()

const defaultSlug = 'hanchu'
const sessionCookieName = 'kinkyo_session'
const oauthStateCookieName = 'kinkyo_oauth_state'
const oauthVerifierCookieName = 'kinkyo_oauth_verifier'
const oauthReturnToCookieName = 'kinkyo_oauth_return_to'
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30
const oauthCookieMaxAgeSeconds = 60 * 10

app.use('*', async (c, next) => {
  await next()
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  )
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

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

app.get('/api/me', async (c) => {
  const session = await getCurrentSession(c)

  c.header('Cache-Control', 'no-store')
  return c.json({
    user: session?.user ?? null,
  })
})

app.get('/api/session/csrf-token', async (c) => {
  const session = await requireSession(c)
  const csrfToken = createRandomToken()
  const csrfTokenHash = await hashValue(csrfToken)
  const db = drizzle(c.env.DB)

  await db
    .update(authSessions)
    .set({ csrfTokenHash })
    .where(eq(authSessions.id, session.id))

  c.header('Cache-Control', 'no-store')
  return c.json({ csrfToken })
})

app.delete('/api/session', async (c) => {
  verifyOrigin(c)
  const session = await getCurrentSession(c)

  if (session) {
    await verifyCsrf(c, session)
    const db = drizzle(c.env.DB)
    await db.delete(authSessions).where(eq(authSessions.id, session.id))
  }

  clearSessionCookie(c)
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true })
})

app.get('/api/oauth/:provider/authorization', async (c) => {
  const provider = c.req.param('provider')

  if (provider !== 'line') {
    throw new HTTPException(404, { message: 'Not found' })
  }

  const config = getLineConfig(c)
  const state = createRandomToken()
  const codeVerifier = createRandomToken()
  const codeChallenge = await createCodeChallenge(codeVerifier)
  const returnTo = sanitizeReturnTo(c.req.query('returnTo'))
  const authorizationUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')

  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('client_id', config.channelId)
  authorizationUrl.searchParams.set('redirect_uri', config.redirectUri)
  authorizationUrl.searchParams.set('state', state)
  authorizationUrl.searchParams.set('scope', 'profile')
  authorizationUrl.searchParams.set('code_challenge', codeChallenge)
  authorizationUrl.searchParams.set('code_challenge_method', 'S256')

  setTransientCookie(c, oauthStateCookieName, state)
  setTransientCookie(c, oauthVerifierCookieName, codeVerifier)
  setTransientCookie(c, oauthReturnToCookieName, returnTo)

  return c.redirect(authorizationUrl.toString())
})

app.get('/api/oauth/:provider/callback', async (c) => {
  const provider = c.req.param('provider')

  if (provider !== 'line') {
    throw new HTTPException(404, { message: 'Not found' })
  }

  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = getCookie(c, oauthStateCookieName)
  const codeVerifier = getCookie(c, oauthVerifierCookieName)
  const returnTo = sanitizeReturnTo(getCookie(c, oauthReturnToCookieName))

  clearTransientCookie(c, oauthStateCookieName)
  clearTransientCookie(c, oauthVerifierCookieName)
  clearTransientCookie(c, oauthReturnToCookieName)

  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    throw new HTTPException(400, { message: 'ログインをやり直してください' })
  }

  const config = getLineConfig(c)
  const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.channelId,
      client_secret: config.channelSecret,
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenResponse.ok) {
    throw new HTTPException(401, { message: 'LINEログインに失敗しました' })
  }

  const tokenBody = (await tokenResponse.json()) as LineTokenResponse

  if (!tokenBody.access_token) {
    throw new HTTPException(401, { message: 'LINEログインに失敗しました' })
  }

  const profileResponse = await fetch('https://api.line.me/v2/profile', {
    headers: {
      Authorization: `Bearer ${tokenBody.access_token}`,
    },
  })

  if (!profileResponse.ok) {
    throw new HTTPException(401, { message: 'プロフィール取得に失敗しました' })
  }

  const profile = (await profileResponse.json()) as LineProfileResponse
  const user = await findOrCreateLineUser(c, profile)
  const sessionToken = createRandomToken()
  const sessionTokenHash = await hashValue(sessionToken)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + sessionMaxAgeSeconds * 1000)
  const db = drizzle(c.env.DB)

  await db.insert(authSessions).values({
    userId: user.id,
    sessionTokenHash,
    csrfTokenHash: '',
    createdAt: now,
    expiresAt,
  })

  setSessionCookie(c, sessionToken)

  return c.redirect(`${getAppOrigin(c)}${returnTo}`)
})

app.post('/api/groups', async (c) => {
  const session = await requireSession(c)
  await verifyCsrf(c, session)

  const db = drizzle(c.env.DB)
  const input = groupInputSchema.parse(await c.req.json())
  const now = new Date()

  const group = await db
    .insert(groups)
    .values({
      ownerUserId: session.user.id,
      name: input.name,
      slug: input.slug,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: groups.id,
      slug: groups.slug,
    })
    .get()

  c.header('Cache-Control', 'no-store')
  return c.json({ group }, 201)
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
    .select({
      id: classmates.id,
      name: classmates.name,
      currentLocation: classmates.currentLocation,
      job: classmates.job,
      comment: classmates.comment,
      snsUrl: classmates.snsUrl,
      createdAt: classmates.createdAt,
    })
    .from(classmates)
    .where(
      and(
        eq(classmates.groupId, group.id),
        eq(classmates.status, 'published'),
        eq(classmates.visibility, 'public'),
      ),
    )
    .orderBy(desc(classmates.createdAt))

  c.header('Cache-Control', 'no-store')
  return c.json({ classmates: rows })
})

app.post('/api/groups/:slug/classmates', async (c) => {
  const session = await requireSession(c)
  await verifyCsrf(c, session)

  const db = drizzle(c.env.DB)
  const slug = c.req.param('slug')
  const group = await db.select().from(groups).where(eq(groups.slug, slug)).get()

  if (!group) {
    throw new HTTPException(404, { message: 'グループが見つかりません' })
  }

  const existingClassmate = await db
    .select({ id: classmates.id })
    .from(classmates)
    .where(
      and(
        eq(classmates.groupId, group.id),
        eq(classmates.authorUserId, session.user.id),
        ne(classmates.status, 'deleted'),
      ),
    )
    .get()

  if (existingClassmate) {
    return c.json(
      {
        message: 'このグループにはすでに投稿済みです',
        classmate: { id: existingClassmate.id },
      },
      409,
    )
  }

  const input = classmateInputSchema.parse(await c.req.json())
  const now = new Date()

  const classmate = await db
    .insert(classmates)
    .values({
      groupId: group.id,
      authorUserId: session.user.id,
      name: input.name,
      nickname: input.nickname,
      currentLocation: input.currentLocation,
      job: input.job,
      comment: input.comment,
      snsUrl: input.snsUrl,
      visibility: 'public',
      status: 'published',
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get()

  c.header('Cache-Control', 'no-store')
  return c.json({ classmate: { id: classmate.id } }, 201)
})

app.get('/api/me/groups/:slug/classmates', async (c) => {
  const session = await getCurrentSession(c)

  if (!session) {
    c.header('Cache-Control', 'no-store')
    return c.json({ classmates: [] })
  }

  const db = drizzle(c.env.DB)
  const slug = c.req.param('slug')
  const group = await db.select().from(groups).where(eq(groups.slug, slug)).get()

  if (!group) {
    throw new HTTPException(404, { message: 'グループが見つかりません' })
  }

  const rows = await db
    .select({
      id: classmates.id,
      createdAt: classmates.createdAt,
      updatedAt: classmates.updatedAt,
    })
    .from(classmates)
    .where(
      and(
        eq(classmates.groupId, group.id),
        eq(classmates.authorUserId, session.user.id),
        ne(classmates.status, 'deleted'),
      ),
    )
    .orderBy(desc(classmates.createdAt))

  c.header('Cache-Control', 'no-store')
  return c.json({ classmates: rows })
})

app.get('/api/me/groups/:slug/classmates/:id', async (c) => {
  const session = await requireSession(c)
  const { group, classmateId } = await getGroupAndClassmateId(c)
  const db = drizzle(c.env.DB)

  const classmate = await db
    .select({
      id: classmates.id,
      name: classmates.name,
      nickname: classmates.nickname,
      currentLocation: classmates.currentLocation,
      job: classmates.job,
      comment: classmates.comment,
      snsUrl: classmates.snsUrl,
      visibility: classmates.visibility,
      createdAt: classmates.createdAt,
      updatedAt: classmates.updatedAt,
    })
    .from(classmates)
    .where(
      and(
        eq(classmates.id, classmateId),
        eq(classmates.groupId, group.id),
        eq(classmates.authorUserId, session.user.id),
        ne(classmates.status, 'deleted'),
      ),
    )
    .get()

  if (!classmate) {
    throw new HTTPException(404, { message: 'この投稿は編集できません' })
  }

  c.header('Cache-Control', 'no-store')
  return c.json({ classmate })
})

app.patch('/api/me/groups/:slug/classmates/:id', async (c) => {
  const session = await requireSession(c)
  await verifyCsrf(c, session)

  const { group, classmateId } = await getGroupAndClassmateId(c)
  const db = drizzle(c.env.DB)
  const input = classmateInputSchema.parse(await c.req.json())
  const now = new Date()

  const classmate = await db
    .update(classmates)
    .set({
      name: input.name,
      nickname: input.nickname,
      currentLocation: input.currentLocation,
      job: input.job,
      comment: input.comment,
      snsUrl: input.snsUrl,
      visibility: 'public',
      updatedAt: now,
    })
    .where(
      and(
        eq(classmates.id, classmateId),
        eq(classmates.groupId, group.id),
        eq(classmates.authorUserId, session.user.id),
        ne(classmates.status, 'deleted'),
      ),
    )
    .returning({
      id: classmates.id,
      updatedAt: classmates.updatedAt,
    })
    .get()

  if (!classmate) {
    throw new HTTPException(404, { message: 'この投稿は編集できません' })
  }

  c.header('Cache-Control', 'no-store')
  return c.json({ classmate })
})

app.patch('/api/classmates/:id', async (c) => {
  const adminToken = c.env.ADMIN_TOKEN

  if (!adminToken) {
    throw new HTTPException(404, { message: 'Not found' })
  }

  if (c.req.header('Authorization') !== `Bearer ${adminToken}`) {
    throw new HTTPException(401, { message: '認証が必要です' })
  }

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
    .returning({
      id: classmates.id,
      status: classmates.status,
      updatedAt: classmates.updatedAt,
    })
    .get()

  if (!classmate) {
    throw new HTTPException(404, { message: '投稿が見つかりません' })
  }

  c.header('Cache-Control', 'no-store')
  return c.json({ classmate })
})

async function getCurrentSession(c: Parameters<typeof getCookie>[0]) {
  const sessionToken = getCookie(c, sessionCookieName)

  if (!sessionToken) return null

  const db = drizzle(c.env.DB)
  const sessionTokenHash = await hashValue(sessionToken)
  const row = await db
    .select({
      sessionId: authSessions.id,
      csrfTokenHash: authSessions.csrfTokenHash,
      userId: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.sessionTokenHash, sessionTokenHash),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .get()

  if (!row) {
    clearSessionCookie(c)
    return null
  }

  return {
    id: row.sessionId,
    csrfTokenHash: row.csrfTokenHash,
    user: {
      id: row.userId,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
  } satisfies AuthenticatedSession
}

async function requireSession(c: Parameters<typeof getCookie>[0]) {
  const session = await getCurrentSession(c)

  if (!session) {
    throw new HTTPException(401, { message: '認証が必要です' })
  }

  return session
}

async function verifyCsrf(
  c: Parameters<typeof getCookie>[0],
  session: AuthenticatedSession,
) {
  verifyOrigin(c)

  const csrfToken = c.req.header('X-CSRF-Token')

  if (!csrfToken || !session.csrfTokenHash) {
    throw new HTTPException(403, { message: '不正なリクエストです' })
  }

  const csrfTokenHash = await hashValue(csrfToken)

  if (!constantTimeEqual(csrfTokenHash, session.csrfTokenHash)) {
    throw new HTTPException(403, { message: '不正なリクエストです' })
  }
}

function verifyOrigin(c: Parameters<typeof getCookie>[0]) {
  const origin = c.req.header('Origin')

  if (!origin) {
    throw new HTTPException(403, { message: '不正なリクエストです' })
  }

  const allowedOrigins = getAllowedOrigins(c)

  if (!allowedOrigins.includes(origin)) {
    throw new HTTPException(403, { message: '不正なリクエストです' })
  }
}

function getAllowedOrigins(c: Parameters<typeof getCookie>[0]) {
  const configuredOrigins = c.env.ALLOWED_ORIGINS?.split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean)

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins
  }

  const appOrigin = getAppOrigin(c)
  const origins = [appOrigin]

  if (appOrigin.startsWith('http://localhost')) {
    origins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:8787')
  }

  return [...new Set(origins)]
}

async function findOrCreateLineUser(
  c: Parameters<typeof getCookie>[0],
  profile: LineProfileResponse,
) {
  const db = drizzle(c.env.DB)
  const now = new Date()
  const identity = await db
    .select({
      userId: authIdentities.userId,
    })
    .from(authIdentities)
    .where(
      and(
        eq(authIdentities.provider, 'line'),
        eq(authIdentities.providerUserId, profile.userId),
      ),
    )
    .get()

  if (identity) {
    const user = await db
      .update(users)
      .set({
        displayName: profile.displayName,
        avatarUrl: profile.pictureUrl ?? '',
        updatedAt: now,
      })
      .where(eq(users.id, identity.userId))
      .returning({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .get()

    if (!user) {
      throw new HTTPException(500, { message: 'ユーザー情報を更新できませんでした' })
    }

    return user
  }

  const user = await db
    .insert(users)
    .values({
      displayName: profile.displayName,
      avatarUrl: profile.pictureUrl ?? '',
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .get()

  await db.insert(authIdentities).values({
    userId: user.id,
    provider: 'line',
    providerUserId: profile.userId,
    email: '',
    createdAt: now,
    updatedAt: now,
  })

  return user
}

async function getGroupAndClassmateId(c: Parameters<typeof getCookie>[0]) {
  const db = drizzle(c.env.DB)
  const slug = c.req.param('slug')

  if (!slug) {
    throw new HTTPException(400, { message: 'グループを確認してください' })
  }

  const group = await db.select().from(groups).where(eq(groups.slug, slug)).get()

  if (!group) {
    throw new HTTPException(404, { message: 'グループが見つかりません' })
  }

  const classmateId = Number(c.req.param('id'))

  if (!Number.isInteger(classmateId) || classmateId <= 0) {
    throw new HTTPException(400, { message: '投稿IDを確認してください' })
  }

  return { group, classmateId }
}

function getLineConfig(c: Parameters<typeof getCookie>[0]) {
  const channelId = c.env.LINE_CHANNEL_ID
  const channelSecret = c.env.LINE_CHANNEL_SECRET
  const redirectUri =
    c.env.LINE_REDIRECT_URI ?? `${getAppOrigin(c)}/api/oauth/line/callback`

  if (!channelId || !channelSecret) {
    throw new HTTPException(500, { message: 'LINEログイン設定が不足しています' })
  }

  return {
    channelId,
    channelSecret,
    redirectUri,
  }
}

function getAppOrigin(c: Parameters<typeof getCookie>[0]) {
  return c.env.APP_ORIGIN ?? new URL(c.req.url).origin
}

function sanitizeReturnTo(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return `/g/${defaultSlug}`
  }

  return value
}

function setSessionCookie(c: Parameters<typeof getCookie>[0], value: string) {
  setCookie(c, sessionCookieName, value, {
    httpOnly: true,
    secure: isSecureCookie(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: sessionMaxAgeSeconds,
  })
}

function clearSessionCookie(c: Parameters<typeof getCookie>[0]) {
  deleteCookie(c, sessionCookieName, {
    secure: isSecureCookie(c),
    sameSite: 'Lax',
    path: '/',
  })
}

function setTransientCookie(
  c: Parameters<typeof getCookie>[0],
  name: string,
  value: string,
) {
  setCookie(c, name, value, {
    httpOnly: true,
    secure: isSecureCookie(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: oauthCookieMaxAgeSeconds,
  })
}

function clearTransientCookie(c: Parameters<typeof getCookie>[0], name: string) {
  deleteCookie(c, name, {
    secure: isSecureCookie(c),
    sameSite: 'Lax',
    path: '/',
  })
}

function isSecureCookie(c: Parameters<typeof getCookie>[0]) {
  return getAppOrigin(c).startsWith('https://')
}

function createRandomToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function createCodeChallenge(codeVerifier: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  )
  return base64UrlEncode(new Uint8Array(digest))
}

async function hashValue(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false

  let diff = 0

  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }

  return diff === 0
}

export default app
