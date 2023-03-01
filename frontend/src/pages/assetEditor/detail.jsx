import { Form, FormRow, InputText } from '/src/components'
import nebula from '/src/nebula'

const MetadataDetail = ({ assetData }) => {
  return (
    <div className="contained" style={{ overflow: 'scroll', padding: 15 }}>
      <Form>
        {assetData &&
          Object.keys(assetData).map((key) => {
            let value = assetData[key]
            if (['object', 'list'].includes(nebula.metaType(key)))
              value = JSON.stringify(value)
            else if (typeof value === 'object') value = JSON.stringify(value)

            return (
              <FormRow key={key} title={nebula.metaTitle(key)}>
                <InputText value={value} readOnly />
              </FormRow>
            )
          })}
      </Form>
    </div>
  )
}
export default MetadataDetail
