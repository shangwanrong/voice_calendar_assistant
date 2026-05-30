var WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDate(date) {
  var y = date.getFullYear()
  var m = (date.getMonth() + 1).toString().padStart(2, '0')
  var d = date.getDate().toString().padStart(2, '0')
  return y + '-' + m + '-' + d
}

function formatTime(date) {
  var h = date.getHours().toString().padStart(2, '0')
  var m = date.getMinutes().toString().padStart(2, '0')
  return h + ':' + m
}

function parseDateStr(dateStr) {
  var parts = dateStr.split('-')
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay()
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function isToday(date) {
  return isSameDay(date, new Date())
}

function addDays(date, days) {
  var result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getRelativeDate(text) {
  var now = new Date()
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (text === '今天' || text === '今日') return today
  if (text === '明天' || text === '明日') return addDays(today, 1)
  if (text === '后天') return addDays(today, 2)
  if (text === '大后天') return addDays(today, 3)
  if (text === '昨天') return addDays(today, -1)
  if (text === '前天') return addDays(today, -2)

  var weekMatch = text.match(/(这|下)(周|星期)(一|二|三|四|五|六|日|天)/)
  if (weekMatch) {
    var isNext = weekMatch[1] === '下'
    var dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }
    var targetDay = dayMap[weekMatch[3]]
    var currentDay = today.getDay()
    var diff = targetDay - currentDay
    if (diff <= 0 && !isNext) diff += 7
    if (isNext) diff += 7
    return addDays(today, diff)
  }

  var dateMatch = text.match(/(\d{1,2})月(\d{1,2})[号日]/)
  if (dateMatch) {
    var month = parseInt(dateMatch[1]) - 1
    var day = parseInt(dateMatch[2])
    var year = now.getFullYear()
    var result = new Date(year, month, day)
    if (result < today) result = new Date(year + 1, month, day)
    return result
  }

  var fullDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})[号日]?/)
  if (fullDateMatch) {
    return new Date(parseInt(fullDateMatch[1]), parseInt(fullDateMatch[2]) - 1, parseInt(fullDateMatch[3]))
  }

  return null
}

function parseTimeStr(text) {
  if (!text) return null

  var hourMatch = text.match(/(凌晨|早上|上午|中午|下午|晚上|夜里|深夜)?(\d{1,2})[点时:：](\d{1,2})?(分|半)?/)
  if (hourMatch) {
    var period = hourMatch[1] || ''
    var hour = parseInt(hourMatch[2])
    var minute = hourMatch[3] ? parseInt(hourMatch[3]) : 0

    if (hourMatch[4] === '半') minute = 30

    if (period === '凌晨' || period === '夜里' || period === '深夜') {
      if (hour > 12) hour = hour
    } else if (period === '早上' || period === '上午') {
      if (hour === 12) hour = 0
    } else if (period === '中午') {
      if (hour === 12) hour = 12
    } else if (period === '下午' || period === '晚上') {
      if (hour < 12) hour += 12
    } else {
      if (hour >= 1 && hour <= 6) hour += 12
    }

    return hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0')
  }

  var quarterMatch = text.match(/(凌晨|早上|上午|中午|下午|晚上)?(差一刻|一刻)?(\d{1,2})[点时]/)
  if (quarterMatch) {
    var period2 = quarterMatch[1] || ''
    var hour2 = parseInt(quarterMatch[3])
    var minute2 = 0
    if (quarterMatch[2] === '一刻') minute2 = 15
    if (quarterMatch[2] === '差一刻') {
      minute2 = 45
      hour2 -= 1
    }

    if (period2 === '下午' || period2 === '晚上') {
      if (hour2 < 12) hour2 += 12
    }

    return hour2.toString().padStart(2, '0') + ':' + minute2.toString().padStart(2, '0')
  }

  return null
}

function getFriendlyDate(dateStr) {
  var date = parseDateStr(dateStr)
  var today = new Date()
  today = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  var diff = Math.round((date - today) / (1000 * 60 * 60 * 24))

  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff === -1) return '昨天'

  var weekDay = WEEK_DAYS[date.getDay()]
  return (date.getMonth() + 1) + '月' + date.getDate() + '日 周' + weekDay
}

function getFriendlyTime(timeStr) {
  if (!timeStr) return ''
  var parts = timeStr.split(':')
  var hour = parseInt(parts[0])
  var minute = parseInt(parts[1])
  var period = ''
  if (hour >= 0 && hour < 6) period = '凌晨'
  else if (hour >= 6 && hour < 9) period = '早上'
  else if (hour >= 9 && hour < 12) period = '上午'
  else if (hour === 12) period = '中午'
  else if (hour > 12 && hour < 18) period = '下午'
  else period = '晚上'

  var displayHour = hour > 12 ? hour - 12 : hour
  if (minute === 0) return period + displayHour + '点'
  return period + displayHour + '点' + minute + '分'
}

module.exports = {
  formatDate: formatDate,
  formatTime: formatTime,
  parseDateStr: parseDateStr,
  getDaysInMonth: getDaysInMonth,
  getFirstDayOfWeek: getFirstDayOfWeek,
  isSameDay: isSameDay,
  isToday: isToday,
  addDays: addDays,
  getRelativeDate: getRelativeDate,
  parseTimeStr: parseTimeStr,
  getFriendlyDate: getFriendlyDate,
  getFriendlyTime: getFriendlyTime
}
