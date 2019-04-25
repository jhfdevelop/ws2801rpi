const http = require('http')

const rest = {

    routes:{
        'color/fill':null,
        'color/gradient':null,
        'color/rainbow':null,
        'color/status':null
    },

    startup:function(port){
        http.createServer((req, res) => {
            let url = req.url.replace(new RegExp('/$'),'')
            
            if(this.routes.hasOwnProperty(url) && this.routes[url].verb.toUpper() == req.method.toUpperCase()){
                this.routes[url].fn(req, res)
            }else{
                this._404Response(res)
            }
        }).listen(port)

        console.log('rest is ready')
    },

    jsonData: function(req){
        var payload = ''

        req.on('data', chunk => payload += chunk)
        
        return new Promise((resolve, reject) =>{
            req.on('end', () => {
                let json = null

                try{
                    json = JSON.parse(payload)
                    resolve(json)
                }catch(e){
                    reject(e)
                }

            })      
        })        
    },

    jsonResponse: function (obj, res) {
        
        res.setHeader('Content-Type', 'application/json')
        this._addCorsHeaders(res)
        res.writeHead(200)

        res.end(JSON.stringify(obj))
    },

    registerCallback(key, fun){
        routes[key] = fun
    },
    
    _404Response: function (req, res) {
        this._addCorsHeaders(res)
        res.writeHead(404)
        res.end('the resource \'' + req.url + '\' does not exist on the server :(')
    },

    _addCorsHeaders: function(res){
        res.setHeader('Access-Control-Allow-Origin','*')
        res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, HEAD, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers','*')
    }
}

module.exports = rest