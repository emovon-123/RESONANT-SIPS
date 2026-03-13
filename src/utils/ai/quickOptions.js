export const generateQuickOptions = (aiConfig, trustLevel, dialogueHistory) => {
  // 使用 categoryId 匹配（兼容模板顾客的 id 和生成顾客的 categoryId）
  const category = aiConfig.categoryId || aiConfig.id || 'workplace';
  
  const baseOptions = {
    workplace: {
      low: [
        "最近工作还顺利吗？",
        "你看起来有点疲惫",
        "今天过得怎么样？"
      ],
      medium: [
        "压力很大吧？",
        "有什么让你困扰的事吗？",
        "工作之外的你是什么样的？"
      ],
      high: [
        "你真正想要的生活是什么样的？",
        "如果不用考虑别人，你会怎么选？",
        "我能为你做些什么？"
      ]
    },
    artistic: {
      low: [
        "你说的这些，让我想多听一听",
        "这个说法很特别，是因为什么呢？",
        "听起来你心里装着不少事"
      ],
      medium: [
        "我不确定完全懂你的意思，但我在听",
        "你提到的那些……是现在正在经历的吗？",
        "你更想聊聊过去，还是现在？"
      ],
      high: [
        "你真正想说的，是不是还没说出口？",
        "如果把感受直接说出来，会是什么？",
        "我觉得你一直在绕着什么走"
      ]
    },
    student: {
      low: [
        "别着急，慢慢说就好",
        "发生什么事了？",
        "你看起来心事重重"
      ],
      medium: [
        "你最担心的是什么？",
        "有人陪你聊过这些吗？",
        "我会一直在这里听你说"
      ],
      high: [
        "你其实已经很努力了",
        "不管怎样，你能来这里就很好",
        "让我陪你待一会儿"
      ]
    },
    midlife: {
      low: [
        "坐下来喝一杯吧",
        "今天外面怎么样？",
        "你来这里多久了？"
      ],
      medium: [
        "有些事放在心里是不是很久了？",
        "你有没有跟别人说过这些？",
        "累了就歇歇，不着急"
      ],
      high: [
        "你觉得什么才是最重要的？",
        "如果时间能倒回去，你想对那时的自己说什么？",
        "有些路绕了也没关系"
      ]
    },
    // 兼容旧的模板顾客ID
    newbie: {
      low: [
        "别怕，慢慢说",
        "发生什么事了？",
        "你看起来需要有人听你说说"
      ],
      medium: [
        "你最害怕的是什么？",
        "有人陪你聊过这些吗？",
        "我会一直在这里的"
      ],
      high: [
        "你已经很勇敢了",
        "不管结果怎样，你能来这里就很好",
        "让我陪你一起面对"
      ]
    }
  };
  
  const level = trustLevel < 0.3 ? 'low' : trustLevel < 0.6 ? 'medium' : 'high';
  const options = baseOptions[category]?.[level] || baseOptions.workplace[level] || baseOptions.workplace.low;
  
  // 从对话历史中提取上下文，为高隐喻顾客动态调整一个选项
  const metaphorLvl = aiConfig.metaphorLevel || 'none';
  if (metaphorLvl === 'high' && dialogueHistory && dialogueHistory.length > 0) {
    const lastAiMsg = [...dialogueHistory].reverse().find(d => d.role === 'ai');
    if (lastAiMsg && lastAiMsg.content) {
      // 如果顾客最后一句话很长或含有比喻词，追加一个"请解释"类选项
      const hasMetaphor = /像|如同|仿佛|好比|似乎|大概|也许|或许|……/.test(lastAiMsg.content);
      if (hasMetaphor) {
        const contextualOption = trustLevel < 0.5 
          ? "你刚才说的……能再解释一下吗？" 
          : "我在想你刚才那句话的意思";
        // 替换最后一个选项为上下文相关选项
        const result = [...options];
        result[result.length - 1] = contextualOption;
        return result;
      }
    }
  }
  
  return [...options];
};

// 随机中文名池（避免 AI 不可用时总出现同一个人）
