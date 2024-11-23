import nebula from '/src/nebula'

const formatObjectTitle = (rowData, key) => {
  const title = rowData[key]
  const subtitle = rowData.subtitle
  return (
    <td>
      <span>{title}</span>
      {subtitle && (
        <>
          <span style={{ color: 'var(--color-text-dim)' }}>
            {nebula.settings.system.subtitle_separator}
            {subtitle}
          </span>
        </>
      )}
    </td>
  )
}

export default formatObjectTitle
