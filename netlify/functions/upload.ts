import { Handler } from '@netlify/functions';
import busboy from 'busboy';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

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
          const uploadDir = join(process.cwd(), 'public', 'uploads');
          
          // 确保上传目录存在
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }

          const filename = `${Date.now()}-${info.filename}`;
          const filePath = join(uploadDir, filename);
          
          // 保存文件
          writeFileSync(filePath, buffer);
          
          // 获取站点URL
          const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
          
          // 返回完整的URL
          result.fileUrl = `${siteUrl}/uploads/${filename}`;
          console.log('File URL:', result.fileUrl);
        } catch (error) {
          console.error('File save error:', error);
          result.error = '文件保存失败';
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