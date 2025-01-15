import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import busboy from 'busboy';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: event.headers });
    const result: { fileUrl?: string; error?: string } = {};
    let fileBuffer: Buffer[] = [];

    bb.on('file', (name, file, info) => {
      console.log('Processing file:', info.filename);
      
      file.on('data', (data) => {
        fileBuffer.push(data);
      });

      file.on('end', async () => {
        try {
          const buffer = Buffer.concat(fileBuffer);
          const filename = `${Date.now()}-${info.filename}`;
          
          // 使用 Netlify Blobs 存储文件
          const store = getStore();
          await store.set(filename, buffer);
          
          // 获取文件的公共 URL
          const url = await store.getUrl(filename);
          result.fileUrl = url;
          
          console.log('File uploaded successfully:', url);
        } catch (error) {
          console.error('File upload error:', error);
          result.error = '文件上传失败';
        }
      });
    });

    bb.on('finish', () => {
      resolve({
        statusCode: result.error ? 400 : 200,
        body: JSON.stringify(result)
      });
    });

    bb.on('error', (error) => {
      console.error('Upload error:', error);
      resolve({
        statusCode: 400,
        body: JSON.stringify({ error: '上传失败' })
      });
    });

    const buffer = Buffer.from(event.body as string, 'base64');
    bb.end(buffer);
  });
};