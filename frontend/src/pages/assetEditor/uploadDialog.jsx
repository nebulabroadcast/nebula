import axios from 'axios'
import styled from 'styled-components'

import { useState, useRef } from 'react'
import { toast } from 'react-toastify'
import { Dialog, Button, Progress } from '/src/components'

import nebula from '/src/nebula'


const FileSelectWidget = ({
  onSelect,
  disabled,
}) => {
  const inputRef = useRef(null);

  const onChange = (event) => {
    const files = [...event.target.files];
    if (files.length === 0) return;
    onSelect(files[0]);
    inputRef.current.value = null;
  };

  const accept = ".mov,.mxf,.mp4"

  return (
    <>
      <Button
        disabled={disabled}
        label="Select File"
        icon="upload"
        onClick={() => {
          inputRef.current.click();
        }}
      />
      <input
        style={{ display: "none" }}
        ref={inputRef}
        accept={accept}
        id="file-upload"
        type="file"
        onChange={onChange}
        multiple={false}
      />
    </>
  )
}



const FileDetailWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  min-width: 400px;
  min-height: 150px;

  h2 {
    display: flex;
    align-items: center;
    justify-content: center;
  }

`

const FileDetails = ({ file, bytesTransferred }) => {

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  if (!file) {
    return <FileDetailWrapper><h2> No File Selected </h2></FileDetailWrapper>
  }

  const percent = (bytesTransferred / file.size) * 100;
  
  return (
    <FileDetailWrapper>
      <h2>{file.name} ({formatFileSize(file.size)})</h2>
      <Progress value={percent} />
    </FileDetailWrapper>
  )
}



const UploadDialog = ({ onHide, assetData} ) => {
  const [file, setFile] = useState(null)
  const [bytesTransferred, setBytesTransferred] = useState(0)
  const [uploading, setUploading] = useState(false)

  const abortController = new AbortController()
  const cancelToken = axios.CancelToken
  const cancelTokenSource = cancelToken.source()

  const handleHide = () => {
    if (uploading) {
      toast.error("Upload in progress")
      return
    }
    onHide()
  }

  const handleProgress = (event) => {
    setBytesTransferred(event.loaded)
  }

  const handleUpload = async () => {
    setUploading(true)
    try {
      await axios.post(`/upload/${assetData.id}`, file, {
        signal: abortController.signal,
        cancelToken: cancelTokenSource.token,
        onUploadProgress: handleProgress,
        headers: { 
          "Content-Type": "application/octet-stream",
          "X-nebula-extension": file.name.split('.').pop(),
          "Authorization": `Bearer ${nebula.getAccessToken()}`
        },
      })
    } catch (error) {
      console.log(error)
      if (axios.isCancel(error)) {
        console.log("Request canceled", error.message);
      } else if (error.response) {
        toast.error("Upload failed")
        console.log("Error response", error.response);
      }
      setBytesTransferred(0)
      setUploading(false)
    }

    setUploading(false)
    toast.success("Upload complete")
  } // handleUpload

  const footer = (
    <>
      <FileSelectWidget onSelect={setFile} disabled={uploading}/>
      <Button
        label="Upload"
        icon="upload"
        onClick={handleUpload}
        disabled={!file?.size || uploading || file.size === bytesTransferred}
      />
    </>
  )

  return (
    <Dialog onHide={handleHide} header={`Upload ${assetData?.title}`} footer={footer}>
      <FileDetails file={file} bytesTransferred={bytesTransferred} /> 
    </Dialog>
  )
}

export default UploadDialog
