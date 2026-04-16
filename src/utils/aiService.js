// AI对话API服务
import { API_CONFIG, getActiveAPIType, generatePrompt, PROMPT_TYPES, DEBUG_CONFIG } from '../config/api.js';

export {
  generateCustomerAvatar,
  generateCustomer,
  generateCustomerFromCharacterId,
  generateCustomerWithCharacterPool,
  generateDailyCustomers,
} from './ai/customerGeneration.js';
export { generateDailyAtmosphere } from './ai/atmosphereGeneration.js';
export { generateBarEvent } from './ai/eventGeneration.js';

/**
 * 🆕 后处理：去除 AI 回复中的动作描写/旁白，只保留台词
 * 策略：
 * 1. 如果回复中有引号包裹的内容，提取引号内的台词
 * 2. 去除常见的动作描写前缀（如"她轻叹一声，"）
 */
const stripNarration = (text) => {
  if (!text) return text;

  // 策略1：如果有中文引号包裹的台词，提取引号内容
  // 匹配 "..." 或 「...」
  const quoteMatches = text.match(/["\u201c]([^"\u201d]+)["\u201d]/g);
  if (quoteMatches && quoteMatches.length > 0) {
    // 提取所有引号内的内容
    const dialogues = quoteMatches
      .map(q => q.replace(/["\u201c\u201d]/g, '').trim())
      .filter(d => d.length > 0);
    if (dialogues.length > 0 && dialogues.join('').length > 5) {
      return dialogues.join('');
    }
  }

  // 策略2：去除开头的动作描写
  // 匹配模式：中文名字/代词 + 动作描写 + 逗号/句号，然后才是台词
  const narrationPrefix = /^[\u4e00-\u9fff·]{1,8}(?:轻轻|微微|缓缓|默默|静静|悄悄)?(?:地)?(?:叹了口气|轻叹|叹息|低头|抬头|望向|看着|目光|微笑|苦笑|摇头|点头|沉默|停顿|放下|拿起|转身|靠|坐|站|笑了笑|眯起眼|低声|抿嘴|咬唇|皱眉|耸肩|摆手|挥手|揉|捏|握|攥|垂|拢)[^。！？…]*[，,。\.]\s*/;
  let cleaned = text.replace(narrationPrefix, '');

  // 如果几乎全被清掉了，返回原文
  if (cleaned.length < 5) return text;

  return cleaned;
};

// 模拟AI回应（用于测试）
const mockAIResponse = async (prompt, aiConfig, trustLevel) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, API_CONFIG.mock.responseDelay));
  
  // 根据AI类型和信任度生成不同回应
  const responses = {
    workplace: {
      low: [
        "工作上的事情，都在正常推进，没什么特别的。",
        "我处理得很好，不用担心。谢谢关心。",
        "只是有点累，休息一下就好了。"
      ],
      medium: [
        "其实...最近项目压力确实有点大，但我能应付。",
        "有时候会觉得，这样的生活是不是少了点什么。",
        "不太想承认，但偶尔确实会感到孤独。"
      ],
      high: [
        "我已经很久没有好好休息了，每天都在追赶deadline。",
        "说实话，我有时候会问自己，这么拼命到底是为了什么。",
        "我也想找个人聊聊，但办公室里谁会真的关心这些呢。"
      ]
    },
    artistic: {
      low: [
        "灯光在酒杯里折射，像是被困住的时光碎片...",
        "你说人的记忆会像酒一样，越久越醇吗？",
        "有些话说出来就变味了，所以我宁愿藏在心里。"
      ],
      medium: [
        "我总是在想，如果当年选择了另一条路，现在会是什么样子。",
        "梦想这种东西，是不是就像海市蜃楼，越追越远？",
        "过去的事就像老照片，看得见摸不着，却总是让人怀念。"
      ],
      high: [
        "我其实一直活在过去的影子里，不敢面对现在的自己。",
        "那些未完成的梦想，每天晚上都会来找我，问我为什么放弃。",
        "我想要的未来和怀念的过去，在心里拉扯，让我无法前进。"
      ]
    },
    newbie: {
      low: [
        "呜呜我真的好慌啊！老板你这里看起来好安全...",
        "我是不是特别笨啊？为什么别人都做得好好的，就我不行...",
        "你会觉得我很烦吗？我、我不是故意的..."
      ],
      medium: [
        "其实我也知道自己太依赖别人了，但是我就是害怕一个人面对...",
        "每次遇到困难我就想逃，我是不是永远也长不大了？",
        "我好羡慕那些什么都不怕的人，他们是怎么做到的呀？"
      ],
      high: [
        "我真的很害怕失败，害怕被别人嘲笑，害怕证明自己真的很没用...",
        "老板，我能一直躲在这里吗？外面的世界好可怕...",
        "我知道总要自己面对，但是...你能陪着我吗？哪怕一小会儿..."
      ]
    }
  };
  
  const level = trustLevel < 0.3 ? 'low' : trustLevel < 0.6 ? 'medium' : 'high';
  const aiResponses = responses[aiConfig.id] || responses.workplace;
  const responseList = aiResponses[level];
  
  return responseList[Math.floor(Math.random() * responseList.length)];
};

// 调用AI API（支持流式响应）
// onStreamChunk: (fullText, newChunk) => void - 可选的流式回调函数
export const callAIAPI = async (type, params, onStreamChunk = null) => {
  const apiType = getActiveAPIType();
  const prompt = generatePrompt(type, params);
  
  if (DEBUG_CONFIG.logPrompts) {
    console.log('=== AI Prompt ===');
    console.log('Type:', type);
    console.log('API Type:', apiType);
    console.log('Streaming:', !!onStreamChunk);
    console.log('Prompt:', prompt);
    console.log('================');
  }
  
  try {
    if (apiType === 'deepseek') {
      // DeepSeek API（支持流式）
      return await callDeepSeekAPI(prompt, onStreamChunk);
    } else if (apiType === 'gemini') {
      // Google Gemini API（支持流式）
      return await callGeminiAPI(prompt, onStreamChunk);
    } else if (apiType === 'mock') {
      // 模拟模式（模拟流式效果）
      const response = await mockAIResponse(prompt, params.aiConfig, params.trustLevel);
      if (onStreamChunk) {
        // 模拟逐字输出效果
        for (let i = 0; i < response.length; i++) {
          await new Promise(r => setTimeout(r, 30));
          onStreamChunk(response.slice(0, i + 1), response[i]);
        }
      }
      return response;
    } else if (apiType === 'xunfei') {
      // 讯飞星火API
      return await callXunfeiAPI(prompt);
    } else if (apiType === 'baidu') {
      // 百度文心一言API
      return await callBaiduAPI(prompt);
    }
  } catch (error) {
    console.error('AI API调用失败:', error);
    // 失败时降级为模拟模式
    return await mockAIResponse(prompt, params.aiConfig, params.trustLevel || 0.5);
  }
};

// DeepSeek API调用（支持流式响应）
const callDeepSeekAPI = async (prompt, onStreamChunk = null) => {
  const config = API_CONFIG.deepseek;
  
  try {
    // 如果提供了流式回调，使用流式API
    if (onStreamChunk) {
      return await callDeepSeekAPIStreaming(prompt, onStreamChunk);
    }
    
    console.log('🔵 DeepSeek API调用开始');
    console.log('📝 Prompt长度:', prompt.length, '字符');
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 4096
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ DeepSeek API错误:', errorData);
      throw new Error(`DeepSeek API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (DEBUG_CONFIG.logPrompts) {
      console.log('=== DeepSeek Response ===');
      console.log('Full Response:', data);
      if (data.usage) {
        console.log('📊 Token使用:', data.usage);
      }
      console.log('========================');
    }
    
    // 提取回应文本
    if (data.choices && data.choices.length > 0) {
      let text = data.choices[0].message?.content || '';
      console.log('✅ DeepSeek原始返回:', text);
      
      // 清理文本
      text = text.trim();
      
      // 移除可能的前缀和引号
      text = text.replace(/^(我说|我回答|林澈说|林澈|苏瑾说|苏瑾|小夏说|小夏|我：|回复：|[""])\s*/g, '');
      text = text.replace(/[""]$/g, ''); // 移除结尾引号
      
      // 检查句子是否完整
      if (!/[。！？.!?…]$/.test(text)) {
        text = text + '。';
      }
      
      // 后处理：去除动作描写/旁白，只保留台词
      text = stripNarration(text);
      
      console.log('✅ 最终返回:', text);
      
      if (!text || text.trim().length === 0) {
        throw new Error('API返回空内容');
      }
      
      return text;
    }
    
    console.error('❌ 响应格式异常:', data);
    throw new Error('DeepSeek返回格式异常');
  } catch (error) {
    console.error('❌ DeepSeek API调用失败:', error);
    throw error;
  }
};

// DeepSeek 流式API调用
const callDeepSeekAPIStreaming = async (prompt, onStreamChunk) => {
  const config = API_CONFIG.deepseek;
  
  console.log('🔵 DeepSeek 流式API调用开始');
  console.log('📝 Prompt长度:', prompt.length, '字符');
  
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 4096,
      stream: true
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ DeepSeek 流式API错误:', errorText);
    throw new Error(`DeepSeek API调用失败: ${response.status}`);
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('✅ 流式响应完成，总长度:', fullText.length);
        break;
      }
      
      // 解码并添加到缓冲区
      buffer += decoder.decode(value, { stream: true });
      
      // 处理SSE格式的数据（以 "data: " 开头的行）
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const data = JSON.parse(jsonStr);
              if (data.choices?.[0]?.delta?.content) {
                const chunk = data.choices[0].delta.content;
                fullText += chunk;
                
                // 调用回调函数，传递当前累积的文本
                if (onStreamChunk) {
                  onStreamChunk(fullText, chunk);
                }
              }
            } catch (e) {
              // 忽略解析错误，可能是不完整的JSON
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  // 清理和返回完整文本
  let text = fullText.trim();
  
  // 移除可能的前缀和引号
  text = text.replace(/^(我说|我回答|林澈说|林澈|苏瑾说|苏瑾|小夏说|小夏|我：|回复：|[""])\s*/g, '');
  text = text.replace(/[""]$/g, '');
  
  // 确保句子完整
  if (!/[。！？.!?…]$/.test(text)) {
    text = text + '。';
  }
  
  // 后处理：去除动作描写/旁白
  text = stripNarration(text);
  
  console.log('✅ 流式响应最终结果:', text);
  return text;
};

// Google Gemini API调用（支持流式响应）
const callGeminiAPI = async (prompt, onStreamChunk = null) => {
  const config = API_CONFIG.gemini;
  try {
    if (config.openaiCompatible) {
      return await callGeminiViaOpenAICompatible(prompt, onStreamChunk);
    }

    // 如果提供了流式回调，使用流式API
    if (onStreamChunk) {
      return await callGeminiAPIStreaming(prompt, onStreamChunk);
    }

    const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;

    console.log('🔵 Gemini API调用开始');
    console.log('📝 Prompt长度:', prompt.length, '字符');

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.75,
        topK: 30,
        topP: 0.88,
        maxOutputTokens: 4096,
        candidateCount: 1,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store',
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Gemini API错误:', errorData);
      throw new Error(`Gemini API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (DEBUG_CONFIG.logPrompts) {
      console.log('=== Gemini Response ===');
      console.log('Full Response:', data);
      if (data.usageMetadata) {
        console.log('📊 Token使用:', data.usageMetadata);
      }
      console.log('=====================');
    }
    
    // 提取回应文本
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      // 检查截断原因
      console.log('📊 对话finishReason:', candidate.finishReason);
      
      // 检查是否被安全过滤阻止
      if (candidate.finishReason === 'SAFETY') {
        console.warn('⚠️ 响应被安全过滤阻止');
        console.log('安全评级:', candidate.safetyRatings);
        throw new Error('内容被安全过滤阻止，请尝试调整prompt');
      }
      
      // 检查是否因token限制被截断
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('⚠️ 对话响应因token限制被截断');
      }
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        let text = candidate.content.parts[0].text;
        console.log('✅ Gemini原始返回:', text);
        
        // 清理文本
        text = text.trim();
        
        // 移除可能的前缀和引号
        text = text.replace(/^(我说|我回答|林澈说|林澈|苏瑾说|苏瑾|小夏说|小夏|我：|回复：|[""])\s*/g, '');
        text = text.replace(/[""]$/g, ''); // 移除结尾引号
        
        // 检查句子是否完整
        const hasProperEnding = /[。！？.!?]$/.test(text);
        
        if (!hasProperEnding) {
          console.warn('⚠️ 检测到不完整的句子:', text);
          
          // 扩展的不完整词列表
          const incompleteWords = [
            '还', '有', '很', '的', '地', '得',  // 单字不完整
            '下的', '中的', '上的', '时的',      // X的结构
            '让', '使', '而', '但', '却',        // 连词
            '感觉', '觉得', '认为', '希望',      // 感受词（如果是最后就不完整）
            '口感', '味道', '氛围',              // 名词（如果后面没有动词就不完整）
          ];
          
          // 检查是否以不完整词结尾
          let isIncomplete = incompleteWords.some(word => {
            return text.endsWith(word) || text.endsWith(word + '。');
          });
          
          if (isIncomplete) {
            console.log('🔍 检测到典型不完整模式，尝试修复...');
            
            // 找到最后一个句号或逗号之前的内容
            const lastPeriod = text.lastIndexOf('。');
            const lastComma = text.lastIndexOf('，');
            
            if (lastPeriod > 0) {
              // 有完整句子，直接截取到句号
              text = text.substring(0, lastPeriod + 1);
              console.log('✅ 截取到上一个句号');
            } else if (lastComma > text.length * 0.3) {
              // 有逗号且位置合理，截取到逗号前加句号
              text = text.substring(0, lastComma) + '。';
              console.log('✅ 截取到逗号位置');
            } else {
              // 找不到合适的截断点，删除不完整的词
              for (const word of incompleteWords) {
                if (text.endsWith(word)) {
                  // 移除不完整词，查找前面的字
                  const withoutWord = text.substring(0, text.length - word.length).trim();
                  // 如果移除后还有内容，并且以有效字符结尾
                  if (withoutWord.length > 5 && /[\u4e00-\u9fa5a-zA-Z]$/.test(withoutWord)) {
                    text = withoutWord + '。';
                    console.log('✅ 移除不完整词并添加句号');
                    break;
                  }
                }
              }
            }
          } else {
            // 没有检测到特定不完整词，说明句子本身是完整的，只是缺少标点
            // 直接添加省略号或句号，保留原始内容
            const lastChar = text[text.length - 1];
            
            // 如果以逗号结尾，可能是省略效果
            if (lastChar === '，' || lastChar === ',') {
              text = text.substring(0, text.length - 1) + '……';
              console.log('✅ 逗号转省略号');
            } else if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(lastChar)) {
              // 以正常字符结尾，添加省略号表示未尽之意
              text = text + '……';
              console.log('✅ 添加省略号');
            } else {
              text = text + '。';
              console.log('✅ 添加句号');
            }
          }
        }
        
        // 最后再检查一次是否以标点结尾（包含省略号）
        if (!/[。！？.!?…]$/.test(text)) {
          text = text + '。';
        }
        
        // 🆕 后处理：去除动作描写/旁白，只保留台词
        text = stripNarration(text);
        
        console.log('✅ 最终返回:', text);
        
        if (!text || text.trim().length === 0) {
          throw new Error('API返回空内容');
        }
        
        return text;
      }
    }
    
    console.error('❌ 响应格式异常:', data);
    throw new Error('Gemini返回格式异常');
  } catch (error) {
    console.error('❌ Gemini API调用失败:', error);
    throw error;
  }
};

