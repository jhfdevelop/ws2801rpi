const ws2801 = require('rpi-ws2801')
const rest = require('./rest')

const ledCount = 32

function init(){
    ws2801.connect(ledCount)
    console.log('ws2801 is ready')

    _registerCallbacks()
    rest.startup(2684)
}

function _registerCallbacks(){

    rest.registerCallback('/color/fill',{
        verb:'POST',
        fn: (req, res) => _singleColorCallback(req, res)
    })

    rest.registerCallback('/color/gradient',{
        verb:'POST',
        fn: (req, res) => _gradientCallback(req, res)
    })

    rest.registerCallback('/color/rainbow',{
        verb:'POST',
        fn: (req, res) => _rainbowCallback(req, res)
    })

    rest.registerCallback('/color/status',{
        verb:'GET',
        fn: (req, res) => _statusResponse(req, res)
    })
}

async function _singleColorCallback(req, res){

    let data

    try{
        data = await rest.jsonData(req)
    }catch(e){
        rest.jsonResponse({'error':'request object must be json'}, res)
        return
    }

    if(data.hasOwnProperty('value')){
        let values = Array(ledCount).fill([data.value[0], data.value[1], data.value[2]])
        values.forEach((value, index) => ws2801.setColor(index, value))
        ws2801.update()
        _statusResponse(req, res)

    }else{
        rest.jsonResponse({'error':'request object must contain the property value'}, res)
    }
}

async function _gradientCallback(req, res){

    let data

    try{
        data = await rest.jsonData(req)
    }catch(e){
        rest.jsonResponse({'error':'request object must be json'}, res)
        return
    }

    if(data.hasOwnProperty('start') && data.hasOwnProperty('end')){
        
        let gradient = _calculateGradient(data.start, data.end)
        
        gradient.forEach((pxl, index) => {
            ws2801.setColor(index, pxl)
        })

        ws2801.update()
        _statusResponse(req, res)

    }else{
        rest.jsonResponse({'error':'request object must contain the properties start and end'}, res)
    }
}

function _rainbowCallback(req, res){
    _rainbow().forEach((pxl, index) => ws2801.setColor(index, pxl))
    ws2801.update()
    _statusResponse(req, res)
}

function _calculateGradient(start, end){
    let stepRed = _linspace(start[0], end[0], ledCount)
    let stepGreen = _linspace(start[1], end[1], ledCount)
    let stepBlue = _linspace(start[2], end[2], ledCount)

    let values = []    

    let currentPixel = start.slice()
    for (let i = 0; i < ledCount; i++) {
        currentPixel[0] = Math.round(stepRed[i])
        currentPixel[1] = Math.round(stepGreen[i])
        currentPixel[2] = Math.round(stepBlue[i])
        values.push(currentPixel.slice())
    }
    return values
}

function _linspace(start, end, count){
    if (!count) { count = Math.max(Math.round(end - start), 1) }
    if (count < 2) { return count === 1 ? [start] : [] }

    let output = Array(count)
    count--

    for (let i = count; i >= 0; i--) {
        output[i] = (i * end + (count - i) * start) / count
    }

    return output
}

function _rainbow(){
    let hue_step = 360/ledCount
    let rainbow = Array(ledCount)

    for (let hue = 0; hue < 360; hue += hue_step) {
        let c = 1*1
        let x = c * (1 - (hue / 60) % 2 - 1)
        let m = 1 - c

        if (hue < 60) {
            let r = (c + m) * 255
            let g = (x + m) * 255
            let b = (0 + m) * 255
            rainbow.push([r, g, b])

        } else if (hue >= 60 && hue < 120) {
            let r = (x + m) * 255
            let g = (c + m) * 255
            let b = (0 + m) * 255
            rainbow.push([r, g, b])
        }
        else if (hue >= 120 && hue < 180) {
            let r = (0 + m) * 255
            let g = (c + m) * 255
            let b = (x + m) * 255
            rainbow.push([r, g, b])
        }
        else if (hue >= 180 && hue < 240) {
            let r = (0 + m) * 255
            let g = (x + m) * 255
            let b = (c + m) * 255
            rainbow.push([r, g, b])
        }
        else if (hue >= 240 && hue < 300) {
            let r = (x + m) * 255
            let g = (0) * 255
            let b = (c + m) * 255
            rainbow.push([r, g, b])
        }
        else if (hue >= 300 && hue < 360) {
            let r = (x + m) * 255
            let g = (0) * 255
            let b = (c + m) * 255
            rainbow.push([r, g, b])
        }
    }
    return rainbow
}

function _statusResponse(req, res) {
    rest.jsonResponse({
        data: ws2801.values.values()
    }, res)
}

init()