const WS2801Connect = require('ws2801-connect')
const SoftSPI = require("rpi-softspi")
const rest = require('./rest')

const ledCount = 32

function init() {
    new WS2801(ledCount)
}

class WS2801 {

    constructor(ledCount) {
        this.values = Array(ledCount).fill([0,0,0])
        this.ledCount = ledCount

        this.spi = new SoftSPI({
            clock: 23, // GPIO 3 - SCL
            mosi: 19 // GPIO 2 - SDA
        })

        this.spi.open()

        let me = this
        this.leds = new WS2801Connect({
            count: 32,
            spiWrite: (data) => { me.spi.write(data) }
        })

        console.log('ws2801 is ready')

	//this._fadeTo(this._rainbow())
        this.leds.fill([0,100,255])
	this.leds.show()

	this.values = Array(ledCount).fill([0,100,255])
	this._fadeTo(Array(ledCount).fill([0,0,0]))


        this._registerCallbacks()
        rest.startup(2684)
    }

    _registerCallbacks() {
        rest.registerCallback('/color/fill', {
            verb: 'POST',
            fn: (req, res) => this._singleColorCallback(req, res)
        })

        rest.registerCallback('/color/gradient', {
            verb: 'POST',
            fn: (req, res) => this._gradientCallback(req, res)
        })

        rest.registerCallback('/color/rainbow', {
            verb: 'POST',
            fn: (req, res) => this._rainbowCallback(req, res)
        })

        rest.registerCallback('/color/status', {
            verb: 'GET',
            fn: (req, res) => this._statusResponse(req, res)
        })
    }

    async _singleColorCallback(req, res) {

        let data

        try {
            data = await rest.jsonData(req)
        } catch (e) {
            rest.jsonResponse({'error': 'request object must be json'}, res)
            return
        }

        if (data.hasOwnProperty('value')) {
            let values = Array(this.ledCount).fill([data.value[0], data.value[1], data.value[2]])
            this._fadeTo(values)
            this._statusResponse(req, res)

        } else {
            rest.jsonResponse({'error': 'request object must contain the property value'}, res)
        }
    }

    async _gradientCallback(req, res) {

        let data

        try {
            data = await rest.jsonData(req)
        } catch (e) {
            rest.jsonResponse({'error': 'request object must be json'}, res)
            return
        }

        if (data.hasOwnProperty('stops') && data.stops.length > 1) {

            let fullGradient = []
            let singleGradientSize = Math.floor(this.ledCount / (data.stops.length - 1))
            let isOdd = (this.ledCount / (data.stops.length - 1)) !== singleGradientSize

            for (let index = 0; index < data.stops.length - 1; index++) {
                let isLast = index === data.stops.length - 2
                this._calculateGradient(data.stops[index], data.stops[index + 1], singleGradientSize + (isOdd && isLast ? 1 : 0)).forEach(pxl => fullGradient.push(pxl))
            }

            this._fadeTo(fullGradient)
            this._statusResponse(req, res)

        } else {
            rest.jsonResponse({'error': 'request object must contain the property \"stops\" and needs at least two color values'}, res)
        }
    }

    async _rainbowCallback(req, res) {
        this._fadeTo(this._rainbow())
        this._statusResponse(req, res)
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

    _statusResponse(req, res) {
        rest.jsonResponse({
            data: this.values
        }, res)
    }
}

init()
