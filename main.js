const {Buffer} = require('buffer');
const stream = require('stream');
const https = require('https');
const zlib = require('zlib');
const http = require('http');
const url = require('url');
const fs = require('fs');

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

const mime = JSON.parse( fs.readFileSync(`${__dirname}/mimeType.json`) );

const headers = {
    "user-agent": "Mozilla/5.0 (X11; CrOS x86_64 14989.107.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'user-agent': 'Mozilla/5.0 (X11; CrOS x86_64 15054.50.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"',
    'accept-language': 'es-419,es;q=0.9', 'sec-ch-ua-platform': '"Chrome OS"',
    'upgrade-insecure-requests': '1', 'Sec-Fetch-Dest': 'iframe',
    'sec-fetch-mode': 'navigate', 'Cache-Control': 'no-cache',
    'connection': 'keep-alive', 'Sec-Fetch-Site': 'none',
    'sec-ch-ua-mobile': '?0', 'Sec-Fetch-User': '?1',
    'pragma': 'no-cache',
};

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

function parseProxy( _args ){

    let opt,prot; 

    if( _args[1]?.proxy ) {

        opt = new Object();
        opt.path  = _args[1]?.url || _args[0] || _args[1].proxy?.path;

        opt.currentUrl = opt.path;
        prot = (/^https/i).test(_args[1].proxy.protocol) ? https : http;
        opt.host  = _args[1]?.proxy.host; opt.port = _args[1]?.proxy.port;
        opt.agent = new prot.Agent(_args[1]?.agent || { rejectUnauthorized: false });

    } else if( _args[0]?.proxy ){

        opt = new Object();
        opt.path  = _args[0]?.url || _args[0].proxy?.path;

        opt.currentUrl = opt.path;
        prot = (/^https/i).test(_args[0].proxy.protocol) ? https : http;
        opt.host  = _args[0].proxy.host; opt.port = _args[0].proxy.port;
        opt.agent = new prot.Agent(_args[0]?.agent ||{ rejectUnauthorized: false });

    } else {

        let _url = _args[0]?.url || _args[0] || '127.0.0.1';
            _url = _url.replace(/localhost/gi,'127.0.0.1');
        opt = url.parse( _url ); opt.currentUrl = _url;

        prot = (/^https/i).test( _args[0]?.url || _args[0] ) ? https : http;
        opt.agent = new prot.Agent(_args[1]?.agent || _args[0]?.agent || { rejectUnauthorized: false });
        opt.port = typeof opt?.port == 'string' ? +opt.port : (/^https/i).test( _args[0]?.url || _args[0] ) ? 443 : 80;

    }

    return { opt,prot };
}

function parseURL( _args ){ 
    
    const { opt,prot } = parseProxy( _args );

    opt.headers  = new Object();
    opt.body     = _args[1]?.body || _args[0]?.body || null; 
    opt.method   = _args[1]?.method || _args[0]?.method || 'GET';
    tmp_headers  = _args[1]?.headers || _args[0]?.headers || new Object();
    opt.timeout  = _args[1]?.timeout || _args[0]?.timeout || 100 * 60 * 1000 ;
    opt.response = _args[1]?.responseType || _args[0]?.responseType || 'json';

    opt.decode   = !( !_args[1]?.decode && !_args[0]?.decode );
    opt.redirect = !( !_args[1]?.decode && !_args[0]?.decode ); 

    console.log( opt.decode );

    opt.proxyIndex = _args[1]?.proxyIndex|| _args[0]?.proxyIndex|| 0;
    opt.proxyList  = _args[1]?.proxyList || _args[0]?.proxyList || null; 
    process.chunkSize = _args[1]?.chunkSize || _args[0]?.chunkSize || Math.pow(10,6) * 3;

    for( var i in headers ){ 
        const key = i.match(/\w+/gi).map(x=>{
            const st = x.match(/^\w/gi).join('');
            return x.replace(st,st.toLowerCase());
        }).join('-'); opt.headers[key] = headers[i]
    }

    for( var i in tmp_headers ){ 
        const key = i.match(/\w+/gi).map(x=>{
            const st = x.match(/^\w/gi).join('');
            return x.replace(st,st.toLowerCase());
        }).join('-'); opt.headers[key] = tmp_headers[i]
    }

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
        const raw = new Array(); stream.on('close',()=>{
            const data = Buffer.concat(raw); response( data.toString() )
        }); stream.on('data',(chunk)=>{ raw.push(chunk); })
    }); 
}

