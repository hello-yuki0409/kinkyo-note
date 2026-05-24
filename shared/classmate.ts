import { z } from 'zod'

export const classmateInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '名前を入力してください')
    .max(40, '名前は40文字以内で入力してください'),
  nickname: z
    .string()
    .trim()
    .max(40, '当時の呼び名は40文字以内で入力してください')
    .optional()
    .default(''),
  currentLocation: z
    .string()
    .trim()
    .min(1, '今住んでいる地域を入力してください')
    .max(80, '地域は80文字以内で入力してください'),
  job: z
    .string()
    .trim()
    .min(1, '仕事・活動を入力してください')
    .max(80, '仕事・活動は80文字以内で入力してください'),
  comment: z
    .string()
    .trim()
    .min(1, '近況を入力してください')
    .max(300, '近況は300文字以内で入力してください'),
  snsUrl: z
    .string()
    .trim()
    .max(200, 'SNS URLは200文字以内で入力してください')
    .optional()
    .default('')
    .refine((value) => value === '' || isValidUrl(value), {
      message: 'SNS URLの形式を確認してください',
    }),
  visibility: z.enum(['public', 'organizer_only']).default('public'),
})

export const classmateAdminPatchSchema = z
  .object({
    status: z.enum(['published', 'hidden', 'deleted']).optional(),
  })
  .refine((input) => input.status !== undefined, {
    message: '更新内容を指定してください',
  })

export type ClassmateInput = z.infer<typeof classmateInputSchema>
export type ClassmateFormValues = z.input<typeof classmateInputSchema>
export type ClassmateAdminPatch = z.infer<typeof classmateAdminPatchSchema>

export type Group = {
  id: number
  name: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
}

export type Classmate = {
  id: number
  groupId: number
  name: string
  nickname: string
  currentLocation: string
  job: string
  comment: string
  snsUrl: string
  visibility: 'public' | 'organizer_only' | 'private'
  status: 'published' | 'hidden' | 'deleted'
  createdAt: string
  updatedAt: string
}

export type PublicClassmate = Pick<
  Classmate,
  'id' | 'name' | 'currentLocation' | 'job' | 'comment' | 'snsUrl' | 'createdAt'
>

export type CreatedClassmate = Pick<Classmate, 'id'>
export type ClassmateAdminPatchResult = Pick<Classmate, 'id' | 'status' | 'updatedAt'>

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
