const MetadataDetail = ({ assetData }) => {
  return (
    <div className="contained" style={{ overflow: 'scroll' }}>
      <pre>{JSON.stringify(assetData, null, 2)}</pre>
    </div>
  )
}
export default MetadataDetail
