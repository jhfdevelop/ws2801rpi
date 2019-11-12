const dgram = require('dgram')

const devicePort = 8000
const serverPort = 5000
const defaultInterval = 5000

class BroadcastConnector {

    constructor(autostart) {
        this.port = devicePort
        this.callback = () => {
        }

        this.client = dgram.createSocket('udp4')
        this.client.bind(this.port)

        this.client.on('listening', () => {
            this.client.setBroadcast(true)
            console.log('waiting for response on port ' + this.port)
        })

        this.client.on('message', (message, remote) => this._onMessage(message, remote))

        this.info = {
            type: 'ui'
        }

        this._found = false

        this._discoveryLoop()

    }

    restart(){
        this._found = false
        this._discoveryLoop()
    }

    setInterval(interval) {
        this.interval = interval
    }

    onServerFound(callback) {
        this.callback = callback
    }

    _onMessage(message, remote) {
        this._found = true
        this.callback(message)
    }

    _discoveryLoop() {
        if (this._found) return

        console.log('discovering...')
        this._discover()

        setTimeout(() => this._discoveryLoop(), this.interval || defaultInterval)
    }


    _discover() {
        const message = JSON.stringify(this.info)
        this.client.send(message, 0, message.length, serverPort, '192.168.0.255', err => {
            if (err) throw err;
        })
    }
}

module.exports = BroadcastConnector