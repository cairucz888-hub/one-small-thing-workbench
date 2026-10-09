(function exposeReviewEngine(root, factory) {
  const engine = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  }
  root.SmallThingReviewEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createReviewEngine() {
  const actionWords = [
    '写', '拍', '读', '改', '整理', '完成', '制作', '录', '复述', '检查', '提交',
    '发布', '列出', '选择', '分析', '复盘', '测试', '设计', '画', '联系', '运动',
    '跑', '走', '练', '剪', '提炼', '回答', '解决', '搭建', '梳理', '收集'
  ];
  const vagueOnlyWords = ['学习', '提升', '研究', '坚持', '努力', '继续', '了解', '思考', '准备', '做自媒体', '做产品'];
  const deliverableWords = [
    '文案', '视频', '笔记', '记录', '清单', '表格', '卡片', '模板', '截图', '链接',
    '音频', '复述', '方案', '标题', '选题', '脚本', '报告', '结果', '作品', '文字',
    '段落', '照片', '文件', '话术', '页面', '文章'
  ];
  const checkWords = ['检查', '判断', '对照', '是否', '验证', '标准', '清楚', '完整', '准确', '看懂'];

  const criteriaDefinitions = [
    {
      key: 'action',
      name: '具体动作',
      test: (text) => actionWords.some((word) => text.includes(word)) && !vagueOnlyWords.some((word) => text.trim() === word),
      pass: '已经写明今天具体要做什么。',
      fail: '现在更像目标或方向，还没有落到一个可以直接开始的动作。'
    },
    {
      key: 'quantity',
      name: '数量标准',
      test: (text) => /(\d+|[一二三四五六七八九十两半])[条篇段个件项位次页分钟小时字节题份张公里遍轮组]/.test(text),
      pass: '已经写明做多少、做几条或做多长时间。',
      fail: '没有数量边界，做到哪里算完成还不够清楚。'
    },
    {
      key: 'time',
      name: '当天可完成',
      test: (text) => /(今天|当天|\d+\s*(分钟|小时)|半小时|一小时|两小时|本次)/.test(text),
      pass: '范围能收进今天，适合形成日闭环。',
      fail: '没有写清时间范围，可能会变成持续多天的大任务。'
    },
    {
      key: 'deliverable',
      name: '完成物',
      test: (text) => deliverableWords.some((word) => text.includes(word)),
      pass: '做完以后能留下看得见的结果。',
      fail: '还没写明做完以后具体留下什么。'
    },
    {
      key: 'check',
      name: '检查点',
      test: (text) => checkWords.some((word) => text.includes(word)),
      pass: '已经写明做完以后要检查什么。',
      fail: '缺少检查方向，做完后不容易判断哪里需要改。'
    },
    {
      key: 'feedback',
      name: '反馈方式',
      test: (text) => /(反馈|复盘|评论|数据|回应|打分|请.{0,12}(AI|伙伴|朋友|老师|队长|用户)|发到.{0,8}(群|社群)|发布后|提交后)/.test(text),
      pass: '已经安排了复盘、数据或他人反馈。',
      fail: '缺少反馈来源，结果出来后还不知道好不好。'
    }
  ];

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function auditThing(text) {
    const normalized = cleanText(text);
    const criteria = criteriaDefinitions.map((criterion) => ({
      ...criterion,
      passed: criterion.test(normalized)
    }));
    return {
      text: normalized,
      criteria,
      score: criteria.filter((item) => item.passed).length,
      passed: criteria.every((item) => item.passed)
    };
  }

  function guessDeliverable(text) {
    const normalized = cleanText(text);
    const found = deliverableWords.find((word) => normalized.includes(word));
    if (found) return `1份可查看的${found}成果`;
    return '1份可查看的完成结果';
  }

  function hasQuantity(text) {
    return /(\d+|[一二三四五六七八九十两半])[条篇段个件项位次页分钟小时字节题份张公里遍轮组]/.test(cleanText(text));
  }

  function normalizeAction(action) {
    const normalized = cleanText(action);
    if (!normalized) return '';
    return hasQuantity(normalized) ? normalized : `完成1次“${normalized}”`;
  }

  function buildSmallThing({ time, obstacle, action, deliverable, feedback }) {
    const safeTime = cleanText(time);
    const safeObstacle = cleanText(obstacle);
    const safeAction = normalizeAction(action);
    const rawDeliverable = cleanText(deliverable);
    const safeDeliverable = hasQuantity(rawDeliverable)
      ? rawDeliverable
      : `1份可查看的结果：${rawDeliverable}`;
    const safeFeedback = cleanText(feedback);
    if (![safeTime, safeObstacle, safeAction, rawDeliverable, safeFeedback].every(Boolean)) return '';

    const check = `是否在${safeTime}内完成、是否留下${safeDeliverable}、是否真正推进了“${safeObstacle}”`;
    return `今天我用${safeTime}，围绕“${safeObstacle}”这个卡点，${safeAction}，留下${safeDeliverable}。做完后检查${check}；反馈方式是晚上复盘：${safeFeedback}。`;
  }

  return { cleanText, auditThing, guessDeliverable, hasQuantity, normalizeAction, buildSmallThing };
});
