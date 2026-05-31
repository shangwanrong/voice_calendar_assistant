var eventStore = require('./event-store')
var timeParser = require('./time-parser')

var CHECK_INTERVAL = 60000
var checkTimer = null
var lastNotifiedIds = {}

function startChecking() {
  stopChecking()
  checkReminders()
  checkTimer = setInterval(function () {
    checkReminders()
  }, CHECK_INTERVAL)
}

function stopChecking() {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}

function checkReminders() {
  var now = new Date()
  var todayStr = timeParser.formatDate(now)
  var events = eventStore.getLocalEventsByDate(todayStr)

  events.forEach(function (event) {
    if (!event.startTime || event.isAllDay) return
    if (event.reminder === 0 || event.reminder === undefined || event.reminder === null) return

    var eventTime = parseEventDateTime(event.date, event.startTime)
    if (!eventTime) return

    var reminderTime = new Date(eventTime.getTime() - (event.reminder * 60 * 1000))
    var diff = reminderTime.getTime() - now.getTime()

    if (diff <= 0 && diff > -CHECK_INTERVAL) {
      var notifyKey = event._id + '_' + event.date + '_' + event.startTime
      if (lastNotifiedIds[notifyKey]) return

      lastNotifiedIds[notifyKey] = true
      showReminder(event)
    }
  })

  cleanOldNotifiedIds(now)
}

function parseEventDateTime(dateStr, timeStr) {
  try {
    var dateParts = dateStr.split('-')
    var timeParts = timeStr.split(':')
    return new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2]),
      parseInt(timeParts[0]),
      parseInt(timeParts[1])
    )
  } catch (e) {
    return null
  }
}

function showReminder(event) {
  var timeLabel = event.startTime
  var title = event.title || '未命名事件'
  var msg = '日程提醒：' + timeLabel + ' "' + title + '" 即将开始'

  wx.showModal({
    title: '日程提醒',
    content: '"' + title + '"\n时间：' + timeLabel + '\n即将开始，请做好准备！',
    showCancel: false,
    confirmText: '知道了'
  })

  try {
    var pages = getCurrentPages()
    if (pages.length > 0) {
      var currentPage = pages[pages.length - 1]
      if (currentPage.showFeedback) {
        currentPage.showFeedback(msg, 'info')
      }
    }
  } catch (e) {}
}

function cleanOldNotifiedIds(now) {
  var todayStr = timeParser.formatDate(now)
  Object.keys(lastNotifiedIds).forEach(function (key) {
    if (key.indexOf(todayStr) < 0) {
      delete lastNotifiedIds[key]
    }
  })
}

function requestSubscribeIfNeeded(event) {
  if (!wx.requestSubscribeMessage) return

  var TEMPLATE_ID = ''
  if (!TEMPLATE_ID) return

  wx.requestSubscribeMessage({
    tmplIds: [TEMPLATE_ID],
    success: function (res) {
      console.log('订阅消息授权结果', res)
    },
    fail: function (err) {
      console.warn('订阅消息授权失败', err)
    }
  })
}

module.exports = {
  startChecking: startChecking,
  stopChecking: stopChecking,
  checkReminders: checkReminders,
  requestSubscribeIfNeeded: requestSubscribeIfNeeded
}
