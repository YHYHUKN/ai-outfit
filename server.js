/**
 * AI 穿搭预演工具 — 本地服务端
 * 作用：
 * 1. 静态托管 index.html
 * 2. /api/generate 作为 OpenAI DALL·E 代理，避免前端暴露 API Key
 *
 * 运行：
 *   node server.js
 * 或带环境变量：
 *   OPENAI_API_KEY=sk-xxx node server.js
 *
 * 端口：默认 3000，可通过 PORT 环境变量覆盖。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  let pathname = req.url === '/' ? '/index.html' : decodeURIComponent(req.url);
  const filePath = path.join(PUBLIC_DIR, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

async function handleGenerate(req, res) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const body = Buffer.concat(chunks).toString('utf-8');
      const data = JSON.parse(body || '{}');

      const provider = data.provider || 'pollinations';
      const prompt = data.prompt || 'A stylish fashion outfit.';
      const envKey = process.env.OPENAI_API_KEY;
      const apiKey = data.apiKey || envKey;

      // Pollinations 免费公共接口：直接返回可访问的图片 URL（无需 Key）
      if (provider === 'pollinations' || (provider !== 'openai' && !apiKey)) {
        const seed = Math.floor(Math.random() * 100000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&nologo=true&seed=${seed}`;
        return sendJson(res, 200, { url, provider: 'pollinations' });
      }

      const model = data.model || 'dall-e-3';
      const apiBase = (data.apiBase && data.apiBase.trim()) || 'https://api.openai.com/v1/images/generations';

      const openaiRes = await fetch(apiBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size: model === 'dall-e-3' ? '1024x1024' : '512x512'
        })
      });

      const json = await openaiRes.json();
      if (!openaiRes.ok) {
        return sendJson(res, openaiRes.status, { error: json.error });
      }
      return sendJson(res, 200, json);
    } catch (err) {
      sendJson(res, 500, { error: { message: err.message } });
    }
  });
}

/**
 * /api/enhance — 代理 DeepSeek（OpenAI 兼容 chat 接口），把所选单品写成精准英文图像提示词
 * 请求体：{ provider:'deepseek', apiKey, baseUrl, model, items, basePrompt }
 * 返回：{ prompt: '英文提示词' }
 */
async function handleEnhance(req, res) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
      const provider = data.provider || 'deepseek';
      const apiKey = data.apiKey || process.env.DEEPSEEK_API_KEY || '';
      if (provider !== 'deepseek' || !apiKey) {
        return sendJson(res, 400, { error: { message: '缺少 DeepSeek API Key' } });
      }
      const baseUrl = (data.baseUrl && data.baseUrl.trim()) || 'https://api.deepseek.com/chat/completions';
      const model = data.model || 'deepseek-chat';

      const items = Array.isArray(data.items) ? data.items : [];
      const itemList = items.map(i => {
        const desc = (i.description || '').trim();
        return `- ${i.name}（${i.color || ''}，${i.category}）${desc ? '：' + desc : ''}`;
      }).join('\n');

      const systemPrompt = 'You are a professional fashion stylist and prompt engineer. Given a list of selected clothing items, write a single, detailed, high-quality English image-generation prompt that describes a full-body photo of a model wearing exactly those items as a cohesive outfit. Be specific about garment types, colors, fit, and styling. Output ONLY the prompt text, no explanations, no quotes, no markdown.';
      const userPrompt = `Selected outfit items:\n${itemList}\n\nBase prompt (for reference):\n${data.basePrompt || ''}\n\nWrite the final English image-generation prompt.`;

      const upstream = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          stream: false
        })
      });

      const json = await upstream.json();
      if (!upstream.ok) {
        return sendJson(res, upstream.status, { error: json.error || { message: 'DeepSeek 调用失败' } });
      }
      const prompt = json.choices?.[0]?.message?.content?.trim();
      if (!prompt) return sendJson(res, 502, { error: { message: 'DeepSeek 未返回有效内容' } });
      return sendJson(res, 200, { prompt });
    } catch (err) {
      sendJson(res, 500, { error: { message: err.message } });
    }
  });
}

const server = http.createServer((req, res) => {
  // 简单 CORS，允许前端直接请求（本地开发场景）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/generate' && req.method === 'POST') {
    return handleGenerate(req, res);
  }
  if (req.url === '/api/enhance' && req.method === 'POST') {
    return handleEnhance(req, res);
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`AI 穿搭预演工具服务已启动：`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`生成接口：http://localhost:${PORT}/api/generate`);
  if (!process.env.OPENAI_API_KEY) {
    console.log(`提示：未检测到 OPENAI_API_KEY，前端将使用本地模拟生成。`);
  }
});
