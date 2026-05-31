var config = require('./config')
var INTENT_TYPES = require('./constants').INTENT_TYPES
var nlp = require('./nlp')

var INTENT_MAP = {
  'add': INTENT_TYPES.ADD_EVENT,
  'delete': INTENT_TYPES.DELETE_EVENT,
  'query': INTENT_TYPES.QUERY_EVENT,
  'modify': INTENT_TYPES.MODIFY_EVENT,
  'set_reminder': INTENT_TYPES.SET_REMINDER
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
  '{"intent":"add|delete|query|modify|set_reminder","date":"YYYY-MM-DD或null","startTime":"HH:MM或null","endTime":"HH:MM或null","title":"事件标题","category":"meeting|work|life|health|study|other","reminder":提前提醒分钟数或null}\n\n' +
  '规则：\n' +
  '1. 相对日期（明天、后天、下周三等）必须根据当前时间转换为绝对日期YYYY-MM-DD\n' +
  '2. 时间转换为24小时制HH:MM格式，下午3点→15:00\n' +
  '3. 如果没有明确时间，startTime为null\n' +
  '4. title应简洁，只保留事件核心内容，去掉时间日期词\n' +
  '5. category根据内容判断：会议→meeting，工作→work，生活→life，健康→health，学习→study，其他→other\n' +
  '6. 只返回纯JSON，不要返回markdown代码块或其他内容'

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

    var intent = INTENT_MAP[aiResult.intent] || INTENT_TYPES.ADD_EVENT
    var entities = {}

    entities.date = aiResult.date || null
    entities.startTime = aiResult.startTime || null
    entities.endTime = aiResult.endTime || null
    entities.title = aiResult.title || '未命名事件'
    entities.category = CATEGORY_MAP[aiResult.category] || 'other'
    if (aiResult.reminder !== null && aiResult.reminder !== undefined) {
      entities.reminder = aiResult.reminder
    }

    return {
      intent: intent,
      entities: entities,
      confidence: 0.95,
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
