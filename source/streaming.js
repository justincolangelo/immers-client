import io from 'socket.io-client'

export class ImmersSocket extends window.EventTarget {
  #token
  /**
   * @param  {string} homeImmer
   * @param  {string} token
   */
  constructor (homeImmer, token) {
    super()
    this.#token = token
    this.socket = io(homeImmer, {
      transportOptions: {
        polling: {
          extraHeaders: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    })
    this.socket.on('connect', () => {
      this.dispatchEvent(new window.CustomEvent('immers-socket-connect'))
    })
    this.socket.on('friends-update', () => {
      this.dispatchEvent(new window.CustomEvent('immers-socket-friends-update'))
    })
    this.socket.on('inbox-update', activity => {
      activity = JSON.parse(activity)
      this.dispatchEvent(new window.CustomEvent('immers-socket-inbox-update', { detail: JSON.parse(activity) }))
    })
  }

  /**
   * @param  {APActor} actorObj
   * @param  {APObject} place
   */
  prepareLeaveOnDisconnect (actorObj, place) {
    this.socket.emit('entered', {
      // prepare a leave activity to be fired on disconnect
      outbox: actorObj.outbox,
      authorization: `Bearer ${this.#token}`,
      leave: {
        type: 'Leave',
        actor: actorObj.id,
        target: place,
        to: actorObj.followers,
        summary: `${actorObj.name} left ${place.name}.`
      }
    })
  }
}
