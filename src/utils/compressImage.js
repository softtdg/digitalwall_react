const COMPRESSIBLE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    img.src = url
  })

/**
 * Compress an image file in the browser before upload.
 * Non-image files, GIFs and SVGs are returned unchanged.
 * PNG/WebP are encoded as WebP so transparency is preserved.
 * @param {File} file
 * @param {{maxWidth?: number, maxHeight?: number, quality?: number}} options
 * @returns {Promise<File>}
 */
export const compressImage = async (
  file,
  { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = {},
) => {
  if (!(file instanceof File) || !COMPRESSIBLE_TYPES.includes(file.type)) {
    return file
  }

  try {
    const img = await loadImage(file)

    const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg"
    const outputType = isJpeg ? "image/jpeg" : "image/webp"

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, outputType, quality),
    )
    if (!blob || blob.size >= file.size) {
      return file
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "")
    const extension = outputType === "image/jpeg" ? "jpg" : "webp"

    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error("Image compression failed, uploading original file:", error)
    return file
  }
}
