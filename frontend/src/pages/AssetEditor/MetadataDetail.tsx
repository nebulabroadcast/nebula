import React from 'react';

import { Form, FormRow, InputText } from '@/components';
import nebula from '@/nebula';

interface MetadataDetailProps {
  assetData: Record<string, any>;
}

const MetadataDetail: React.FC<MetadataDetailProps> = ({ assetData }) => {
  return (
    <div className="contained" style={{ overflow: 'scroll', padding: 15 }}>
      <Form>
        {assetData &&
          Object.keys(assetData).map((key) => {
            const metaType = nebula.metaType(key);
            let value = assetData[key];
            if (['object', 'list'].includes(metaType.type || ''))
              value = JSON.stringify(value);
            else if (typeof value === 'object' && value !== null)
              value = JSON.stringify(value);

            return (
              <FormRow key={key} title={metaType.title}>
                <InputText
                  value={String(value || '')}
                  readOnly
                  onChange={() => {
                    // read-only field
                  }}
                />
              </FormRow>
            );
          })}
      </Form>
    </div>
  );
};
export default MetadataDetail;
