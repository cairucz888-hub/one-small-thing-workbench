const assert = require('node:assert/strict');
const { auditThing, buildSmallThing, normalizeAction } = require('./review-engine.js');

const vague = auditThing('继续和AI对话');
assert.equal(vague.passed, false);
assert.equal(vague.criteria.find((item) => item.key === 'action').passed, false);

const partial = auditThing('我今天用AI帮我改一段文案');
assert.equal(partial.passed, false);
assert.equal(partial.criteria.find((item) => item.key === 'check').passed, false);
assert.equal(partial.criteria.find((item) => item.key === 'feedback').passed, false);

const complete = auditThing(
  '今天我用45分钟，完成写出3个开头钩子，留下1份钩子清单。做完后检查是否点中人群、痛点和结果；反馈方式是发到群里，请2位伙伴选出最想看的1条。'
);
assert.equal(complete.passed, true);
assert.equal(complete.score, 6);

assert.equal(normalizeAction('联系一位老用户'), '联系一位老用户');
assert.equal(normalizeAction('整理用户问题'), '完成1次“整理用户问题”');

const guided = buildSmallThing({
  time: '60分钟',
  obstacle: '不知道今天该拍什么',
  action: '写出3个短视频选题',
  deliverable: '1份选题清单',
  feedback: '请AI复盘，并选出最值得拍的1条'
});
assert.equal(auditThing(guided).passed, true);

console.log('review-engine: 6 cases passed');
