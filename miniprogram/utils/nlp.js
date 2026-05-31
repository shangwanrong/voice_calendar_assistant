var INTENT_TYPES = require('./constants').INTENT_TYPES
var CATEGORY_KEYWORDS = require('./constants').CATEGORY_KEYWORDS
var timeParser = require('./time-parser')

var ADD_KEYWORDS = ['添加', '新增', '安排', '定', '有', '加', '建', '创建', '设置', '记', '提醒我']
var DELETE_KEYWORDS = ['删除', '取消', '去掉', '删掉', '移除', '不要']
var QUERY_KEYWORDS = ['什么', '安排', '日程', '事件', '有哪些', '有没有', '几件', '多少']
var MODIFY_KEYWORDS = ['修改', '改', '调整', '换成', '改为', '改到', '变更']
var REMINDER_KEYWORDS = ['提醒', '之前', '提前']

function classifyIntent(text) {
  var hasDelete = DELETE_KEYWORDS.some(function (k) { return text.indexOf(k) >= 0 })
  if (hasDelete) return INTENT_TYPES.DELETE_EVENT

  var hasModify = MODIFY_KEYWORDS.some(function (k) { return text.indexOf(k) >= 0 })
  if (hasModify) return INTENT_TYPES.MODIFY_EVENT

  var hasReminder = REMINDER_KEYWORDS.some(function (k) { return text.indexOf(k) >= 0 })
  var hasTimeBefore = text.match(/前\d*(分钟|小时)/)
  if (hasReminder && hasTimeBefore) return INTENT_TYPES.SET_REMINDER

  var hasQuery = QUERY_KEYWORDS.some(function (k) { return text.indexOf(k) >= 0 })
  var hasTimeWord = text.match(/今天|明天|后天|昨天|前天|上周|这周|下周|这月|本月/)
  if (hasQuery && hasTimeWord) return INTENT_TYPES.QUERY_EVENT

  var hasTime = text.match(/\d+[点时:：]|上午|下午|早上|晚上|中午|凌晨/)
  var hasDate = text.match(/今天|明天|后天|大后天|昨天|前天|上周|周[一二三四五六日天]|下周|这周|\d+月\d+/)
  var hasAdd = ADD_KEYWORDS.some(function (k) { return text.indexOf(k) >= 0 })

  if (hasTime || hasDate || hasAdd) return INTENT_TYPES.ADD_EVENT

  if (hasQuery) return INTENT_TYPES.QUERY_EVENT

  return INTENT_TYPES.ADD_EVENT
}

function extractDate(text) {
  var datePatterns = [
    /今天|明天|明日|后天|大后天/,
    /(这|上|下)(周|星期)(一|二|三|四|五|六|日|天)/,
    /\d{1,2}月\d{1,2}[号日]/,
    /\d{4}年\d{1,2}月\d{1,2}[号日]?/
  ]

  for (var i = 0; i < datePatterns.length; i++) {
    var match = text.match(datePatterns[i])
    if (match) {
      var date = timeParser.getRelativeDate(match[0])
      if (date) return timeParser.formatDate(date)
    }
  }

  return timeParser.formatDate(new Date())
}

function extractTime(text) {
  var timePatterns = [
    /(凌晨|早上|上午|中午|下午|晚上|夜里|深夜)?\d{1,2}[点时:：]\d{1,2}分?/,
    /(凌晨|早上|上午|中午|下午|晚上|夜里|深夜)?\d{1,2}[点时](半|一刻|差一刻)/,
    /(凌晨|早上|上午|中午|下午|晚上|夜里|深夜)?\d{1,2}[点时]/,
    /上午|下午|早上|晚上|中午|凌晨/
  ]

  for (var i = 0; i < timePatterns.length; i++) {
    var match = text.match(timePatterns[i])
    if (match) {
      var time = timeParser.parseTimeStr(match[0])
      if (time) return time
    }
  }

  return null
}

