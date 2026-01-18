import { useState, useEffect, useMemo } from 'react';

import nebula from '/src/nebula';
import { useDialog } from '/src/hooks';
import { Dropdown } from '/src/components';
import { useNebula } from '/src/features/Nebula';

const dmessage = `
Are you sure you want to apply this template?
Template will be merged with existing events.

This operation cannot be undone.
`;

const ApplySchedulingTemplate = ({ loadEvents, date, loading, setLoading }) => {
  const { currentChannelId } = useNebula();
  const [templates, setTemplates] = useState([]);
  const showDialog = useDialog();

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannelId);
  }, [currentChannelId]);

  const loadTemplates = () => {
    nebula.request('list-scheduling-templates', {}).then((response) => {
      const templates = response.data.templates;
      templates.sort((a, b) => {
        if (a.name === channelConfig.default_template) return -1;
        if (b.name === channelConfig.default_template) return 1;
        return a.title.localeCompare(b.title);
      });
      setTemplates(templates);
    });
  };

  useEffect(() => loadTemplates(), [channelConfig]);

  const applyTemplate = async (value) => {
    setLoading(true);
    const template_name = value;
    const id_channel = currentChannelId;
    const dtitle = `Apply template "${value}"?`;
    try {
      const _res = await showDialog('confirm', dtitle, { message: dmessage });
    } catch {
      setLoading(false);
      return;
    }

    try {
      await nebula.request('apply-scheduling-template', {
        template_name,
        id_channel,
        date,
      });
      loadEvents();
    } catch {
      // noop
    }
    setLoading(false);
  };

  const dropdownOptions = useMemo(() => {
    return templates.map((template) => ({
      value: template.name,
      label: template.title,
      onClick: () => applyTemplate(template.name),
    }));
  }, [templates]);

  if (templates.length === 0) {
    return null;
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
  );
};

export default ApplySchedulingTemplate;
