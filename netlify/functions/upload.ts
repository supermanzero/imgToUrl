import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import busboy from 'busboy';

export const handler: Handler = async (event) => {
  console.log('Request headers:', event.headers);
  console.log('Request body length:', event.body?.length);

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
    const bb = busboy({ 
      headers: event.headers,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
      }
    });
    
    const result: { fileUrl?: string; error?: string } = {};
    let fileBuffer: Buffer[] = [];
    let hasFile = false;

    bb.on('file', (name, file, info) => {
      hasFile = true;
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
          
          // 使用 Netlify Blobs 存储文件
          const store = getStore();
          await store.set(filename, buffer, {
            type: info.mimeType || 'application/octet-stream'
          });
          
          // 获取文件的公共 URL
          const url = await store.getUrl(filename);
          result.fileUrl = url;
          
          console.log('文件上传成功:', url);
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
          body: JSON.stringify({ error: '请求中没有文件' })
        });
        return;
      }

      resolve({
        statusCode: result.error ? 400 : 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST'
        },
        body: JSON.stringify(result)
      });
    });

    bb.on('error', (error) => {
      console.error('上传错误:', error);
      resolve({
        statusCode: 400,
        body: JSON.stringify({ error: `上传失败: ${error.message}` })
      });
    });

    try {
      const buffer = Buffer.from(event.body, 'base64');
      bb.end(buffer);
    } catch (error) {
      console.error('解析请求体错误:', error);
      resolve({
        statusCode: 400,
        body: JSON.stringify({ error: '无效的请求数据' })
      });
    }
  });
};