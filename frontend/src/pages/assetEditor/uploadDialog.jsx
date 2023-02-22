import axios from 'axios'
import styled from 'styled-components'

import { useState, useRef } from 'react'
import { toast } from 'react-toastify'
import { Dialog, Button, DialogButtons } from '/src/components'

import nebula from '/src/nebula'


const FileSelectWidget = ({
  onSelect,
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


const Progress = ({ bytesTransferred, totalBytes }) => {
  const percent = (bytesTransferred / totalBytes) * 100;
  return (
      <div style={{ width: "100%", height: "10px", backgroundColor: "lightgray" }}>
        <div style={{ width: `${percent}%`, height: "10px", backgroundColor: "blue" }} />
      </div>
  )
}

const FileDetailWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  min-width: 300px;

  h2 {
    display: flex;
    min-height: 100px;
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

  return (
    <FileDetailWrapper>
      <h2>{file.name} ({formatFileSize(file.size)})</h2>
      <Progress bytesTransferred={bytesTransferred} totalBytes={file.size} />
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
    if (file && 0 < bytesTransferred && bytesTransferred < file.size) {
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
        console.log("Error response", error.response);
      }
      setBytesTransferred(0)
      setUploading(false)
    }

    setUploading(false)
    toast.success("Upload complete")
  } // handleUpload

  return (
    <Dialog onHide={handleHide} header={`Upload ${assetData?.title}`}>

      <FileDetails file={file} bytesTransferred={bytesTransferred} /> 

      <DialogButtons>
      <FileSelectWidget onSelect={setFile} />
      <Button
        label="Upload"
        icon="upload"
        onClick={handleUpload}
        disabled={!file?.size}
      />
      </DialogButtons>

    </Dialog>
  )
}

export default UploadDialog
