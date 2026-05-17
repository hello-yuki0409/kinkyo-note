const classmateImagesKey = 'kinkyo-note:classmate-images:v1'

export function getClassmateImageMap() {
  try {
    const rawValue = localStorage.getItem(classmateImagesKey)
    if (!rawValue) return {}

    const parsedValue = JSON.parse(rawValue)
    if (!parsedValue || typeof parsedValue !== 'object') return {}

    return parsedValue as Record<string, string>
  } catch {
    return {}
  }
}

export function saveClassmateImageDataUrl(classmateId: number, dataUrl: string) {
  const imageMap = getClassmateImageMap()
  imageMap[String(classmateId)] = dataUrl
  localStorage.setItem(classmateImagesKey, JSON.stringify(imageMap))
}

export async function createLocalImageDataUrl(file: File) {
  const image = await loadImage(file)
  const maxSize = 1200
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('写真を処理できませんでした')
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', 0.82)
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
      reject(new Error('写真を読み込めませんでした'))
    }
    image.src = imageUrl
  })
}
