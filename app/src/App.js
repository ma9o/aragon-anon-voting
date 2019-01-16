import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  AppBar,
  AppView,
  Button,
  BaseStyles,
  PublicUrl,
  SidePanel,
  observe,
} from '@aragon/ui'
import BN from 'bn.js'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import tokenAbi from './abi/token-balanceOfAt.json'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AutoLink from './components/AutoLink'
import { networkContextType } from './utils/provideNetwork'
import { settingsContextType } from './utils/provideSettings'
import { hasLoadedVoteSettings } from './vote-settings'
import { VOTE_YEA } from './vote-types'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'
import { makeEtherscanBaseUrl } from './utils'
import { isVoteOpen, voteTypeFromContractEnum } from './vote-utils'
import { shortenAddress, transformAddresses } from './web3-utils'
import saveAs from 'file-saver'
import { genID, sign } from './uaosring'
import { keccak256 } from 'js-sha3'
import { hexToDec } from 'hex2dec'
import { AES, enc } from 'crypto-js'
import PwdCard from './screens/PwdCard'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    appStateReady: false,
    network: {},
    tokenSymbol: '',
    userAccount: '',
    votes: [],
  }
  static childContextTypes = {
    network: networkContextType,
    settings: settingsContextType,
  }
  getChildContext() {
    const { network, pctBase, voteTime } = this.props

    return {
      network: {
        etherscanBaseUrl: makeEtherscanBaseUrl(network.type),
        type: network.type,
      },
      settings: {
        pctBase,
        voteTime,
      },
    }
  }

  constructor(props) {
    super(props)

    this.state = {
      createVoteVisible: false,
      currentVoteId: -1,
      tokenContract: this.getTokenContract(props.tokenAddress),
      voteVisible: false,
      voteSidebarOpened: false,
      userAccountVotes: new Map(),
    }
  }
  componentWillReceiveProps(nextProps) {
    // Refresh the token contract if its address changes
    if (nextProps.tokenAddress !== this.props.tokenAddress) {
      this.setState({
        tokenContract: this.getTokenContract(nextProps.tokenAddress),
      })
    }

    // Refresh the account votes if the account changes,
    // or if there is any vote update.
    if (
      nextProps.votes !== this.props.votes ||
      nextProps.userAccount !== this.props.userAccount
    ) {
      this.loadUserAccountVotes(nextProps.userAccount, nextProps.votes)
    }

    if (nextProps.userAccount !== this.props.userAccount) {
      this.idClaimAvailable(nextProps.userAccount)
    }
  }

  async idClaimAvailable(address) {
    const { app } = this.props
    this.setState({
      idAvailable: await new Promise(resolve => {
        app
          .call('idClaimAvailable', address)
          .first()
          .subscribe(res => resolve(res))
      }),
    })
  }

  async loadUserAccountVotes(userAccount, votes) {
    const { app } = this.props

    if (!userAccount) {
      this.setState({ userAccountVotes: new Map() })
      return
    }

    this.setState({
      userAccountVotes: new Map(
        await Promise.all(
          votes.map(
            vote =>
              new Promise((resolve, reject) => {
                app
                  .call('getVoterState', vote.voteId, userAccount)
                  .subscribe(result => resolve([vote.voteId, result]), reject)
              })
          )
        )
      ),
    })
  }

  getTokenContract(tokenAddress) {
    return tokenAddress && this.props.app.external(tokenAddress, tokenAbi)
  }
  handlePasswordChange = pwd => {
    let pwdOK = false
    if (pwd != null) {
      if (pwd.length === 8) {
        let data = ''
        if (this.state.encrypted != null) {
          data = this.state.encrypted.toString()
        }
        try {
          JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8))
          pwdOK = true
        } catch (e) {
          console.log('Wrong password')
        }
      }
    }
    this.setState({ password: pwd, pwdOK: pwdOK })
  }
  handleIDUpload = (acceptedFiles, rejectedFiles) => {
    let fileData = new FileReader()
    fileData.onloadend = (fileData, ev) => {
      this.setState({ encrypted: fileData.target.result })
      this.handlePasswordChange(this.state.password)
    }
    fileData.readAsText(acceptedFiles[0])
  }
  genSig = (voteId, msg = null) => {
    let { pub, priv, fake } = JSON.parse(
      AES.decrypt(this.state.encrypted.toString(), this.state.pwd).toString(
        enc.Utf8
      )
    )

    if (msg != null) {
      msg = hexToDec('0x' + keccak256(msg))
    } else {
      let v = this.props.votes.find(vote => vote.voteId === voteId)
      msg = v.data.signMe
      console.log('old vote msg:', msg)
    }

    return sign(msg, pub, priv, fake, this.props.keypairs)
  }
  handleGenerateID = () => {
    let keypair = genID()
    this.props.app
      .confirmID(keypair.pub, keypair.fake)
      .subscribe(this.saveKey(keypair))
  }
  saveKey = keypair => {
    let pwd = Math.random() // quick and dirty!
      .toString(36)
      .substring(2, 10)
    this.setState({
      keypair: keypair,
      pwd: pwd,
      newPwd: true,
      idAvailable: false,
    })
    saveAs(
      new Blob(
        [
          AES.encrypt(
            JSON.stringify({
              pub: keypair.pub,
              priv: keypair.priv,
              fake: keypair.fake,
            }),
            pwd
          ),
        ],
        {
          type: 'text/plain;charset=utf-8',
        }
      ),
      'aragon-ID.json'
    )
  }
  handleCreateVote = question => {
    let sig = this.genSig(0, question)
    this.props.app.newVote(EMPTY_CALLSCRIPT, question, true, true, sig) // unable to pass array for some obscure reason
    this.handleCreateVoteClose()
  }
  handleCreateVoteOpen = () => {
    this.setState({ createVoteVisible: true })
  }
  handleCreateVoteClose = () => {
    this.setState({ createVoteVisible: false, pwdOK: false })
  }
  handleVoteOpen = voteId => {
    const exists = this.props.votes.some(vote => voteId === vote.voteId)
    if (!exists) return
    this.setState({
      currentVoteId: voteId,
      voteVisible: true,
      voteSidebarOpened: false,
    })
  }
  handleVote = (voteId, voteType, executesIfDecided = true) => {
    let sig = this.genSig(voteId)
    this.props.app.vote(voteId, voteType === VOTE_YEA, executesIfDecided, sig)
    this.handleVoteClose()
  }
  handleExecute = voteId => {
    this.props.app.executeVote(voteId)
    this.handleVoteClose()
  }
  handleVoteClose = () => {
    this.setState({ voteVisible: false, pwdOK: false })
  }
  handleVoteTransitionEnd = opened => {
    this.setState(opened ? { voteSidebarOpened: true } : { currentVoteId: -1 })
  }

  shortenAddresses(label) {
    return transformAddresses(label, (part, isAddress, index) =>
      isAddress ? (
        <span title={part} key={index}>
          {shortenAddress(part)}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    )
  }
  // Shorten addresses, render line breaks, auto link
  renderVoteText(description) {
    return (
      description && (
        <AutoLink>
          {description.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {this.shortenAddresses(line)}
              <br />
            </React.Fragment>
          ))}
        </AutoLink>
      )
    )
  }
  render() {
    const {
      app,
      appStateReady,
      tokenDecimals,
      tokenSymbol,
      userAccount,
      votes,
    } = this.props

    const {
      createVoteVisible,
      currentVoteId,
      tokenContract,
      voteSidebarOpened,
      voteVisible,
      userAccountVotes,
      idAvailable,
      pwd,
      newPwd,
      pwdOK,
    } = this.state

    const now = new Date()

    // Add useful properties to the votes
    const preparedVotes = appStateReady
      ? votes.map(vote => ({
          ...vote,
          data: {
            ...vote.data,
            open: isVoteOpen(vote, now),

            // Render text fields
            descriptionNode: this.renderVoteText(vote.data.description),
            metadataNode: this.renderVoteText(vote.data.metadata),
          },
          userAccountVote: voteTypeFromContractEnum(
            userAccountVotes.get(vote.voteId)
          ),
        }))
      : votes

    const currentVote =
      currentVoteId === -1
        ? null
        : preparedVotes.find(vote => vote.voteId === currentVoteId)
    const hasCurrentVote = appStateReady && Boolean(currentVote)

    let mainFrame
    if (newPwd) {
      mainFrame = (
        <PwdCard
          onActivate={() => {
            this.setState({ newPwd: false })
          }}
          pwd={pwd}
        />
      )
    } else {
      if (appStateReady && votes.length > 0) {
        mainFrame = (
          <Votes votes={preparedVotes} onSelectVote={this.handleVoteOpen} />
        )
      } else {
        mainFrame = <EmptyState onActivate={this.handleCreateVoteOpen} />
      }
    }

    return (
      <PublicUrl.Provider url="./aragon-ui/">
        <BaseStyles />
        <Main>
          <AppView
            appBar={
              <AppBar
                title="Voting"
                endContent={
                  <React.Fragment>
                    <Button
                      mode="strong"
                      onClick={this.handleCreateVoteOpen}
                      style={{ marginRight: '.5em' }}
                    >
                      New Vote
                    </Button>
                    {idAvailable ? (
                      <IDButton mode="strong" onClick={this.handleGenerateID}>
                        Generate ID
                      </IDButton>
                    ) : (
                      <Button mode="strong" disabled>
                        Generate ID
                      </Button>
                    )}
                  </React.Fragment>
                }
              />
            }
          >
            {mainFrame}
          </AppView>
          <SidePanel
            title={`Vote #${currentVoteId} (${
              currentVote && currentVote.data.open ? 'Open' : 'Closed'
            })`}
            opened={hasCurrentVote && !createVoteVisible && voteVisible}
            onClose={this.handleVoteClose}
            onTransitionEnd={this.handleVoteTransitionEnd}
          >
            {hasCurrentVote && (
              <VotePanelContent
                app={app}
                vote={currentVote}
                user={userAccount}
                ready={voteSidebarOpened}
                tokenContract={tokenContract}
                tokenDecimals={tokenDecimals}
                tokenSymbol={tokenSymbol}
                onVote={this.handleVote}
                onExecute={this.handleExecute}
                onIDUpload={this.handleIDUpload}
                checkPwd={this.handlePasswordChange}
                pwdOK={pwdOK}
              />
            )}
          </SidePanel>

          <SidePanel
            title="New Vote"
            opened={createVoteVisible}
            onClose={this.handleCreateVoteClose}
          >
            <NewVotePanelContent
              opened={createVoteVisible}
              onCreateVote={this.handleCreateVote}
              onIDUpload={this.handleIDUpload}
              checkPwd={this.handlePasswordChange}
              pwdOK={pwdOK}
            />
          </SidePanel>
        </Main>
      </PublicUrl.Provider>
    )
  }
}

