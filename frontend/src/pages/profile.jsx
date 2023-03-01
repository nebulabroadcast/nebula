import nebula from '/src/nebula'
import { Form, FormRow, InputText, Button } from '/src/components'

const ProfilePage = () => {
  const displayName = nebula.user.full_name || nebula.user.login

  return (
    <main>
      <div className="column" style={{ minWidth: 400 }}>
        <section className="column">
          <h1>Profile: {displayName}</h1>

          <Form>
            <FormRow title="Login">
              <InputText value={nebula.user.login} disabled />
            </FormRow>
            <FormRow title="Full name">
              <InputText value={nebula.user.full_name} />
            </FormRow>
            <FormRow title="Email">
              <InputText value={nebula.user.email} />
            </FormRow>
            <FormRow>
              <Button label="Save" icon="check" />
            </FormRow>
          </Form>
        </section>

        <section className="column">
          <h2>Change password</h2>
          <Form>
            <FormRow title="New password">
              <InputText type="password" />
            </FormRow>
            <FormRow title="Repeat new password">
              <InputText type="password" />
            </FormRow>
            <FormRow>
              <Button label="Change password" icon="check" />
            </FormRow>
          </Form>
        </section>
      </div>
      <section className="grow column">
        <h1>Access control</h1>
        {nebula.user.is_admin && (
          <p>You are an administrator. You can do whatever you want</p>
        )}
      </section>

      <section className="grow column">
        <h1>Active sessions</h1>
      </section>
    </main>
  )
}

export default ProfilePage
