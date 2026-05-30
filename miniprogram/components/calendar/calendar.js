Component({
  properties: {
    currentDate: { type: String, value: '' },
    eventDates: { type: Array, value: [] }
  },

  data: {
    year: 2026,
    month: 0,
    days: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    selectedDate: '',
    today: ''
  },

  lifetimes: {
    attached: function () {
      var now = new Date()
      this.setData({
        year: now.getFullYear(),
        month: now.getMonth(),
        today: this._formatDate(now),
        selectedDate: this.properties.currentDate || this._formatDate(now)
      })
      this._generateDays()
    }
  },

  observers: {
    'currentDate': function (val) {
      if (val) {
        this.setData({ selectedDate: val })
        var d = this._parseDateStr(val)
        if (d.getFullYear() !== this.data.year || d.getMonth() !== this.data.month) {
          this.setData({ year: d.getFullYear(), month: d.getMonth() })
          this._generateDays()
        }
      }
    }
  },

  methods: {
    _formatDate: function (date) {
      var y = date.getFullYear()
      var m = (date.getMonth() + 1).toString().padStart(2, '0')
      var d = date.getDate().toString().padStart(2, '0')
      return y + '-' + m + '-' + d
    },

    _parseDateStr: function (s) {
      var p = s.split('-')
      return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]))
    },

    _generateDays: function () {
      var year = this.data.year
      var month = this.data.month
      var daysInMonth = new Date(year, month + 1, 0).getDate()
      var firstDay = new Date(year, month, 1).getDay()
      var days = []
      var eventDateSet = {}
      this.properties.eventDates.forEach(function (d) { eventDateSet[d] = true })

      for (var i = 0; i < firstDay; i++) {
        days.push({ day: '', dateStr: '', isCurrentMonth: false })
      }

      for (var j = 1; j <= daysInMonth; j++) {
        var dateStr = year + '-' + (month + 1).toString().padStart(2, '0') + '-' + j.toString().padStart(2, '0')
        days.push({
          day: j,
          dateStr: dateStr,
          isCurrentMonth: true,
          isToday: dateStr === this.data.today,
          hasEvent: !!eventDateSet[dateStr]
        })
      }

      this.setData({ days: days })
    },

    onDayTap: function (e) {
      var dateStr = e.currentTarget.dataset.date
      if (!dateStr) return
      this.setData({ selectedDate: dateStr })
      this.triggerEvent('dateselect', { date: dateStr })
    },

    onPrevMonth: function () {
      var year = this.data.year
      var month = this.data.month - 1
      if (month < 0) { month = 11; year-- }
      this.setData({ year: year, month: month })
      this._generateDays()
      this.triggerEvent('monthchange', { year: year, month: month })
    },

    onNextMonth: function () {
      var year = this.data.year
      var month = this.data.month + 1
      if (month > 11) { month = 0; year++ }
      this.setData({ year: year, month: month })
      this._generateDays()
      this.triggerEvent('monthchange', { year: year, month: month })
    },

    onTodayTap: function () {
      var now = new Date()
      this.setData({
        year: now.getFullYear(),
        month: now.getMonth(),
        selectedDate: this._formatDate(now)
      })
      this._generateDays()
      this.triggerEvent('dateselect', { date: this.data.selectedDate })
    }
  }
})