const Main = styled.div`
  height: 100vh;
`

const IDButton = styled(Button)`
  @keyframes shake {
    10%,
    90% {
      transform: translate3d(-1px, 0, 0);
    }

    20%,
    80% {
      transform: translate3d(2px, 0, 0);
    }

    30%,
    50%,
    70% {
      transform: translate3d(-4px, 0, 0);
    }

    40%,
    60% {
      transform: translate3d(4px, 0, 0);
    }
  }

  animation: shake 1s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
`

export default observe(
  observable =>
    observable.map(state => {
      const appStateReady = hasLoadedVoteSettings(state)
      if (!appStateReady) {
        return {
          ...state,
          appStateReady,
        }
      }

      const { pctBase, tokenDecimals, voteTime, votes, keypairs } = state

      const pctBaseNum = parseInt(pctBase, 10)
      const tokenDecimalsNum = parseInt(tokenDecimals, 10)
      const tokenDecimalsBaseNum = Math.pow(10, tokenDecimalsNum)

      return {
        ...state,

        appStateReady,
        pctBase: new BN(pctBase),
        tokenDecimals: new BN(tokenDecimals),

        numData: {
          pctBase: pctBaseNum,
          tokenDecimals: tokenDecimalsNum,
        },
        // Transform the vote data for the frontend
        votes: votes
          ? votes.map(vote => {
              const { data } = vote
              return {
                ...vote,
                data: {
                  ...data,
                  endDate: new Date(data.startDate + voteTime),
                  minAcceptQuorum: new BN(data.minAcceptQuorum),
                  nay: new BN(data.nay),
                  supportRequired: new BN(data.supportRequired),
                  votingPower: new BN(data.votingPower),
                  yea: new BN(data.yea),
                },
                numData: {
                  minAcceptQuorum:
                    parseInt(data.minAcceptQuorum, 10) / pctBaseNum,
                  nay: parseInt(data.nay, 10) / tokenDecimalsBaseNum,
                  supportRequired:
                    parseInt(data.supportRequired, 10) / pctBaseNum,
                  votingPower:
                    parseInt(data.votingPower, 10) / tokenDecimalsBaseNum,
                  yea: parseInt(data.yea, 10) / tokenDecimalsBaseNum,
                },
              }
            })
          : [],
        keypairs,
      }
    }),
  {}
)(App)