function extractTitle(text) {
  var cleaned = text
  cleaned = cleaned.replace(/(添加|新增|安排|定|有|加|建|创建|设置|记|提醒我|删除|取消|去掉|删掉|移除|修改|改|调整)/g, '')
  cleaned = cleaned.replace(/(今天|明天|后天|大后天|昨天|前天|这周|上周|下周|本月)/g, '')
  cleaned = cleaned.replace(/(这|上|下)(周|星期)(一|二|三|四|五|六|日|天)/g, '')
  cleaned = cleaned.replace(/\d{4}年/g, '')
  cleaned = cleaned.replace(/\d{1,2}月\d{1,2}[号日]/g, '')
  cleaned = cleaned.replace(/(凌晨|早上|上午|中午|下午|晚上|夜里|深夜)?\d{1,2}[点时:：]\d{1,2}分?/g, '')
  cleaned = cleaned.replace(/(凌晨|早上|上午|中午|下午|晚上|夜里|深夜)?\d{1,2}[点时](半|一刻|差一刻)/g, '')
  cleaned = cleaned.replace(/(凌晨|早上|上午|中午|下午|晚上|夜里|深夜)?\d{1,2}[点时]/g, '')
  cleaned = cleaned.replace(/(上午|下午|早上|晚上|中午|凌晨)/g, '')
  cleaned = cleaned.replace(/(什么|安排|日程|事件|有哪些|有没有|几件|多少|的)/g, '')
  cleaned = cleaned.replace(/(之前|提前|提醒|\d+分钟|\d+小时)/g, '')
  cleaned = cleaned.replace(/\s+/g, '')
  cleaned = cleaned.replace(/[，。！？、；：""''【】（）\.,!?;:]/g, '')

  return cleaned.trim() || '未命名事件'
}

function guessCategory(title) {
  for (var cat in CATEGORY_KEYWORDS) {
    var keywords = CATEGORY_KEYWORDS[cat]
    for (var i = 0; i < keywords.length; i++) {
      if (title.indexOf(keywords[i]) >= 0) return cat
    }
  }
  return 'other'
}

function extractReminder(text) {
  var minuteMatch = text.match(/(\d+)\s*分钟/)
  if (minuteMatch) return parseInt(minuteMatch[1])

  var hourMatch = text.match(/(\d+)\s*小时/)
  if (hourMatch) return parseInt(hourMatch[1]) * 60

  return null
}

function parse(text) {
  if (!text || !text.trim()) {
    return { intent: INTENT_TYPES.UNKNOWN, confidence: 0, entities: {} }
  }

  text = text.trim()
  var intent = classifyIntent(text)
  var entities = {}
  var confidence = 0.6

  switch (intent) {
    case INTENT_TYPES.ADD_EVENT:
      entities.date = extractDate(text)
      entities.startTime = extractTime(text)
      entities.title = extractTitle(text)
      entities.category = guessCategory(entities.title)
      var reminder = extractReminder(text)
      if (reminder !== null) entities.reminder = reminder
      confidence = (entities.date && entities.title) ? 0.85 : 0.6
      break

    case INTENT_TYPES.DELETE_EVENT:
      entities.date = extractDate(text)
      entities.title = extractTitle(text)
      confidence = entities.title ? 0.8 : 0.5
      break

    case INTENT_TYPES.QUERY_EVENT:
      entities.date = extractDate(text)
      confidence = entities.date ? 0.9 : 0.6
      break

    case INTENT_TYPES.MODIFY_EVENT:
      entities.date = extractDate(text)
      entities.startTime = extractTime(text)
      entities.title = extractTitle(text)
      confidence = (entities.title && entities.startTime) ? 0.8 : 0.5
      break

    case INTENT_TYPES.SET_REMINDER:
      entities.title = extractTitle(text)
      var reminderVal = extractReminder(text)
      if (reminderVal !== null) entities.reminder = reminderVal
      entities.date = extractDate(text)
      confidence = (entities.title && entities.reminder) ? 0.8 : 0.5
      break

    default:
      confidence = 0.3
  }

  return {
    intent: intent,
    entities: entities,
    confidence: confidence,
    rawText: text
  }
}

function generateFeedbackText(result) {
  var intent = result.intent
  var e = result.entities

  switch (intent) {
    case INTENT_TYPES.ADD_EVENT:
      var dateStr = e.date ? timeParser.getFriendlyDate(e.date) : '今天'
      var timeStr = e.startTime ? timeParser.getFriendlyTime(e.startTime) : ''
      return '已添加' + dateStr + (timeStr ? ' ' + timeStr : '') + '的' + e.title

    case INTENT_TYPES.DELETE_EVENT:
      return '已删除' + (e.date ? timeParser.getFriendlyDate(e.date) : '') + '的' + e.title

    case INTENT_TYPES.QUERY_EVENT:
      return '正在查询' + (e.date ? timeParser.getFriendlyDate(e.date) : '今天') + '的安排'

    case INTENT_TYPES.MODIFY_EVENT:
      return '已修改' + e.title + '的时间为' + (e.startTime ? timeParser.getFriendlyTime(e.startTime) : '')

    case INTENT_TYPES.SET_REMINDER:
      return '已为' + e.title + '设置' + (e.reminder || 15) + '分钟前提醒'

    default:
      return '抱歉，我没有理解您的意思，请再说一次'
  }
}

module.exports = {
  parse: parse,
  classifyIntent: classifyIntent,
  extractDate: extractDate,
  extractTime: extractTime,
  extractTitle: extractTitle,
  generateFeedbackText: generateFeedbackText
}
