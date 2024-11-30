import nebula from '/src/nebula'
import { DateTime } from 'luxon'

const createTitle = (startTime, channelName) => {
  const dparams = {
    locale: nebula.locale,
    month: 'long',
    day: 'numeric',
  }

  const date = DateTime.fromJSDate(startTime).setLocale(nebula.locale)
  const weekNumber = date.weekNumber
  const formattedStart = date.toLocaleString(dparams)
  const formattedEnd = date.plus({ days: 6 }).toLocaleString(dparams)

  return `${formattedStart} - ${formattedEnd} (${weekNumber}.)`
}

export { createTitle }
