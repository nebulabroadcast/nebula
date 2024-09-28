import { Navbar, Button, Spacer } from '/src/components'

const PreviewNav = () => {
  return (
    <Navbar>
      <Spacer />
      <Button icon="backspace" title="Discard changes" onClick={() => {}} />
      <Button icon="check" title="Save asset" onClick={() => {}} />
    </Navbar>
  )
}

export default PreviewNav
