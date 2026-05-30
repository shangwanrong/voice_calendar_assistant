var eventStore = require('../../utils/event-store')
var CATEGORIES = require('../../utils/constants').CATEGORIES
var REMINDER_OPTIONS = require('../../utils/constants').REMINDER_OPTIONS

Page({
  data: {
    eventId: '',
    event: null,
    isEditing: false,
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    category: 'other',
    reminder: 15,
    note: '',
    categoryList: [],
    reminderOptions: [],
    categoryIndex: 4,
    reminderIndex: 3
  },

  onLoad: function (options) {
    var id = options.id
    if (!id) {
      wx.showToast({ title: '事件不存在', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 1500)
      return
    }

    var categoryList = []
    Object.keys(CATEGORIES).forEach(function (key) {
      categoryList.push({ key: key, label: CATEGORIES[key].label })
    })
    var reminderLabels = REMINDER_OPTIONS.map(function (r) { return r.label })

    this.setData({
      eventId: id,
      categoryList: categoryList,
      reminderOptions: reminderLabels
    })

    this.loadEvent(id)
  },

  loadEvent: function (id) {
    try {
      var events = wx.getStorageSync('calendar_events') || []
      var event = null
      for (var i = 0; i < events.length; i++) {
        if (events[i]._id === id) {
          event = events[i]
          break
        }
      }

      if (!event) {
        wx.showToast({ title: '事件不存在', icon: 'none' })
        setTimeout(function () { wx.navigateBack() }, 1500)
        return
      }

      var catIndex = 4
      for (var j = 0; j < this.data.categoryList.length; j++) {
        if (this.data.categoryList[j].key === event.category) {
          catIndex = j
          break
        }
      }

      var remIndex = 3
      for (var k = 0; k < REMINDER_OPTIONS.length; k++) {
        if (REMINDER_OPTIONS[k].value === (event.reminder || 0)) {
          remIndex = k
          break
        }
      }

      this.setData({
        event: event,
        title: event.title,
        date: event.date,
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        isAllDay: event.isAllDay || false,
        category: event.category || 'other',
        reminder: event.reminder || 0,
        note: event.note || '',
        categoryIndex: catIndex,
        reminderIndex: remIndex
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onEditTap: function () {
    this.setData({ isEditing: true })
  },

  onCancelEdit: function () {
    this.setData({ isEditing: false })
    this.loadEvent(this.data.eventId)
  },

  onTitleInput: function (e) { this.setData({ title: e.detail.value }) },
  onDateChange: function (e) { this.setData({ date: e.detail.value }) },
  onStartTimeChange: function (e) { this.setData({ startTime: e.detail.value }) },
  onEndTimeChange: function (e) { this.setData({ endTime: e.detail.value }) },
  onAllDayChange: function (e) { this.setData({ isAllDay: e.detail.value }) },
  onNoteInput: function (e) { this.setData({ note: e.detail.value }) },

  onCategoryChange: function (e) {
    var index = parseInt(e.detail.value)
    this.setData({ categoryIndex: index, category: this.data.categoryList[index].key })
  },

  onReminderChange: function (e) {
    var index = parseInt(e.detail.value)
    this.setData({ reminderIndex: index, reminder: REMINDER_OPTIONS[index].value })
  },

  onSave: function () {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入事件名称', icon: 'none' })
      return
    }

    var that = this
    var updateData = {
      title: this.data.title.trim(),
      date: this.data.date,
      startTime: this.data.isAllDay ? '' : this.data.startTime,
      endTime: this.data.isAllDay ? '' : this.data.endTime,
      isAllDay: this.data.isAllDay,
      category: this.data.category,
      reminder: this.data.reminder,
      note: this.data.note.trim()
    }

    eventStore.updateLocalEvent(this.data.eventId, updateData).then(function () {
      wx.showToast({ title: '保存成功', icon: 'success' })
      that.setData({ isEditing: false })
      that.loadEvent(that.data.eventId)
    })
  },

  onDelete: function () {
    var that = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个事件吗？',
      confirmColor: '#E74C3C',
      success: function (res) {
        if (res.confirm) {
          eventStore.deleteLocalEvent(that.data.eventId).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(function () { wx.navigateBack() }, 1500)
          })
        }
      }
    })
  }
})
