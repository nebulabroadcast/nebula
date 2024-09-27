import nebula from '/src/nebula'
import { useEffect, useState } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import PubSub from '/src/pubsub'
import { arrayEquals } from '/src/utils'
import { toast } from 'react-toastify'

const proto = window.location.protocol.replace('http', 'ws')
const wsAddress = `${proto}//${window.location.host}/ws`
const wsOpts = {
  shouldReconnect: () => true,
}

const WebsocketListener = () => {
  const [topics, setTopics] = useState([])
  const { sendMessage, readyState, getWebSocket } = useWebSocket(
    wsAddress,
    wsOpts
  )

  const subscribe = () => {
    sendMessage(
      JSON.stringify({
        topic: 'auth',
        token: JSON.parse(localStorage.getItem('accessToken')),
        subscribe: topics,
      })
    )
  }

  useEffect(() => {
    //console.log('Topics changed', topics)
    subscribe()
  }, [topics])

  const onMessage = (message) => {
    const data = JSON.parse(message.data)
    if (data.topic === 'heartbeat') return
    if (data.sender === nebula.senderId) {
      return // my own message. ignore
    }
    if (data.topic === 'shout' && data?.summary?.text)
      toast.info(data.summary.text)

    PubSub.publish(data.topic, data.data)
  }

  PubSub.setOnSubscriptionsChange((newTopics) => {
    if (arrayEquals(topics, newTopics)) return
    //console.log('WS: Subscriptions changed')
    setTopics(newTopics)
  })

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      //console.log('WS connected')
      getWebSocket().onmessage = onMessage
      subscribe()
      // Dispatch a fake event to the frontend components
      // in case they depend on the event stream and may
      // miss some messages - this should force reloading
      // events using graphql
      PubSub.publish('client.reconnected', {
        topic: 'client.reconnected',
      })
    }
  }, [readyState, getWebSocket])

  return <></>
}

export default WebsocketListener
