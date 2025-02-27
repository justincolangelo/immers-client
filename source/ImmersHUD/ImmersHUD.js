import htmlTemplate from './ImmersHUD.html'
import styles from './ImmersHUD.css'
import { ImmersClient } from '../client'

/**
 * Web Component heads-up display for Immers profile login.
 * Unobtrusively connects your Immersive Web experience to the Immers Space
 * metaverse, allowing immersers to connect with their profiles from your site
 * and share your site with their friends. Grants access to profile information
 * so you can bring users' preferred identity into your experience.
 *
 * The HTML attributes are listed in the Properties table below.
 * Properties you can access from the element object directly are listed under Members.
 *
 * @class ImmersHUD
 *
 * @fires immers-hud-connected - On successful login, detail.profile will include users {@link Profile}
 *
 * @prop {'top-left'|'top-right'|'bottom-left'|'bottom-right'} [position] - Enable overlay positioning.
 * @prop {string} token-catcher - OAuth redirect URL, a page on your domain that runs {@link catchToken} on load
 * @prop {string} access-role - Requested authorization scope from {@link roles}. Users are given the option to alter this and grant a different level.
 * @prop {string} [destination-name] Title for your experience (required if you don't have a local Immers Server)
 * @prop {string} [destination-url] Sharable URL for your experience (required if you don't have a local Immers Server)
 * @prop {string} [local-immer] Origin of your local Immers Server, if you have one
 * @prop {'true'|'false'} open - Toggles between icon and full HUD view
 *
 * @example <caption>Load & register the custom element via import (option 1)</caption>
 * import 'immers-client/dist/ImmersHUD.bundle'
 * @example <caption>Load & register the custom element via CDN (option 2)</caption>
 * <script type="module" src="https://unpkg.com/immers-client/dist/ImmersHUD.bundle.js"></script>
 * @example <caption>Using the custom element in HTML</caption>
 * <immers-hud position="bottom-left" access-role="friends"
 *             destination-name="My Immer" destination-url="https://myimmer.com/"
 *             token-catcher="https://myimmer.com/"></immers-hud>
 *
 */
export class ImmersHUD extends window.HTMLElement {
  #queryCache = {}
  #container
  /**
   * @prop {FriendStatus[]} - Live-updated friends list with current status
   */
  friends = []
  /**
   * @prop {ImmersClient} - Immers client instance
   */
  immersClient
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    const styleTag = document.createElement('style')
    styleTag.innerHTML = styles
    const template = document.createElement('template')
    template.innerHTML = htmlTemplate.trim()
    this.shadowRoot.append(styleTag, template.content.cloneNode(true))
    this.#container = this.shadowRoot.lastElementChild
  }

  connectedCallback () {
    if (this.immersClient) {
      // already initialized
      return
    }
    // Immers client setup
    if (this.getAttribute('local-immer')) {
      /* todo: fetch local place object and initialize client in full immer mode */
    } else {
      this.immersClient = new ImmersClient({
        id: window.location.href,
        name: this.getAttribute('destination-name'),
        url: this.getAttribute('destination-url')
      })
      this.immersClient.addEventListener(
        'immers-client-friends-update',
        ({ detail: { friends } }) => this.onFriendsUpdate(friends)
      )
    }

    this.#container.addEventListener('click', evt => {
      switch (evt.target.id) {
        case 'login':
          evt.preventDefault()
          this.login()
          break
        case 'logo':
          this.setAttribute('open', this.getAttribute('open') !== 'true')
          break
        case 'exit-button':
          this.remove()
          break
      }
    })
  }

  attributeChangedCallback (name, oldValue, newValue) {
    switch (name) {
      case 'position':
        if (newValue && !ImmersHUD.POSITION_OPTIONS.includes(newValue)) {
          console.warn(`immers-hud: unknown position ${newValue}. Valid options are ${ImmersHUD.POSITION_OPTIONS.join(', ')}`)
        }
        break
      case 'open':
        this.#el('notification').classList.add('hidden')
        break
    }
  }

  async login () {
    await this.immersClient.connect(
      this.getAttribute('token-catcher'),
      this.getAttribute('access-role'),
      this.#el('handle-input').value
    )
    this.#el('login-container').classList.add('removed')
    this.#el('status-container').classList.remove('removed')
    const profile = this.immersClient.profile
    // show profile info
    if (profile.avatarImage) {
      this.#el('logo').style.backgroundImage = `url(${profile.avatarImage})`
    }
    this.#el('username').textContent = profile.displayName
    this.#el('profile-link').setAttribute('href', profile.url)
    this.#emit('immers-hud-connected', { profile })
  }

  onFriendsUpdate (friends) {
    this.friends = friends
    if (this.getAttribute('open') !== 'true') {
      this.#el('notification').classList.remove('hidden')
    }
    this.#el('status-message').textContent = `${friends.filter(f => f.isOnline).length}/${friends.length} friends online`
  }

  #el (id) {
    return this.#queryCache[id] ?? (this.#queryCache[id] = this.#container.querySelector(`#${id}`))
  }

  #emit (type, data) {
    this.dispatchEvent(new window.CustomEvent(type, {
      detail: data
    }))
  }

  static get observedAttributes () {
    return ['position', 'open']
  }

  static get POSITION_OPTIONS () {
    return ['top-left', 'bottom-left', 'top-right', 'bottom-right']
  }

  static Register () {
    window.customElements.define('immers-hud', ImmersHUD)
  }
}
