import { Handler } from '@netlify/functions'
import { put } from '@netlify/blob-storage'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    }
  }

  try {
    const { image, filename } = JSON.parse(event.body || '{}')
    
    if (!image || !filename) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image and filename are required' })
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(image.split(',')[1], 'base64')
    
    // Upload to Netlify Blob Storage
    const result = await put(filename, buffer, {
      token: process.env.NETLIFY_BLOB_TOKEN,
      directory: 'uploads'
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ url: result.url })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload image' })
    }
  }
}