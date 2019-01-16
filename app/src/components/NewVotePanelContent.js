import React from 'react'
import styled from 'styled-components'
import { Button, Info, Text, TextInput, Field } from '@aragon/ui'
import classNames from 'classnames'
import Dropzone from 'react-dropzone'

const initialState = {
  question: '',
  password: '',
}

class NewVotePanelContent extends React.Component {
  static defaultProps = {
    onCreateVote: () => {},
    onIDUpload: () => {},
    checkPwd: () => {},
  }
  state = {
    ...initialState,
  }
  componentWillReceiveProps({ opened }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input's on
      // screen until we call focus
      this.questionInput && setTimeout(() => this.questionInput.focus(), 0)
    } else if (!opened && this.props.opened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialState })
    }
  }
  handleQuestionChange = event => {
    this.setState({ question: event.target.value })
  }
  handleSubmit = event => {
    event.preventDefault()
    this.props.onCreateVote(this.state.question.trim())
  }
  handlePasswordChange = event => {
    this.setState({ password: event.target.value })
    this.props.checkPwd(event.target.value)
  }

  render() {
    const { question, password } = this.state
    const { pwdOK } = this.props
    return (
      <div>
        <Info.Action title="Votes are informative">
          They don’t have any direct repercussion on the organization.
        </Info.Action>
        <Form onSubmit={this.handleSubmit}>
          <Field label="Question">
            <TextInput
              innerRef={question => (this.questionInput = question)}
              value={question}
              onChange={this.handleQuestionChange}
              required
              wide
            />
          </Field>
          <FileContainer>
            <Field label="Password">
              <TextInput
                value={password}
                onChange={this.handlePasswordChange}
                required
                wide
                type="password"
              />
            </Field>
            <Dropzone onDrop={this.props.onIDUpload}>
              {({
                getRootProps,
                getInputProps,
                isDragActive,
                acceptedFiles,
              }) => {
                return (
                  <div
                    {...getRootProps()}
                    className={classNames('dropzone', Button.Anchor.className, {
                      'dropzone--isActive': isDragActive,
                    })}
                    style={{ padding: '1em', width: '50%' }}
                  >
                    <Button mode="strong" wide>
                      {acceptedFiles.length !== 0 ? (
                        <p>{acceptedFiles[0].name}</p>
                      ) : (
                        <p>Select ID file</p>
                      )}
                      <input {...getInputProps()} />
                    </Button>
                  </div>
                )
              }}
            </Dropzone>
          </FileContainer>
          {pwdOK ? (
            <Button mode="strong" type="submit" wide>
              Begin Vote
            </Button>
          ) : (
            <Button mode="strong" type="submit" wide disabled>
              Unlock ID to vote
            </Button>
          )}
          <Warning>
            If you are allowed to directly create this vote, you will
            automatically vote yes for it.
          </Warning>
        </Form>
      </div>
    )
  }
}

const FileContainer = styled.div`
  display: flex;
`

const Form = styled.form`
  margin-top: 20px;
`

const Warning = styled(Text.Paragraph).attrs({
  size: 'xsmall',
})`
  margin-top: 10px;
`

export default NewVotePanelContent
