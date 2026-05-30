var app = getApp()

Page({
  data: {
    voiceFeedback: true,
    defaultReminder: 15,
    totalEvents: 0,
    todayEvents: 0,
    version: '1.0.0'
  },

  onLoad: function () {
    this.loadSettings()
    this.loadStats()
  },

  onShow: function () {
    this.loadStats()
  },

  loadSettings: function () {
    var settings = app.globalData.settings
    this.setData({
      voiceFeedback: settings.voiceFeedback !== false,
      defaultReminder: settings.defaultReminder || 15
    })
  },

  loadStats: function () {
    try {
      var events = wx.getStorageSync('calendar_events') || []
      var today = new Date()
      var todayStr = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0')
      var todayCount = events.filter(function (e) { return e.date === todayStr }).length
      this.setData({
        totalEvents: events.length,
        todayEvents: todayCount
      })
    } catch (e) {
      console.error('加载统计失败', e)
    }
  },

  onVoiceFeedbackChange: function (e) {
    var val = e.detail.value
    this.setData({ voiceFeedback: val })
    app.saveSettings({ voiceFeedback: val })
  },

  onClearData: function () {
    var that = this
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有事件数据吗？此操作不可恢复！',
      confirmColor: '#E74C3C',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('calendar_events')
          that.loadStats()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  onAbout: function () {
    wx.showModal({
      title: '关于语音日历',
      content: '语音日历 v' + this.data.version + '\n\n一款以语音交互为核心的日历管理工具，让您通过自然语言即可管理日程安排。',
      showCancel: false
    })
  }
})
