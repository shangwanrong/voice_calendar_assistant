var CATEGORIES = require('../../utils/constants').CATEGORIES

Component({
  properties: {
    event: { type: Object, value: {} },
    showDelete: { type: Boolean, value: false }
  },

  data: {
    categoryColor: '#95A5A6',
    categoryLabel: '其他',
    friendlyTime: ''
  },

  observers: {
    'event': function (e) {
      if (!e || !e.title) return
      var cat = CATEGORIES[e.category] || CATEGORIES.other
      var timeStr = ''
      if (e.isAllDay) {
        timeStr = '全天'
      } else if (e.startTime) {
        timeStr = e.startTime
        if (e.endTime) timeStr += ' - ' + e.endTime
      }
      this.setData({
        categoryColor: cat.color,
        categoryLabel: cat.label,
        friendlyTime: timeStr
      })
    }
  },

  methods: {
    onTap: function () {
      this.triggerEvent('tap', { event: this.properties.event })
    },

    onDelete: function () {
      var that = this
      wx.showModal({
        title: '确认删除',
        content: '确定要删除"' + this.properties.event.title + '"吗？',
        confirmColor: '#E74C3C',
        success: function (res) {
          if (res.confirm) {
            that.triggerEvent('delete', { event: that.properties.event })
          }
        }
      })
    }
  }
})