const callGeminiViaOpenAICompatible = async (prompt, onStreamChunk = null) => {
  const config = API_CONFIG.gemini;
  const endpoint = String(config.endpoint || '').replace(/\/$/, '');
  const url = `${endpoint}/chat/completions`;

  if (onStreamChunk) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 4096,
        frequency_penalty: 0.4,
        presence_penalty: 0.2,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini(OpenAI兼容)调用失败: ${response.status} ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const data = JSON.parse(payload);
            const chunk = data?.choices?.[0]?.delta?.content || '';
            if (!chunk) continue;
            fullText += chunk;
            onStreamChunk(fullText, chunk);
          } catch {
            // ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    let text = fullText.trim();
    text = text.replace(/^(我说|我回答|我：|回复：|["“])\s*/g, '');
    text = text.replace(/["”]$/g, '');
    if (!/[。！？.!?…]$/.test(text)) text += '。';
    return stripNarration(text);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 4096,
      frequency_penalty: 0.4,
      presence_penalty: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini(OpenAI兼容)调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  let text = data?.choices?.[0]?.message?.content || '';
  text = String(text).trim();
  text = text.replace(/^(我说|我回答|我：|回复：|["“])\s*/g, '');
  text = text.replace(/["”]$/g, '');
  if (!/[。！？.!?…]$/.test(text)) text += '。';
  text = stripNarration(text);
  if (!text) throw new Error('Gemini(OpenAI兼容)返回空内容');
  return text;
};

// Google Gemini 流式API调用
const callGeminiAPIStreaming = async (prompt, onStreamChunk) => {
  const config = API_CONFIG.gemini;
  const url = `${config.endpoint}/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;

  console.log('🔵 Gemini 流式API调用开始');
  console.log('📝 Prompt长度:', prompt.length, '字符');

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.75,
      topK: 30,
      topP: 0.88,
      maxOutputTokens: 4096,
      candidateCount: 1,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gemini 流式API错误:', errorText);
    throw new Error(`Gemini API调用失败: ${response.status}`);
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('✅ 流式响应完成，总长度:', fullText.length);
        break;
      }
      
      // 解码并添加到缓冲区
      buffer += decoder.decode(value, { stream: true });
      
      // 处理SSE格式的数据（以 "data: " 开头的行）
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const data = JSON.parse(jsonStr);
              if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const chunk = data.candidates[0].content.parts[0].text;
                fullText += chunk;
                
                // 调用回调函数，传递当前累积的文本
                if (onStreamChunk) {
                  onStreamChunk(fullText, chunk);
                }
              }
            } catch (e) {
              // 忽略解析错误，可能是不完整的JSON
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  // 清理和返回完整文本
  let text = fullText.trim();
  
  // 移除可能的前缀和引号
  text = text.replace(/^(我说|我回答|林澈说|林澈|苏瑾说|苏瑾|小夏说|小夏|我：|回复：|[""])\s*/g, '');
  text = text.replace(/[""]$/g, '');
  
  // 确保句子完整
  if (!/[。！？.!?…]$/.test(text)) {
    text = text + '。';
  }
  
  // 🆕 后处理：去除动作描写/旁白
  text = stripNarration(text);
  
  console.log('✅ 流式响应最终结果:', text);
  return text;
};

// 讯飞星火API调用（WebSocket）
const callXunfeiAPI = async (prompt) => {
  // TODO: 实现讯飞星火API调用
  // 这里需要WebSocket连接和签名验证
  console.warn('讯飞星火API尚未实现，使用模拟模式');
  return await mockAIResponse(prompt, {}, 0.5);
};

// 百度文心一言API调用
const callBaiduAPI = async (prompt) => {
  const config = API_CONFIG.baidu;
  
  try {
    // 1. 获取access_token
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`,
      { method: 'POST' }
    );
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // 2. 调用对话API
    const response = await fetch(
      `${config.endpoint}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      }
    );
    
    const data = await response.json();
    return data.result || '...';
  } catch (error) {
    console.error('百度API调用失败:', error);
    throw error;
  }
};

export {
  callAIForCocktailJudgmentWithEmotionChange,
  callAIForCocktailJudgment,
  callAIForEmotionChange,
  callAIForTrustJudgment,
} from './ai/judgmentService.js';
export { generateQuickOptions } from './ai/quickOptions.js';
