import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Dropdown, Button } from '/src/components'
import nebula from '/src/nebula'

const ApplySchedulingTemplate = ({ loadEvents, date }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  const loadTemplates = () => {
    nebula.request('list-scheduling-templates', {}).then((response) => {
      const templates = response.data.templates
      setTemplates(templates)
      const defaultTemplate =
        templates.find((t) => t.name === channelConfig.default_template) ||
        templates[0]
      console.log(response.data.templates)
      setSelectedTemplate(defaultTemplate)
    })
  }

  useEffect(() => loadTemplates(), [channelConfig])

  const dropdownOptions = useMemo(() => {
    return templates.map((template) => ({
      value: template.name,
      label: template.title,
      onClick: () => setSelectedTemplate(template),
    }))
  }, [templates])

  const applyTemplate = () => {
    const template_name = selectedTemplate.name
    const id_channel = currentChannel

    nebula
      .request('apply-scheduling-template', {
        template_name,
        id_channel,
        date,
      })
      .then(() => loadEvents())
  }

  return (
    <>
      <Dropdown
        options={dropdownOptions}
        value={selectedTemplate}
        onChange={setSelectedTemplate}
        label={selectedTemplate?.title}
      />
      <Button label="Apply template" onClick={applyTemplate} />
    </>
  )
}

export default ApplySchedulingTemplate
