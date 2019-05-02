const ws2801 = require('rpi-ws2801')
const rest = require('./rest')

const ledCount = 32

function init() {
    new WS2801(ledCount)
}

class WS2801 {

    constructor(ledCount) {
        this.values = Array(ledCount)
        this.ledCount = ledCount

        ws2801.connect(ledCount, '/dev/spidev0.0')
        console.log('ws2801 is ready')

        this._rainbow().forEach((pxl, index) => {
            this.values[index] = pxl
            ws2801.setColor(index, pxl)
        })

        ws2801.update()

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
            rest.jsonResponse({ 'error': 'request object must be json' }, res)
            return
        }

        if (data.hasOwnProperty('value')) {
            let values = Array(this.ledCount).fill([data.value[0], data.value[1], data.value[2]])
            await this._fadeTo(values)
            this._statusResponse(req, res)

        } else {
            rest.jsonResponse({ 'error': 'request object must contain the property value' }, res)
        }
    }

    async _gradientCallback(req, res) {

        let data

        try {
            data = await rest.jsonData(req)
        } catch (e) {
            rest.jsonResponse({ 'error': 'request object must be json' }, res)
            return
        }

        if (data.hasOwnProperty('stops') && data.stops.length > 1) {

            let fullGradient = []
            let singleGradientSize = Math.floor(this.ledCount / (data.stops.length - 1))
            let isOdd = (this.ledCount / (data.stops.length - 1)) != singleGradientSize

            for (let index = 0; index < data.stops.length - 1; index++) {
                let isLast = index === data.stops.length - 2
                this._calculateGradient(data.stops[index], data.stops[index + 1], singleGradientSize + (isOdd && isLast ? 1 : 0)).forEach(pxl => fullGradient.push(pxl))
            }

            await this._fadeTo(fullGradient)
            _statusResponse(req, res)

        } else {
            rest.jsonResponse({ 'error': 'request object must contain the property \"stops\" and needs at least two color values' }, res)
        }
    }

    async _rainbowCallback(req, res) {
        await this._fadeTo(this._rainbow())
        _statusResponse(req, res)
    }

    _calculateGradient(start, end, count) {
        let pixels = this.pixelLinspace(start, end, count)

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
        if (!count) { count = Math.max(Math.round(end - start), 1) }
        if (count < 2) { return count === 1 ? [start] : [] }

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
        if (!steps) { steps = 50 }

        //every pixel gets one linespace
        let linspaces = []

        this.values.forEach((pxl, index) => {
            linspaces.push(this.pixelLinspace(pxl, to[index], steps))
        })

        for (let step = 0; step < steps; step++) {
            linspaces.forEach((linspace, index) => {
                let r = linspace[0][step]
                let g = linspace[1][step]
                let b = linspace[2][step]
                ws2801.setColor(index, [r, g, b])
            })
            ws2801.update()
        }
    }

    _pixelLinspace(start, end, count) {
        let stepRed = this._linspace(start[0], end[0], count)
        let stepGreen = this._linspace(start[1], end[1], count)
        let stepBlue = this._linspace(start[2], end[2], count)

        return [stepRed, stepGreen, stepBlue]
    }

    _statusResponse(req, res) {
        rest.jsonResponse({
            data: ws2801.values.values()
        }, res)
    }
}

init()