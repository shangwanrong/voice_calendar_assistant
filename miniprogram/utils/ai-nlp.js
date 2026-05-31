var config = require('./config')
var INTENT_TYPES = require('./constants').INTENT_TYPES
var nlp = require('./nlp')

var INTENT_MAP = {
  'add': INTENT_TYPES.ADD_EVENT,
  'delete': INTENT_TYPES.DELETE_EVENT,
  'query': INTENT_TYPES.QUERY_EVENT,
  'modify': INTENT_TYPES.MODIFY_EVENT,
  'set_reminder': INTENT_TYPES.SET_REMINDER,
  'unknown': INTENT_TYPES.UNKNOWN
}

var CATEGORY_MAP = {
  'meeting': 'meeting',
  'work': 'work',
  'life': 'life',
  'health': 'health',
  'study': 'study',
  'other': 'other'
}

var SYSTEM_PROMPT = '你是一个日历助手的NLP解析模块。请从用户的语音输入中提取结构化信息，以JSON格式返回。\n\n' +
  '返回格式：\n' +
  '{"intent":"add|delete|query|modify|set_reminder|unknown","date":"YYYY-MM-DD或null","startTime":"HH:MM或null","endTime":"HH:MM或null","title":"事件标题","category":"meeting|work|life|health|study|other","reminder":提前提醒分钟数或null,"note":"备注信息或null","recurrence":"daily|weekdays|weekly|monthly|none","recurrenceStart":"YYYY-MM-DD或null","recurrenceEnd":"YYYY-MM-DD或null","oldTitle":"修改时原事件标题或null","newDate":"修改后的日期YYYY-MM-DD或null","newStartTime":"修改后的时间HH:MM或null","newEndTime":"修改后的结束时间HH:MM或null","newTitle":"修改后的标题或null"}\n\n' +
  '规则：\n' +
  '1. 日期计算必须严格基于当前时间：明天=当前日期+1天，后天=+2天，昨天=-1天，上周=当前周-7天，下周=当前周+7天，下个月=当前月份+1（如当前5月则下个月是6月），上个月=当前月份-1\n' +
  '2. 时间转换为24小时制HH:MM格式，下午3点→15:00\n' +
  '3. 如果没有明确时间，startTime为null\n' +
  '4. title应简洁，只保留事件核心内容，去掉时间日期词和重复啰嗦的修饰\n' +
  '5. category根据内容判断：会议→meeting，工作→work，生活→life，健康→health，学习→study，其他→other\n' +
  '6. 对于modify意图：title是要修改的原事件标题，oldTitle也设为原事件标题；newDate/newStartTime/newEndTime/newTitle为修改后的新值，未提及的设为null\n' +
  '7. recurrence判断：\n' +
  '   - "每天/天天"→daily\n' +
  '   - "每天但周六周日不上课/工作日/周一到周五"→weekdays\n' +
  '   - "每周/每周X/礼拜X"→weekly\n' +
  '   - "每月"→monthly\n' +
  '   - 否则→none\n' +
  '8. recurrenceStart和recurrenceEnd：当用户指定了重复的起止范围时填写绝对日期，如"从下周一开始持续两周"则recurrenceStart=下周一的日期，recurrenceEnd=下周一+14天的日期；未指定范围则为null\n' +
  '9. note：提取地点（在XX）、人物（和XX）等额外信息放入note，没有则为null\n' +
  '10. 如果用户输入与日历管理无关（如问天气、聊天、指令操作等），intent设为unknown\n' +
  '11. 只返回纯JSON，不要返回markdown代码块或其他内容'

function parseWithAI(text, callback) {
  if (!config.DEEPSEEK_API_KEY) {
    callback(null, nlp.parse(text))
    return
  }

  var now = new Date()
  var weekDays = ['日', '一', '二', '三', '四', '五', '六']
  var currentDateTime = now.getFullYear() + '-' +
    (now.getMonth() + 1).toString().padStart(2, '0') + '-' +
    now.getDate().toString().padStart(2, '0') + ' ' +
    now.getHours().toString().padStart(2, '0') + ':' +
    now.getMinutes().toString().padStart(2, '0') + ' 星期' +
    weekDays[now.getDay()]

  var userPrompt = '当前时间：' + currentDateTime + '\n用户输入：' + text

  var called = false

  var requestTimer = setTimeout(function () {
    if (called) return
    called = true
    console.warn('DeepSeek请求超时，使用本地NLP')
    callback(null, nlp.parse(text))
  }, 6000)

  wx.request({
    url: (config.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1') + '/chat/completions',
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.DEEPSEEK_API_KEY
    },
    data: {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 300
    },
    success: function (res) {
      clearTimeout(requestTimer)
      if (called) return
      called = true

      if (res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message) {
        var content = res.data.choices[0].message.content.trim()
        console.log('DeepSeek响应: ' + content)
        var parseResult = parseAIResponse(content, text)
        callback(null, parseResult)
      } else {
        console.warn('DeepSeek响应异常，使用本地NLP')
        callback(null, nlp.parse(text))
      }
    },
    fail: function (err) {
      clearTimeout(requestTimer)
      if (called) return
      called = true
      console.warn('DeepSeek请求失败，使用本地NLP', err)
      callback(null, nlp.parse(text))
    }
  })
}

function parseAIResponse(content, rawText) {
  try {
    var jsonStr = content
    var jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    var aiResult = JSON.parse(jsonStr)

    var intent = INTENT_MAP[aiResult.intent] || INTENT_TYPES.UNKNOWN
    var entities = {}

    entities.date = aiResult.date || null
    entities.startTime = aiResult.startTime || null
    entities.endTime = aiResult.endTime || null
    entities.title = aiResult.title || '未命名事件'
    entities.category = CATEGORY_MAP[aiResult.category] || 'other'
    entities.note = aiResult.note || null
    entities.recurrence = aiResult.recurrence || 'none'
    entities.recurrenceStart = aiResult.recurrenceStart || null
    entities.recurrenceEnd = aiResult.recurrenceEnd || null

    if (aiResult.reminder !== null && aiResult.reminder !== undefined) {
      entities.reminder = aiResult.reminder
    }

    if (intent === INTENT_TYPES.MODIFY_EVENT) {
      entities.oldTitle = aiResult.oldTitle || aiResult.title || null
      entities.newDate = aiResult.newDate || null
      entities.newStartTime = aiResult.newStartTime || null
      entities.newEndTime = aiResult.newEndTime || null
      entities.newTitle = aiResult.newTitle || null
    }

    return {
      intent: intent,
      entities: entities,
      confidence: intent === INTENT_TYPES.UNKNOWN ? 0.3 : 0.95,
      rawText: rawText
    }
  } catch (e) {
    console.warn('AI响应解析失败，使用本地NLP', e)
    return nlp.parse(rawText)
  }
}

module.exports = {
  parseWithAI: parseWithAI
}
