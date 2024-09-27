import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setPageTitle } from '/src/actions'

const Rundown = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Scheduler' }))
  }, [])

  return <h1>not implemented</h1>
}

export default Rundown
