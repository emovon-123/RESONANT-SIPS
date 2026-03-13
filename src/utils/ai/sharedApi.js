import { API_CONFIG } from '../../config/api.js';

export const callDeepSeekAPIHelper = async (prompt, options = {}) => {
  const config = API_CONFIG.deepseek;

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4096
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ DeepSeek API错误:', errorData);
    throw new Error(`DeepSeek API调用失败: ${response.status}`);
  }

  const data = await response.json();

  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message?.content || '';
  }

  throw new Error('DeepSeek返回格式异常');
};
