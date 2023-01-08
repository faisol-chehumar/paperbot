import sharp from 'sharp'

// https://cdn.discordapp.com/attachments/1057382656872030258/1060332596954939502/IMG-20210314-WA0004.jpg
export const fetchImageAndConvertToBase64 = async (imageUrl: string) => {
  try {
    const response = await fetch(imageUrl)
    const blob = await response.arrayBuffer()
    const contentType = response.headers.get('content-type')
    const buffer = Buffer.from(blob)
    const base64 = buffer.toString('base64')
    const sharpImage = sharp(buffer)
    const resizedImage = await sharpImage
      .resize(512, 512, {
        fit: 'inside',
      })
      .toBuffer()

    const metadata = await sharp(resizedImage).metadata()
    const { height, width } = metadata
    console.log(metadata)

    return {
      base64: `data:${contentType};base64,${base64}`,
      contentType,
      height,
      width,
    }
  } catch (error) {
    console.error(error)
    throw new Error('Could not fetch image')
  }
}
