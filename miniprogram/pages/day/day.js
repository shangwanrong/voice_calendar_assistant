var eventStore = require('../../utils/event-store')
var timeParser = require('../../utils/time-parser')

Page({
  data: {
    currentDate: '',
    events: [],
    friendlyDate: '',
    weekDay: ''
  },

  onLoad: function (options) {
    var date = options.date || timeParser.formatDate(new Date())
    this.setData({ currentDate: date })
    this.loadEvents(date)
  },

  onShow: function () {
    this.loadEvents(this.data.currentDate)
  },

  loadEvents: function (dateStr) {
    var events = eventStore.getLocalEventsByDate(dateStr)
    var d = timeParser.parseDateStr(dateStr)
    var weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    this.setData({
      events: events,
      friendlyDate: timeParser.getFriendlyDate(dateStr),
      weekDay: weekDays[d.getDay()]
    })
  },

  onPrevDay: function () {
    var d = timeParser.parseDateStr(this.data.currentDate)
    d.setDate(d.getDate() - 1)
    var newDate = timeParser.formatDate(d)
    this.setData({ currentDate: newDate })
    this.loadEvents(newDate)
  },

  onNextDay: function () {
    var d = timeParser.parseDateStr(this.data.currentDate)
    d.setDate(d.getDate() + 1)
    var newDate = timeParser.formatDate(d)
    this.setData({ currentDate: newDate })
    this.loadEvents(newDate)
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
      that.loadEvents(that.data.currentDate)
    })
  },

  onAddTap: function () {
    wx.navigateTo({
      url: '/pages/event-add/event-add?date=' + this.data.currentDate
    })
  }
})
