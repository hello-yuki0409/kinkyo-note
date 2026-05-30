const classmateAvatarsKey = 'kinkyo-note:classmate-avatars:v1'
const legacyClassmateImagesKey = 'kinkyo-note:classmate-images:v1'

export function getClassmateAvatarMap() {
  return {
    ...readStoredImageMap(legacyClassmateImagesKey),
    ...readStoredImageMap(classmateAvatarsKey),
  }
}

export function saveClassmateAvatarDataUrl(
  classmateId: number,
  dataUrl: string,
) {
  const avatarMap = readStoredImageMap(classmateAvatarsKey)
  avatarMap[String(classmateId)] = dataUrl

  try {
    localStorage.setItem(classmateAvatarsKey, JSON.stringify(avatarMap))
  } catch {
    // Icon persistence is best-effort; the post itself should still complete.
  }
}

export function clearClassmateAvatarDataUrl(classmateId: number) {
  const avatarMap = readStoredImageMap(classmateAvatarsKey)
  avatarMap[String(classmateId)] = ''

  try {
    localStorage.setItem(classmateAvatarsKey, JSON.stringify(avatarMap))
  } catch {
    // Icon persistence is best-effort; the post itself should still complete.
  }
}

export async function createLocalAvatarDataUrl(file: File) {
  const image = await loadImage(file)
  const size = 512
  const sourceSize = Math.min(image.width, image.height)
  const sourceX = Math.max(0, Math.round((image.width - sourceSize) / 2))
  const sourceY = Math.max(0, Math.round((image.height - sourceSize) / 2))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('アイコン画像を処理できませんでした')
  }

  canvas.width = size
  canvas.height = size
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size,
  )

  return canvas.toDataURL('image/jpeg', 0.82)
}

function readStoredImageMap(storageKey: string) {
  try {
    const rawValue = localStorage.getItem(storageKey)
    if (!rawValue) return {}

    const parsedValue = JSON.parse(rawValue)
    if (!parsedValue || typeof parsedValue !== 'object') return {}

    return parsedValue as Record<string, string>
  } catch {
    return {}
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(imageUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      reject(new Error('アイコン画像を読み込めませんでした'))
    }
    image.src = imageUrl
  })
}
