var eventStore = require('../../utils/event-store')
var CATEGORIES = require('../../utils/constants').CATEGORIES
var REMINDER_OPTIONS = require('../../utils/constants').REMINDER_OPTIONS
var timeParser = require('../../utils/time-parser')

Page({
  data: {
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
    var date = options.date || timeParser.formatDate(new Date())
    var categoryList = []
    var categoryKeys = Object.keys(CATEGORIES)
    categoryKeys.forEach(function (key) {
      categoryList.push({ key: key, label: CATEGORIES[key].label })
    })

    var reminderLabels = REMINDER_OPTIONS.map(function (r) { return r.label })

    this.setData({
      date: date,
      categoryList: categoryList,
      reminderOptions: reminderLabels
    })
  },

  onTitleInput: function (e) {
    this.setData({ title: e.detail.value })
  },

  onDateChange: function (e) {
    this.setData({ date: e.detail.value })
  },

  onStartTimeChange: function (e) {
    this.setData({ startTime: e.detail.value })
  },

  onEndTimeChange: function (e) {
    this.setData({ endTime: e.detail.value })
  },

  onAllDayChange: function (e) {
    this.setData({ isAllDay: e.detail.value })
  },

  onCategoryChange: function (e) {
    var index = parseInt(e.detail.value)
    var key = this.data.categoryList[index].key
    this.setData({ categoryIndex: index, category: key })
  },

  onReminderChange: function (e) {
    var index = parseInt(e.detail.value)
    var value = REMINDER_OPTIONS[index].value
    this.setData({ reminderIndex: index, reminder: value })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  onSave: function () {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入事件名称', icon: 'none' })
      return
    }
    if (!this.data.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    var eventData = {
      title: this.data.title.trim(),
      date: this.data.date,
      startTime: this.data.isAllDay ? '' : this.data.startTime,
      endTime: this.data.isAllDay ? '' : this.data.endTime,
      isAllDay: this.data.isAllDay,
      category: this.data.category,
      reminder: this.data.reminder,
      note: this.data.note.trim()
    }

    eventStore.saveEventLocal(eventData).then(function () {
      wx.showToast({ title: '添加成功', icon: 'success' })
      setTimeout(function () {
        wx.navigateBack()
      }, 1500)
    }).catch(function () {
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  }
})
