

import { Dropdown } from '@components';
import { useDialog } from '@features/Dialogs';
import { useNebula } from '@features/Nebula';
import React, { useState, useEffect, useMemo } from 'react';

import nebula from '@/nebula';

const dmessage = `
Are you sure you want to apply this template?
Template will be merged with existing events.

This operation cannot be undone.
`;

interface SchedulingTemplate {
  name: string;
  title: string;
}

interface ApplySchedulingTemplateProps {
  loadEvents: () => void;
  date?: Date;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ApplySchedulingTemplate: React.FC<ApplySchedulingTemplateProps> = ({
  loadEvents,
  date,
  loading,
  setLoading,
}) => {
  const { currentChannelId } = useNebula();
  const [templates, setTemplates] = useState<SchedulingTemplate[]>([]);
  const showDialog = useDialog();

  const channelConfig = useMemo(() => {
    if (currentChannelId === null) return undefined;
    return nebula.getPlayoutChannel(currentChannelId);
  }, [currentChannelId]);

  const loadTemplates = () => {
    nebula.request('list-scheduling-templates', {}).then((response) => {
      const fetchedTemplates = response.data.templates as SchedulingTemplate[];
      fetchedTemplates.sort((a, b) => {
        if (a.name === channelConfig?.default_template) return -1;
        if (b.name === channelConfig?.default_template) return 1;
        return a.title.localeCompare(b.title);
      });
      setTemplates(fetchedTemplates);
    });
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelConfig]);

  const applyTemplate = async (value: string) => {
    if (currentChannelId === null) return;
    setLoading(true);
    const template_name = value;
    const id_channel = currentChannelId;
    const dtitle = `Apply template "${value}"?`;
    try {
      await showDialog('confirm', dtitle, { message: dmessage });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, date, currentChannelId]);

  if (templates.length === 0) {
    return null;
  }

  return (
    <>
      <Dropdown
        options={dropdownOptions}
        icon="approval"
        label="Apply template"
        disabled={loading}
      />
    </>
  );
};

export default ApplySchedulingTemplate;
