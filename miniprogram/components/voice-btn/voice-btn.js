Component({
  properties: {
    isListening: { type: Boolean, value: false },
    recognizingText: { type: String, value: '' }
  },

  data: {
    pulseAnimation: false
  },

  observers: {
    'isListening': function (val) {
      this.setData({ pulseAnimation: val })
    }
  },

  methods: {
    onTap: function () {
      this.triggerEvent('tap')
    }
  }
})
