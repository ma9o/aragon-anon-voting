import React from 'react'
import styled from 'styled-components'
import { EmptyStateCard } from '@aragon/ui'
import mark from '../assets/exclamation-mark.svg'

const PwdCard = ({ onActivate, pwd }) => (
  <Main>
    <EmptyStateCard
      title="Your password"
      text={pwd}
      actionText="Gotcha"
      icon={<img src={mark} alt="" />}
      onActivate={onActivate}
    />
  </Main>
)

const Main = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`

export default PwdCard
