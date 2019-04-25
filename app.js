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

    rest.registerCallback('color/fill',{
        method:'POST',
        fn: (req, res) => _singleColorCallback(req, res)
    })

    rest.registerCallback('color/gradient',{
        method:'POST',
        fn: (req, res) => _gradientCallback(req, res)
    })

    rest.registerCallback('color/rainbow',{
        method:'POST',
        fn: (req, res) => _rainbowCallback(req, res)
    })

    rest.registerCallback('color/status',{
        method:'GET',
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
        ws2801.fill(data.value[0], data.value[1], data.value[2])
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
    ws2801.rainbow()
    ws2801.update()
    _statusResponse(req, res)
}

function _calculateGradient(start, end){
    let deltaRed = Math.ceil((end[0]-start[0])/ledCount)
    let deltaGreen = Math.ceil((end[1]-start[1])/ledCount)
    let deltaBlue = Math.ceil((end[2]-start[2])/ledCount)

    let values = []    

    let currentPixel = start.slice()
   
    for(let index = 0;index<ledCount; index++){
        values.push(currentPixel.slice())
        currentPixel[0] += deltaRed
        currentPixel[1] += deltaGreen
        currentPixel[2] += deltaBlue
    }
    return values
}

function _statusResponse(req, res) {
    rest.jsonResponse({
        data: ws2801.values.values()
    }, res)
}

init()