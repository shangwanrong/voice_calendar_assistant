function saveEventLocal(eventData) {
  try {
    var events = wx.getStorageSync('calendar_events') || []
    eventData._id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    eventData.createdAt = new Date().toISOString()
    eventData.updatedAt = new Date().toISOString()
    events.push(eventData)
    wx.setStorageSync('calendar_events', events)
    return Promise.resolve({ _id: eventData._id })
  } catch (e) {
    return Promise.reject(e)
  }
}

function getLocalEventsByDate(date) {
  try {
    var events = wx.getStorageSync('calendar_events') || []
    return events.filter(function (e) { return e.date === date })
  } catch (e) {
    return []
  }
}

function deleteLocalEvent(eventId) {
  try {
    var events = wx.getStorageSync('calendar_events') || []
    events = events.filter(function (e) { return e._id !== eventId })
    wx.setStorageSync('calendar_events', events)
    return Promise.resolve()
  } catch (e) {
    return Promise.reject(e)
  }
}

function updateLocalEvent(eventId, data) {
  try {
    var events = wx.getStorageSync('calendar_events') || []
    for (var i = 0; i < events.length; i++) {
      if (events[i]._id === eventId) {
        Object.assign(events[i], data, { updatedAt: new Date().toISOString() })
        break
      }
    }
    wx.setStorageSync('calendar_events', events)
    return Promise.resolve()
  } catch (e) {
    return Promise.reject(e)
  }
}

function getLocalEventsByDateRange(startDate, endDate) {
  try {
    var events = wx.getStorageSync('calendar_events') || []
    return events.filter(function (e) {
      return e.date >= startDate && e.date <= endDate
    })
  } catch (e) {
    return []
  }
}

function findLocalEventByTitleAndDate(title, date) {
  try {
    var events = wx.getStorageSync('calendar_events') || []
    return events.filter(function (e) {
      var titleMatch = e.title.indexOf(title) >= 0 || title.indexOf(e.title) >= 0
      var dateMatch = !date || e.date === date
      return titleMatch && dateMatch
    })
  } catch (e) {
    return []
  }
}

module.exports = {
  saveEventLocal: saveEventLocal,
  getLocalEventsByDate: getLocalEventsByDate,
  deleteLocalEvent: deleteLocalEvent,
  updateLocalEvent: updateLocalEvent,
  getLocalEventsByDateRange: getLocalEventsByDateRange,
  findLocalEventByTitleAndDate: findLocalEventByTitleAndDate
}
