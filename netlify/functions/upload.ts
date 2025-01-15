import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import busboy from 'busboy';

export const handler: Handler = async (event) => {
  console.log('Content-Type:', event.headers['content-type']);
  console.log('Content-Length:', event.headers['content-length']);
  console.log('Request Method:', event.httpMethod);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '没有接收到文件数据' })
    };
  }

  return new Promise((resolve, reject) => {
    try {
      const bb = busboy({ 
        headers: {
          'content-type': event.headers['content-type'] || 'multipart/form-data',
          ...event.headers
        },
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 1
        }
      });
      
      const result: { fileUrl?: string; error?: string } = {};
      let fileBuffer: Buffer[] = [];
      let hasFile = false;
      let fileInfo: { filename: string; mimeType: string } | null = null;

      bb.on('file', (name, file, info) => {
        hasFile = true;
        fileInfo = info;
        console.log('开始处理文件:', info.filename);
        console.log('文件类型:', info.mimeType);
        
        file.on('data', (data) => {
          fileBuffer.push(data);
        });

        file.on('end', async () => {
          try {
            if (fileBuffer.length === 0) {
              throw new Error('文件内容为空');
            }

            const buffer = Buffer.concat(fileBuffer);
            console.log('文件大小:', buffer.length);

            const filename = `${Date.now()}-${info.filename}`;
            
            let store;
            try {
              // 尝试获取 Netlify Blobs store
              store = getStore({
                name: 'uploads',
                consistency: 'strong'
              });
            } catch (error) {
              console.warn('Netlify Blobs 未配置，使用临时存储');
              // 如果在本地开发环境，返回 base64 数据
              result.fileUrl = `data:${info.mimeType};base64,${buffer.toString('base64')}`;
              return;
            }

            if (store) {
              // 在 Netlify 环境中使用 Blobs
              await store.set(filename, buffer, {
                metadata: {
                  filename: info.filename,
                  mimeType: info.mimeType,
                  size: buffer.length,
                  uploadedAt: new Date().toISOString()
                },
                type: info.mimeType
              });
              
              const url = await store.getUrl(filename);
              result.fileUrl = url;
              console.log('文件上传成功:', url);
            }
          } catch (error) {
            console.error('文件上传错误:', error);
            result.error = `文件上传失败: ${error.message}`;
          }
        });
      });

      bb.on('finish', () => {
        if (!hasFile) {
          resolve({
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: '请求中没有文件' })
          });
          return;
        }

        resolve({
          statusCode: result.error ? 400 : 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result)
        });
      });

      bb.on('error', (error) => {
        console.error('上传错误:', error);
        resolve({
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: `上传失败: ${error.message}` })
        });
      });

      const buffer = Buffer.from(event.body, 'base64');
      bb.end(buffer);
    } catch (error) {
      console.error('处理请求错误:', error);
      resolve({
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: '无效的请求数据' })
      });
    }
  });
};