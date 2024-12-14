import nebula from '/src/nebula'

const formatRundownSymbol = (rowData) => {
  if (rowData.type !== 'item') {
    return <td></td>
  }

  const style = {}
  //style.fontSize = '18px'
  let icon = ''
  if (rowData.id_asset) {
    const folder = nebula.settings.folders.find(
      (f) => f.id === rowData.id_folder
    )
    style.color = folder?.color
    // icon = rowData.is_primary
    //   ? 'radio_button_checked'
    //   : 'radio_button_unchecked'
    icon = rowData.is_primary ? 'star' : 'fiber_manual_record'
  } else if (rowData.item_role === 'placeholder') {
    icon = 'expand'
  } else if (rowData.item_role === 'live') {
    icon = 'live_tv'
    style.color = 'red'
  } else if (rowData.item_role === 'lead_in') {
    icon = 'vertical_align_bottom'
  } else if (rowData.item_role === 'lead_out') {
    icon = 'vertical_align_top'
  } else {
    icon = 'question_mark'
  }

  return (
    <td style={{ padding: 0 }}>
      <span className="icon material-symbols-outlined" style={style}>
        {icon}
      </span>
    </td>
  )
}

export default formatRundownSymbol
