var eventStore = require('../../utils/event-store')
var voice = require('../../utils/voice')
var nlp = require('../../utils/nlp')
var tts = require('../../utils/tts')
var INTENT_TYPES = require('../../utils/constants').INTENT_TYPES
var timeParser = require('../../utils/time-parser')

Page({
  data: {
    currentDate: '',
    eventDates: [],
    todayEvents: [],
    isListening: false,
    recognizingText: '',
    feedbackText: '',
    showFeedback: false,
    feedbackType: 'success'
  },

  _pendingEntities: null,
  _followUpMode: null,

  onLoad: function () {
    var today = timeParser.formatDate(new Date())
    this.setData({ currentDate: today })
    this.loadMonthEvents(today)
    this.loadTodayEvents(today)
  },

  onShow: function () {
    if (this.data.currentDate) {
      this.loadMonthEvents(this.data.currentDate)
      this.loadTodayEvents(this.data.currentDate)
    }
  },

  loadMonthEvents: function (dateStr) {
    var d = timeParser.parseDateStr(dateStr)
    var year = d.getFullYear()
    var month = d.getMonth()
    var startDate = year + '-' + (month + 1).toString().padStart(2, '0') + '-01'
    var endDate = year + '-' + (month + 1).toString().padStart(2, '0') + '-' + timeParser.getDaysInMonth(year, month).toString().padStart(2, '0')

    var that = this
    try {
      var events = eventStore.getLocalEventsByDateRange(startDate, endDate)
      var dates = []
      events.forEach(function (e) {
        if (dates.indexOf(e.date) < 0) dates.push(e.date)
      })
      that.setData({ eventDates: dates })
    } catch (e) {
      console.error('加载月事件失败', e)
    }
  },

  loadTodayEvents: function (dateStr) {
    var that = this
    try {
      var events = eventStore.getLocalEventsByDate(dateStr)
      that.setData({ todayEvents: events })
    } catch (e) {
      console.error('加载日事件失败', e)
    }
  },

  onDateSelect: function (e) {
    var date = e.detail.date
    if (date === this.data.currentDate) return
    this.setData({ currentDate: date })
    this.loadTodayEvents(date)
  },

  onMonthChange: function (e) {
    this.loadMonthEvents(this.data.currentDate)
  },

  onEventTap: function (e) {
    var event = e.detail.event
    wx.navigateTo({
      url: '/pages/event-detail/event-detail?id=' + event._id
    })
  },

  onEventDelete: function (e) {
    var event = e.detail.event
    var that = this
    eventStore.deleteLocalEvent(event._id).then(function () {
      that.loadTodayEvents(that.data.currentDate)
      that.loadMonthEvents(that.data.currentDate)
      that.showFeedback('已删除"' + event.title + '"', 'success')
    })
  },

  onVoiceTap: function () {
    var that = this
    if (voice.getIsListening()) {
      voice.stopRecognize()
      this.setData({ isListening: false, recognizingText: '' })
      return
    }

    tts.stop()
    this.startListening()
  },

  startListening: function () {
    var that = this
    voice.startRecognize({
      onStart: function () {
        that.setData({ isListening: true, recognizingText: '', showFeedback: false })
      },
      onRecognizing: function (text) {
        that.setData({ recognizingText: text })
      },
      onResult: function (result) {
        that.setData({ isListening: false, recognizingText: '' })
        that.handleVoiceResult(result)
      },
      onError: function (err) {
        that.setData({ isListening: false, recognizingText: '' })
        if (that._followUpMode) {
          that._followUpMode = null
          that._pendingEntities = null
        }
      },
      onStop: function () {
        that.setData({ isListening: false })
      }
    })
  },

  startFollowUpListening: function (delay) {
    var that = this
    var ms = delay || 1500
    setTimeout(function () {
      that.startListening()
    }, ms)
  },

  handleVoiceResult: function (result) {
    var parseResult = result.parseResult
    var intent = parseResult.intent
    var entities = parseResult.entities
    var that = this

    if (this._followUpMode && this._pendingEntities) {
      this.handleFollowUpResult(result)
      return
    }

    switch (intent) {
      case INTENT_TYPES.ADD_EVENT:
        this.voiceAddEvent(entities, result.feedbackText)
        break

      case INTENT_TYPES.DELETE_EVENT:
        this.voiceDeleteEvent(entities, result.feedbackText)
        break

      case INTENT_TYPES.QUERY_EVENT:
        this.voiceQueryEvent(entities, result.feedbackText)
        break

      case INTENT_TYPES.MODIFY_EVENT:
        this.voiceModifyEvent(entities, result.feedbackText)
        break

      case INTENT_TYPES.SET_REMINDER:
        this.showFeedback('提醒设置功能即将上线', 'info')
        break

      case INTENT_TYPES.UNKNOWN:
        this.showFeedback('这不是日程指令，请说"明天下午三点开会"这样的指令', 'info')
        break

      default:
        this.showFeedback('抱歉，没有理解您的意思，请再说一次', 'error')
    }
  },

  handleFollowUpResult: function (result) {
    var rawText = (result.rawText || '').trim()
    var parseResult = result.parseResult
    var entities = parseResult.entities
    var pending = this._pendingEntities

    this._followUpMode = null

    var extractedDate = entities.date
    if (!extractedDate && rawText) {
      var dateKeyword = rawText.match(/今天|明天|后天|大后天|昨天|前天|(这|上|下)(周|星期)(一|二|三|四|五|六|日|天)|\d{1,2}月\d{1,2}[号日]|\d{4}年\d{1,2}月\d{1,2}[号日]?/)
      if (dateKeyword) {
        var parsedDate = timeParser.getRelativeDate(dateKeyword[0])
        if (parsedDate) extractedDate = timeParser.formatDate(parsedDate)
      }
    }

    var extractedTime = entities.startTime
    if (!extractedTime && rawText) {
      extractedTime = timeParser.parseTimeStr(rawText)
    }

    var extractedEndTime = entities.endTime || null

    if (extractedDate && !pending.date) {
      pending.date = extractedDate
    }
    if (extractedTime && !pending.startTime) {
      pending.startTime = extractedTime
      pending.isAllDay = false
      if (extractedEndTime) pending.endTime = extractedEndTime
    }

    if (!pending.date || !pending.startTime) {
      if (!pending.date && !pending.startTime) {
        this._pendingEntities = pending
        this._followUpMode = 'date'
        this.showFeedback('请问是哪一天几点？', 'info')
      } else if (!pending.date) {
        this._pendingEntities = pending
        this._followUpMode = 'date'
        this.showFeedback('请问是哪一天？', 'info')
      } else {
        this._pendingEntities = pending
        this._followUpMode = 'time'
        this.showFeedback('请问几点？', 'info')
      }
      this.startFollowUpListening()
      return
    }

    this._pendingEntities = null
    this.doAddEvent(pending, pending.recurrence || 'none')
  },

  voiceAddEvent: function (entities, feedbackText) {
    var missingDate = !entities.date
    var missingTime = !entities.startTime

    if (missingDate || missingTime) {
      this._pendingEntities = entities

      if (missingDate && missingTime) {
        this._followUpMode = 'date'
        this.showFeedback('请问"' + (entities.title || '这个事件') + '"是哪一天几点？', 'info')
      } else if (missingDate) {
        this._followUpMode = 'date'
        this.showFeedback('请问"' + (entities.title || '这个事件') + '"是哪一天？', 'info')
      } else {
        this._followUpMode = 'time'
        this.showFeedback('请问"' + (entities.title || '这个事件') + '"几点？', 'info')
      }

      this.startFollowUpListening()
      return
    }

    this.doAddEvent(entities, entities.recurrence || 'none', feedbackText)
  },

  doAddEvent: function (entities, recurrence, feedbackText) {
    var that = this

    if (recurrence !== 'none') {
      this.addRecurringEvent(entities, recurrence)
      return
    }

    var eventData = {
      title: entities.title,
      date: entities.date || timeParser.formatDate(new Date()),
      startTime: entities.startTime || '',
      endTime: entities.endTime || '',
      isAllDay: !entities.startTime,
      reminder: entities.reminder !== undefined ? entities.reminder : 15,
      category: entities.category || 'other',
      note: entities.note || ''
    }

    eventStore.saveEventLocal(eventData).then(function () {
      that.loadTodayEvents(that.data.currentDate)
      that.loadMonthEvents(that.data.currentDate)
      that.showFeedback(feedbackText, 'success')
    }).catch(function (err) {
      that.showFeedback('添加失败，请重试', 'error')
    })
  },

  addRecurringEvent: function (entities, recurrence) {
    var that = this
    var count = recurrence === 'daily' ? 30 : (recurrence === 'weekdays' ? 30 : (recurrence === 'weekly' ? 12 : 12))
    var startDate = entities.recurrenceStart || entities.date || null
    var endDate = entities.recurrenceEnd || null
    var dates = timeParser.getRecurringDates(recurrence, count, startDate, endDate)
    var title = entities.title
    var startTime = entities.startTime || ''
    var endTime = entities.endTime || ''
    var category = entities.category || 'other'
    var note = entities.note || ''
    var reminder = entities.reminder !== undefined ? entities.reminder : 15
    var isAllDay = !entities.startTime

    var saved = 0
    var total = dates.length

    dates.forEach(function (date) {
      var eventData = {
        title: title,
        date: date,
        startTime: startTime,
        endTime: endTime,
        isAllDay: isAllDay,
        reminder: reminder,
        category: category,
        note: note
      }
      eventStore.saveEventLocal(eventData).then(function () {
        saved++
        if (saved === total) {
          that.loadTodayEvents(that.data.currentDate)
          that.loadMonthEvents(that.data.currentDate)
          var label = recurrence === 'daily' ? '每天' : (recurrence === 'weekly' ? '每周' : '每月')
          that.showFeedback('已添加' + label + '"' + title + '"，共' + total + '次', 'success')
        }
      })
    })
  },

  voiceDeleteEvent: function (entities, feedbackText) {
    var that = this
    var events = eventStore.findLocalEventByTitleAndDate(entities.title, entities.date)

    if (events.length === 0) {
      this.showFeedback('未找到"' + entities.title + '"相关事件', 'error')
      return
    }

    if (events.length === 1) {
      eventStore.deleteLocalEvent(events[0]._id).then(function () {
        that.loadTodayEvents(that.data.currentDate)
        that.loadMonthEvents(that.data.currentDate)
        that.showFeedback(feedbackText, 'success')
      })
    } else {
      this.showFeedback('找到多个匹配事件，请手动选择删除', 'info')
    }
  },

  voiceModifyEvent: function (entities, feedbackText) {
    var that = this
    var searchTitle = entities.oldTitle || entities.title
    var events = eventStore.findLocalEventByTitleAndDate(searchTitle, entities.date)

    if (events.length === 0) {
      this.showFeedback('未找到"' + searchTitle + '"相关事件', 'error')
      return
    }

    if (events.length > 1) {
      this.showFeedback('找到多个"' + searchTitle + '"，请手动选择修改', 'info')
      return
    }

    var event = events[0]
    var updateData = {}

    if (entities.newTitle) {
      updateData.title = entities.newTitle
    }
    if (entities.newDate) {
      updateData.date = entities.newDate
    }
    if (entities.newStartTime) {
      updateData.startTime = entities.newStartTime
      updateData.isAllDay = false
    }
    if (entities.newEndTime) {
      updateData.endTime = entities.newEndTime
    }

    var hasChange = Object.keys(updateData).length > 0
    if (!hasChange) {
      this.showFeedback('未检测到需要修改的内容', 'info')
      return
    }

    eventStore.updateLocalEvent(event._id, updateData).then(function () {
      that.loadTodayEvents(that.data.currentDate)
      that.loadMonthEvents(that.data.currentDate)

      var changes = []
      if (updateData.title) changes.push('标题改为"' + updateData.title + '"')
      if (updateData.date) changes.push('日期改为' + timeParser.getFriendlyDate(updateData.date))
      if (updateData.startTime) changes.push('时间改为' + timeParser.getFriendlyTime(updateData.startTime))
      if (updateData.endTime) changes.push('结束时间改为' + timeParser.getFriendlyTime(updateData.endTime))

      var msg = '已修改"' + searchTitle + '"：' + changes.join('，')
      that.showFeedback(msg, 'success')
    }).catch(function (err) {
      that.showFeedback('修改失败，请重试', 'error')
    })
  },

  voiceQueryEvent: function (entities, feedbackText) {
    var date = entities.date || timeParser.formatDate(new Date())
    var events = eventStore.getLocalEventsByDate(date)
    var friendlyDate = timeParser.getFriendlyDate(date)

    if (events.length === 0) {
      this.showFeedback(friendlyDate + '没有安排', 'info')
    } else {
      var msg = friendlyDate + '有' + events.length + '个安排：'
      events.forEach(function (e, i) {
        var time = e.isAllDay ? '全天' : e.startTime
        msg += (i > 0 ? '；' : '') + time + ' ' + e.title
      })
      this.showFeedback(msg, 'success')
    }
    this.setData({ currentDate: date })
    this.loadTodayEvents(date)
  },

  showFeedback: function (text, type) {
    this.setData({
      feedbackText: text,
      feedbackType: type || 'success',
      showFeedback: true
    })
    tts.speak(text)
    var that = this
    setTimeout(function () {
      that.setData({ showFeedback: false })
    }, 3000)
  },

  onAddTap: function () {
    wx.navigateTo({
      url: '/pages/event-add/event-add?date=' + this.data.currentDate
    })
  },

  onDayViewTap: function () {
    wx.navigateTo({
      url: '/pages/day/day?date=' + this.data.currentDate
    })
  }
})