function decoding( req,res ){ 
    return new Promise(async(response,reject)=>{
        const out = new stream.PassThrough(), err = (e)=>{ }; switch ( res.headers['content-encoding'] ) {
            case 'br': await stream.pipeline(res,zlib.createBrotliDecompress(),out,err); response(out); break;
            case 'deflate': await stream.pipeline(res,zlib.createInflate(),out,err); response(out); break;
            case 'gzip': await stream.pipeline(res,zlib.createGunzip(),out,err); response(out); break;
            default: response(res); break;
        }
    })
}

function parseBody( opt ){
    if( typeof opt.body == 'object' ){ opt.body = JSON.stringify(opt.body);
        opt.headers['Content-Type'] = 'application/json';
    } else if( (/^\?/i).test(opt.body) ){ opt.body = opt.body.replace(/^\?/i,'');
        opt.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if( (/^file:/i).test(opt.body) ){ const path = opt.body.replace(/^file:/i,'');
        opt.body = fs.readFileSync( path ); mime.some((x,i)=>{ const regex = new RegExp(`${x}$`,'i'); 
            if( !regex.test(path) ){ opt.headers['Content-Type'] = 'text/plain'; return false; } 
            else { opt.headers['Content-Type'] = mime[x]; return true; }
        })
    } else if( !opt.headers['Content-Type'] ) { 
        opt.headers['Content-Type'] = 'text/plain'; 
    }   opt.headers['Content-Length'] = Buffer.byteLength(opt.body); return opt;
}

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

function fetch( ..._args ){
    return new Promise((response,reject)=>{
 
        let { opt,prot } = parseURL( _args ); 
        delete opt.headers.host;

        if( opt.headers.range && !opt.headers.nochunked ) opt.headers.range = parseRange(opt.headers.range);
            opt.headers.referer = opt.currentUrl; opt.headers.origin = opt.currentUrl;
        if( opt.body ){ opt = parseBody( opt ); }   

        const req = new prot.request( opt,async(res) => {
            try{

                if( res.headers.location && opt.redirect ) { let newURL = ''
                    if( !(/^http/i).test(res.headers.location) )
                         newURL = `${opt.protocol}//${opt.hostname}${res.headers.location}`;
                    else newURL = res.headers.location;
                    const options = typeof _args[0]!='string' ? _args[0] : _args[1];
                    return response( await fetch( newURL, options ) );
                }; const schema = {
                    request: req, response: res, config: opt,
                    status: res.statusCode, headers: res.headers,
                }; const output = !opt.decode ? res : await decoding(req,res); 
                
                console.log( opt.decode, _args );

                if( opt.response == 'text' ) schema.data = await body(output);
                else if( opt.response == 'stream' ) schema.data = output;
                else if( opt.response == 'json' ) try{ 
                    schema.data = await body(output);
                    schema.data = JSON.parse(schema.data);
                } catch(e) { }
                
                if( res.statusCode >= 400 ){

                    if(!opt?.proxyList ) return reject( schema );
                    if( opt?.proxyIndex >= opt.proxyList?.length )
                        return reject( schema );

                    opt.proxy = opt.proxyList[ opt.proxyIndex ];
                    opt.proxyIndex++;response(await fetch(opt));

                } else return response( schema );
                
            } catch(e) { reject(e); }
        }).setTimeout( opt.timeout );
    
        req.on('error',(e)=>{ reject(e); }); 
        if(opt.body) req.write(opt.body); req.end();

    });    
}

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

module.exports = fetch;
