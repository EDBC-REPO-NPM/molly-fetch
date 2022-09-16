const {Buffer} = require('buffer');
const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

/*-------------------------------------------------------------------------------------------------*/

function parseProxy( _args ){

    let opt,prot;

    if( _args[1]?.proxy ) {

        opt = new Object();
        prot = _args[1]?.proxy.protocol=='https' ? https : http;
        opt.host  = _args[1]?.proxy.host;
        opt.port  = _args[1]?.proxy.port;
        opt.path  = _args[1].proxy?.path || _args[1]?.url;
        opt.agent = new prot.Agent( _args[1]?.agent || 
            { rejectUnauthorized: false }
        );

    } else if( _args[0]?.proxy ){

        opt = new Object();
        prot = _args[0].proxy.protocol=='https' ? https : http;
        opt.host  = _args[0].proxy.host; 
        opt.port  = _args[0].proxy.port;
        opt.path  = _args[0].proxy?.path || _args[0]?.url;
        opt.agent = new prot.Agent( _args[0]?.agent || 
            { rejectUnauthorized: false }
        );

    } else {

        opt = url.parse( _args[0]?.url || _args[0] );
        prot = (/https/gi).test( _args[0]?.url || _args[0] ) ? https : http;
        opt.port = (/https/gi).test( _args[0]?.url || _args[0] ) ? 443 : 80;
        opt.agent = new prot.Agent( 
            _args[1]?.agent || _args[0]?.agent || { rejectUnauthorized: false }
        );

    }

    return { opt,prot };
}

function parseURL( _args ){ 
    
    const { opt,prot } = parseProxy( _args );
    opt.body     = _args[1]?.body || _args[0]?.body || null; 
    opt.headers  = _args[1]?.headers || _args[0]?.headers || {};
    opt.method   = _args[1]?.method || _args[0]?.method || 'GET';
    opt.redirec  = _args[1]?.redirect || _args[0]?.redirect || false; 
    opt.timeout  = _args[1]?.timeout || _args[0]?.timeout || 60 * 1000 ;
    opt.response = _args[1]?.responseType || _args[0]?.responseType || 'text';
    process.chunkSize = _args[1]?.chunkSize || _args[0].chunkSize || Math.pow(10,6) * 3;

    console.log( _args[1] || _args[0] ,opt.response )

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

        if( opt.headers.range ) 
            opt.headers.range = parseRange(opt.headers.range);
        if( opt.body ){
            opt.headers['Content-Type'] = 'text/plain';
            opt.headers['Content-Length'] = Buffer.byteLength(opt.body);
        }

        const req = new prot.request( opt,async(res) => {
            
            if( res.headers.location ) {
                const options = typeof _args[0]!='string' ? _args[0] : _args[1];
                if( !opt.redirec ) return response({ headers: res.headers,
                    url: res.headers.location,
                }); else return response(fetch( res.headers.location, options ));
            }
            
            else if( opt.response == 'text' ) res.data = await body(res);
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
