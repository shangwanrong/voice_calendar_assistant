const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data, eventId, date, startDate, endDate, keyword } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'add': {
        const result = await db.collection('events').add({
          data: {
            openid,
            title: data.title || '未命名事件',
            date: data.date,
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            isAllDay: data.isAllDay || false,
            reminder: data.reminder !== undefined ? data.reminder : 15,
            reminderUnit: 'minute',
            category: data.category || 'other',
            note: data.note || '',
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })
        return { success: true, eventId: result._id }
      }

      case 'delete': {
        await db.collection('events').doc(eventId).remove()
        return { success: true }
      }

      case 'update': {
        const updateData = { ...data, updatedAt: db.serverDate() }
        await db.collection('events').doc(eventId).update({ data: updateData })
        return { success: true }
      }

      case 'query': {
        const result = await db.collection('events').where({
          openid,
          date
        }).orderBy('startTime', 'asc').get()
        return { success: true, events: result.data }
      }

      case 'queryRange': {
        const result = await db.collection('events').where({
          openid,
          date: db.command.gte(startDate).and(db.command.lte(endDate))
        }).orderBy('date', 'asc').orderBy('startTime', 'asc').get()
        return { success: true, events: result.data }
      }

      case 'search': {
        const result = await db.collection('events').where({
          openid,
          title: db.RegExp({ regexp: keyword, options: 'i' })
        }).orderBy('date', 'desc').limit(50).get()
        return { success: true, events: result.data }
      }

      default:
        return { success: false, error: 'Unknown action' }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
