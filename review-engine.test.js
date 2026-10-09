const assert = require('node:assert/strict');
const { auditThing } = require('./review-engine.js');

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

console.log('review-engine: 3 cases passed');
