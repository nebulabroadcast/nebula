import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Dropdown, Button } from '/src/components'
import nebula from '/src/nebula'

const ApplySchedulingTemplate = ({ loadEvents, date, loading, setLoading }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [templates, setTemplates] = useState([])

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  const loadTemplates = () => {
    nebula.request('list-scheduling-templates', {}).then((response) => {
      const templates = response.data.templates
      templates.sort((a, b) => {
        if (a.name === channelConfig.default_template) return -1
        if (b.name === channelConfig.default_template) return 1
        return a.title.localeCompare(b.title)
      })
      console.log(templates)
      setTemplates(templates)
    })
  }

  useEffect(() => loadTemplates(), [channelConfig])

  const applyTemplate = (value) => {
    setLoading(true)
    const template_name = value
    const id_channel = currentChannel

    nebula
      .request('apply-scheduling-template', {
        template_name,
        id_channel,
        date,
      })
      .then(() => loadEvents())
      .catch(() => setLoading(false))
  }

  const dropdownOptions = useMemo(() => {
    return templates.map((template) => ({
      value: template.name,
      label: template.title,
      onClick: () => applyTemplate(template.name),
    }))
  }, [templates])

  if (templates.length === 0) {
    return null
  }

  return (
    <>
      <Dropdown
        tooltip="Select a template to apply"
        options={dropdownOptions}
        icon="approval"
        label="Apply template"
        disabled={loading}
      />
    </>
  )
}

export default ApplySchedulingTemplate
