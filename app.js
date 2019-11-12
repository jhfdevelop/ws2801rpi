const WS2801Connect = require('ws2801-connect')
const SoftSPI = require("rpi-softspi")
const BroadcastConnector = require('./broadcastConnector')
const WebSocket = require('ws')

const ledCount = 32
const defaultRainbow = [[247, 149, 51], [243, 112, 85], [239, 78, 123], [161, 102, 171], [80, 115, 184], [16, 152, 173], [7, 179, 155], [111, 186, 130]]

function init() {
    new WS2801(ledCount)
}

class WS2801 {

    constructor(ledCount) {
        this.values = Array(ledCount).fill([0, 0, 0])
        this.ledCount = ledCount

        this.spi = new SoftSPI({
            clock: 23, // GPIO 3 - SCL
            mosi: 19 // GPIO 2 - SDA
        })

        this.spi.open()

        let me = this
        this.leds = new WS2801Connect({
            count: 32,
            spiWrite: (data) => {
                me.spi.write(data)
            }
        })

        console.log('ws2801 is ready')

        this.leds.fill([0, 0, 0])
        this.leds.show()

        this.isConnected = false
        this._discoverServer()
    }

    _discoverServer() {
        const c = new BroadcastConnector()
        c.setInterval(5000)

        c.onServerFound(address => {
            this.isConnected = true
            this._setupWSClient(address)
        })

        this._discoveryLoop()
    }

    async _discoveryLoop() {
        while (!this.isConnected) {
            await this._fadeTo(Array(ledCount).fill([0, 100, 255]))
            await this._fadeTo(Array(ledCount).fill([0, 0, 0]))
        }
    }

    _setupWSClient(address) {
        console.log(`connecting to discoverd ws server ${address}`)
        const ws = new WebSocket(address)
        ws.on('message', data => this._parseWSData(data, ws))
    }

    _parseWSData(data, ws) {
        const json = JSON.parse(data)

        switch (json.type) {
            case 'gradient':
                this._setGradient(data)
                break
            case 'fill':
                this._fadeTo(Array(ledCount).fill(json.value))
                break
            case 'rainbow':
                this._setGradient({stops: defaultRainbow})
                break
            default:
                console.log('client did not understand data from server')
                console.log(json)
        }
    }

    async _setGradient(data) {
        let fullGradient = []
        let singleGradientSize = Math.floor(this.ledCount / (data.stops.length - 1))
        let isOdd = (this.ledCount / (data.stops.length - 1)) !== singleGradientSize

        for (let index = 0; index < data.stops.length - 1; index++) {
            let isLast = index === data.stops.length - 2
            this._calculateGradient(data.stops[index], data.stops[index + 1], singleGradientSize + (isOdd && isLast ? 1 : 0)).forEach(pxl => fullGradient.push(pxl))
        }

        this._fadeTo(fullGradient)
    }

    _calculateGradient(start, end, count) {
        let pixels = this._pixelLinspace(start, end, count)

        let values = []
        let currentPixel = start.slice()

        for (let i = 0; i < count; i++) {
            currentPixel[0] = Math.round(pixels[0][i])
            currentPixel[1] = Math.round(pixels[1][i])
            currentPixel[2] = Math.round(pixels[2][i])
            values.push(currentPixel.slice())
        }
        return values
    }

    _linspace(start, end, count) {
        if (!count) {
            count = Math.max(Math.round(end - start), 1)
        }
        if (count < 2) {
            return count === 1 ? [start] : []
        }

        let output = Array(count)
        count--

        for (let i = count; i >= 0; i--) {
            output[i] = (i * end + (count - i) * start) / count
        }

        return output
    }

    _rainbow() {
        let hue_step = Math.floor(256 / this.ledCount)
        let rainbow = []

        for (let hue = 0; hue < 256; hue += hue_step) {

            if (hue < 85) {

                rainbow.push([255 - hue * 3, hue * 3, 0])

            } else if (hue < 170) {

                let p = hue - 85
                rainbow.push([0, 255 - p * 3, p * 3])

            } else {

                let p = hue - 170
                rainbow.push([p * 3, 0, 255 - p * 3])
            }
        }
        return rainbow
    }

    async _fadeTo(to, steps) {
        if (!steps) {
            steps = 50
        }

        //every pixel gets one linespace
        let linspaces = []

        this.values.forEach((pxl, index) => {
            linspaces.push(this._pixelLinspace(pxl, to[index], steps))
        })

        for (let step = 0; step < steps; step++) {
            linspaces.forEach((linspace, index) => {
                let r = linspace[0][step]
                let g = linspace[1][step]
                let b = linspace[2][step]
                this.leds.setLight(index, r, g, b)
            })
            this.leds.show()
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(), 100)
            })
        }
        this.values = to.slice()
    }

    _pixelLinspace(start, end, count) {
        let stepRed = this._linspace(start[0], end[0], count)
        let stepGreen = this._linspace(start[1], end[1], count)
        let stepBlue = this._linspace(start[2], end[2], count)

        return [stepRed, stepGreen, stepBlue]
    }
}

init()
