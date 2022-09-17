const {Buffer} = require('buffer');
const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'User-Agent': 'Mozilla/5.0 (X11; CrOS x86_64 15054.50.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"',
    'Accept-Language': 'es-419,es;q=0.9', 'sec-ch-ua-platform': '"Chrome OS"',
    'Upgrade-Insecure-Requests': '1', 'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate', 'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 'Sec-Fetch-Site': 'none',
    'sec-ch-ua-mobile': '?0', 'Sec-Fetch-User': '?1',
    'Pragma': 'no-cache',
}

/*-------------------------------------------------------------------------------------------------*/

function parseProxy( _args ){

    let opt,prot;

    if( _args[1]?.proxy ) {

        opt = new Object();
        prot = (/^https/i).test(_args[1].proxy.protocol) ? https : http;
        opt.path  = _args[1].proxy?.path || _args[1]?.url;
        opt.host  = _args[1]?.proxy.host;
        opt.port  = _args[1]?.proxy.port;
        opt.agent = new prot.Agent( _args[1]?.agent || 
            { rejectUnauthorized: false }
        );

    } else if( _args[0]?.proxy ){

        opt = new Object();
        prot = (/^https/i).test(_args[0].proxy.protocol) ? https : http;
        opt.path  = _args[0].proxy?.path || _args[0]?.url;
        opt.host  = _args[0].proxy.host; 
        opt.port  = _args[0].proxy.port;
        opt.agent = new prot.Agent( _args[0]?.agent || 
            { rejectUnauthorized: false }
        );

    } else {

        let _url = _args[0]?.url || _args[0] || '127.0.0.1';
            _url = _url.replace(/localhost/gi,'127.0.0.1');
        opt = url.parse( _url );

        prot = (/^https/i).test( _args[0]?.url || _args[0] ) ? https : http;
        opt.agent = new prot.Agent(_args[1]?.agent || _args[0]?.agent || { rejectUnauthorized: false });
        opt.port = typeof opt?.port == 'string' ? +opt.port : (/^https/i).test( _args[0]?.url || _args[0] ) ? 443 : 80;

    }

    return { opt,prot };
}

function parseURL( _args ){ 
    
    const { opt,prot } = parseProxy( _args );
    opt.body     = _args[1]?.body || _args[0]?.body || null; 
    opt.method   = _args[1]?.method || _args[0]?.method || 'GET';
    opt.redirec  = _args[1]?.redirect || _args[0]?.redirect || true; 
    opt.timeout  = _args[1]?.timeout || _args[0]?.timeout || 60 * 1000 ;
    opt.headers  = _args[1]?.headers || _args[0]?.headers || new Object();
    opt.response = _args[1]?.responseType || _args[0]?.responseType || 'text';
    process.chunkSize = _args[1]?.chunkSize || _args[0].chunkSize || Math.pow(10,6) * 3;

    for( var i in headers ){ opt.headers[i] = !opt.headers[i] ? headers[i] : opt.headers[i]; }

    return { opt,prot };
}

function parseRange( range ){
    const size = process.chunkSize;
    const interval = range.match(/\d+/gi);
    const chunk = Number(interval[0])+size;
    return interval[1] ? range : range+chunk;
}

function body( stream ){
    return new Promise((response,reject)=>{
        const raw = new Array();
        stream.on('data',(chunk)=>{
            raw.push(chunk);
        })
        stream.on('close',()=>{
            const data = Buffer.concat(raw);
            response( data.toString() )
        })
    })
}

/*-------------------------------------------------------------------------------------------------*/

function fetch( ..._args ){
    return new Promise((response,reject)=>{
 
        const { opt,prot } = parseURL( _args ); 
        delete opt.headers.host;

        if( opt.headers.range ) 
            opt.headers.range = parseRange(opt.headers.range);
        if( opt.body ){
            opt.headers['Content-Type'] = 'text/plain';
            opt.headers['Content-Length'] = Buffer.byteLength(opt.body);
        }

        const req = new prot.request( opt,async(res) => {
            
            if( res.headers.location && opt.redirec ) {
                const options = typeof _args[0]!='string' ? _args[0] : _args[1];
                return response(fetch( res.headers.location, options ));
            }
            
            else if( opt.response == 'text' ) try{ 
                res.data = await body(res);
                res.data = JSON.parse(res.data);
            } catch(e) { }
            
            if( res.statusCode >= 300 ) return reject( res )
            else return response( res );
            
        });
    
        req.on('error',(e)=>{ reject(e) }); 
        if(opt.body) req.write(opt.body);
        req.setTimeout( opt.timeout );
        req.end();

    });    
}

/*-------------------------------------------------------------------------------------------------*/

module.exports = fetch;
