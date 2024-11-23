import nebula from '/src/nebula'

const formatObjectIdFolder = (rowData, key) => {
  const folder = nebula.settings.folders.find((f) => f.id === rowData[key])
  return <td style={{ color: folder?.color }}>{folder?.name}</td>
}

export default formatObjectIdFolder
