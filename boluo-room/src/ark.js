'use strict';
// 方舟 Ark 数据面客户端：密钥仅从环境变量读取，结构化 JSON 输出，失败重试一次
const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_MODEL = process.env.BOLUO_ROOM_MODEL || 'doubao-seed-2-1-lite-260915';

function getApiKey() {
  const key = process.env.VOLCENGINE_ARK_API_KEY || process.env.ARK_API_KEY;
  if (!key) throw new Error('未找到 ARK API Key（环境变量 VOLCENGINE_ARK_API_KEY）');
  return key;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const REQUEST_TIMEOUT_MS = Number(process.env.BOLUO_REQUEST_TIMEOUT_MS || 60000);

async function rawChat(messages, temperature, maxTokens) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(ARK_BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getApiKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        thinking: { type: 'disabled' },
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: ac.signal
    });
  } catch (e) {
    clearTimeout(timer);
    const err = new Error('Ark 请求中止或网络错误: ' + e.name);
    err.transient = true;
    throw err;
  }
  clearTimeout(timer);
  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    const err = new Error('Ark 返回非 JSON（HTTP ' + resp.status + '）: ' + text.slice(0, 120));
    err.transient = resp.status >= 500;
    throw err;
  }
  if (!resp.ok || data.error) {
    const msg = data.error ? data.error.message : ('HTTP ' + resp.status);
    const err = new Error('Ark 调用失败: ' + msg);
    err.transient = resp.status >= 500 || (data.error && /rate|overload|busy|timeout/i.test(data.error.code || ''));
    throw err;
  }
  return data.choices[0].message.content;
}

// 对瞬时上游错误做指数退避重试
async function chat(messages, opts = {}) {
  const temperature = opts.temperature === undefined ? 0.4 : opts.temperature;
  const maxTokens = opts.maxTokens || 1800;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await rawChat(messages, temperature, maxTokens);
    } catch (e) {
      lastErr = e;
      if (!e.transient || attempt === 2) break;
      await sleep(500 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

// 容错解析：去围栏、去尾逗号，必要时截断到最后一个完整对象
function repairJson(text) {
  let s = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) throw new Error('未找到 JSON 对象');
  s = s.slice(first, last + 1).replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(s);
  } catch (_) {}
  for (let i = s.length - 1; i >= 0; i -= 1) {
    if (s[i] === '}') {
      try {
        return JSON.parse(s.slice(0, i + 1));
      } catch (_) {}
    }
  }
  throw new Error('JSON 无法修复');
}

function extractJson(text) {
  const obj = repairJson(text);
  if (!Array.isArray(obj.findings)) throw new Error('JSON 缺 findings 数组');
  return obj;
}

// 带一次重试的结构化调用
async function structured(system, userContext) {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: userContext }
  ];
  let raw;
  try {
    raw = await chat(messages);
    return extractJson(raw);
  } catch (e) {
    const retryMessages = messages.concat([
      { role: 'assistant', content: raw || '' },
      { role: 'user', content: '上一次输出无法解析。请只输出紧凑 JSON：最多 3 个 findings，detail 各不超过一句，不要代码围栏或解释。' }
    ]);
    const raw2 = await chat(retryMessages, { temperature: 0.2 });
    return extractJson(raw2);
  }
}

module.exports = { chat, structured, extractJson, DEFAULT_MODEL };
