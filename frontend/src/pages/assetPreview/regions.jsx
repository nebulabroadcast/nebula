import { Table } from '/src/components'

const Regions = () => {
  return (
    <Table
      style={{ width: '100%' }}
      data={[
        { name: 'Region 1', type: 'Face', start: '00:00:00', end: '00:00:10' },
      ]}
      columns={[
        { name: 'name', title: 'Name' },
        { name: 'type', title: 'Type' },
        { name: 'start', title: 'Start' },
        { name: 'end', title: 'End' },
      ]}
    />
  )
}
export default Regions
