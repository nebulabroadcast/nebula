import { Dialog, InputText, Button } from '@components';
import React, { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const SubRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
`;

const createApiKey = () => {
  const prefix = 'nb';
  const segmentCount = 4;
  const segmentLength = 12;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
  const segments = [];

  for (let i = 0; i < segmentCount; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      segment += characters[randomIndex];
    }
    segments.push(segment);
  }

  return `${prefix}.${segments.join('.')}`;
};

interface ApiKeyPickerProps {
  setApiKey: (value: string) => void;
  apiKeyPreview?: string;
}

const ApiKeyPicker: React.FC<ApiKeyPickerProps> = ({ setApiKey, apiKeyPreview }) => {
  const [dialogVisible, setDialogVisible] = useState(false);

  const dialog = useMemo(() => {
    if (!dialogVisible) return null;

    const newKey = createApiKey();
    return (
      <Dialog
        onHide={() => {
          setDialogVisible(false);
        }}
        style={{ width: 550 }}
        header="Create API key"
        footer={
          <>
            <Button
              icon="close"
              label="Cancel"
              onClick={() => {
                setDialogVisible(false);
              }}
            />
            <Button
              icon="check"
              label="Store"
              onClick={() => {
                setApiKey(newKey);
                setDialogVisible(false);
              }}
            />
          </>
        }
      >
        <p>
          This API key will be used to authenticate your requests to the server. Copy it
          to your clipboard and store it in a safe place. You will not be able to
          retrieve it later.
        </p>

        <SubRow>
          <InputText
            value={newKey}
            readOnly
            onChange={() => {
              // read-only field
            }}
            style={{
              flexGrow: 1,
              fontFamily: 'monospace',
              fontStyle: 'normal',
              textAlign: 'center',
            }}
            onDoubleClick={(e) => {
              (e.target as HTMLInputElement).select();
            }}
          />
          <Button
            icon="content_copy"
            tooltip="Copy to clipboard"
            onClick={() => {
              void navigator.clipboard.writeText(newKey);
              toast.success('Copied to clipboard');
            }}
          />
        </SubRow>
      </Dialog>
    );
  }, [dialogVisible, setApiKey]);

  return (
    <>
      <InputText
        value={apiKeyPreview}
        readOnly
        onChange={() => {}}
        style={{
          flexGrow: 1,
          fontFamily: 'monospace',
          fontStyle: 'normal',
          textAlign: 'center',
        }}
      />
      <Button
        icon="key"
        label="Create API key"
        style={{ maxWidth: 150 }}
        onClick={() => {
          setDialogVisible(true);
        }}
      />
      {dialog}
    </>
  );
};

export default ApiKeyPicker;
