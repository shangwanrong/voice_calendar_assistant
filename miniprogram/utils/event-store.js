var db = null

function getDB() {
  if (!db) {
    db = wx.cloud.database()
  }
  return db
}

function addEvent(eventData) {
  var db = getDB()
  return db.collection('events').add({
    data: {
      title: eventData.title || '未命名事件',
      date: eventData.date,
      startTime: eventData.startTime || '',
      endTime: eventData.endTime || '',
      isAllDay: eventData.isAllDay || false,
      reminder: eventData.reminder !== undefined ? eventData.reminder : 15,
      reminderUnit: 'minute',
      category: eventData.category || 'other',
      note: eventData.note || '',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })
}

function deleteEvent(eventId) {
  var db = getDB()
  return db.collection('events').doc(eventId).remove()
}

function updateEvent(eventId, data) {
  var db = getDB()
  data.updatedAt = db.serverDate()
  return db.collection('events').doc(eventId).update({ data: data })
}

function getEventsByDate(date) {
  var db = getDB()
  return db.collection('events').where({
    date: date
  }).orderBy('startTime', 'asc').get()
}

function getEventsByDateRange(startDate, endDate) {
  var db = getDB()
  return db.collection('events').where({
    date: db.command.gte(startDate).and(db.command.lte(endDate))
  }).orderBy('date', 'asc').orderBy('startTime', 'asc').get()
}

function searchEvents(keyword) {
  var db = getDB()
  return db.collection('events').where({
    title: db.RegExp({
      regexp: keyword,
      options: 'i'
    })
  }).orderBy('date', 'desc').limit(50).get()
}

function findEventByTitleAndDate(title, date) {
  var db = getDB()
  var where = {
    title: db.RegExp({
      regexp: title,
      options: 'i'
    })
  }
  if (date) {
    where.date = date
  }
  return db.collection('events').where(where).get()
}

function getAllEvents() {
  var db = getDB()
  return db.collection('events').orderBy('date', 'desc').orderBy('startTime', 'asc').limit(1000).get()
}

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
  var events = wx.getStorageSync('calendar_events') || []
  return events.filter(function (e) {
    var titleMatch = e.title.indexOf(title) >= 0 || title.indexOf(e.title) >= 0
    var dateMatch = !date || e.date === date
    return titleMatch && dateMatch
  })
}

module.exports = {
  addEvent: addEvent,
  deleteEvent: deleteEvent,
  updateEvent: updateEvent,
  getEventsByDate: getEventsByDate,
  getEventsByDateRange: getEventsByDateRange,
  searchEvents: searchEvents,
  findEventByTitleAndDate: findEventByTitleAndDate,
  getAllEvents: getAllEvents,
  saveEventLocal: saveEventLocal,
  getLocalEventsByDate: getLocalEventsByDate,
  deleteLocalEvent: deleteLocalEvent,
  updateLocalEvent: updateLocalEvent,
  getLocalEventsByDateRange: getLocalEventsByDateRange,
  findLocalEventByTitleAndDate: findLocalEventByTitleAndDate
}
