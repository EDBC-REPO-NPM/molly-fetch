
const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

/*-------------------------------------------------------------------------------------------------*/

const size = Math.pow(10,6) * 3;

/*-------------------------------------------------------------------------------------------------*/

function parseURL( ..._args ){

    if( typeof _args[0] == 'string' ){
        const protocol  = (/https/gi).test(_args[0]) ? https : http;
        const options = url.parse(_args[0]);

        options.agent   = new protocol.Agent({ rejectUnauthorized: false });
        options.port    = (/https/gi).test(_args[0]) ? 443 : 80;
        options.method  = _args[1]?.method || 'GET';
        options.headers =_args[1]?.headers || {};
        options.body    =_args[1]?.body || null;
        return options;

    } else {
        const protocol  = (/https/gi).test(_args[0]?.url) ? https : http;
        const options = url.parse(_args[0]?.url);

        options.agent   = new protocol.Agent({ rejectUnauthorized: false });
        options.port    = (/https/gi).test(_args[0]?.url) ? 443 : 80;
        options.method  = _args[0]?.method || 'GET';
        options.headers =_args[0]?.headers || {};
        options.body    =_args[0]?.body || null; 
        return options;

    }

}

function parseRange( range ){
    const interval = range.match(/\d+/gi);
    const chunk = Number(interval[0])+size;
    return interval[1] ? range : range+chunk;
}

/*-------------------------------------------------------------------------------------------------*/

function fetch( ..._args ) {
    return new Promise((response,reject)=>{
 
        const opt = parseURL(..._args); 
        const protocol = opt.port==443 ? https : http;

        if( opt.headers.range ) 
            opt.headers.range = parseRange(opt.headers.range);
        if(opt.body){
            opt.headers['Content-Length'] = Buffer.byteLength(opt.body);
            opt.headers['Content-Type'] = 'text/plain';
        } 
    
        const req = new protocol.request( opt,(res) => {
            if( res.headers.location ) return response({
                url: res.headers.location.replace(/^http.*:\/\//gi,'?href='),
                headers: res.headers,
            }); response( res );
        });
    
        req.on('error',(e)=>{ reject(e) }); 
        if(opt.body) req.write(opt.body);
        req.end();

    });    
}

/*-------------------------------------------------------------------------------------------------*/

module.exports = fetch;
