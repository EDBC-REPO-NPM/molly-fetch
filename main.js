const {Buffer} = require('buffer');
const stream = require('stream');
const https = require('https');
const zlib = require('zlib');
const http = require('http');
const url = require('url');
const fs = require('fs');

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

const mime = {
	
	"txt" : "text/plain",
	"text": "text/plain",
	
	"otf" : "font/otf",
	"ttf" : "font/ttf",
	"woff": "font/woff",
	"woff2":"font/woff2",
	
	"oga" : "audio/ogg",
	"aac" : "audio/aac",
	"wav" : "audio/wav",
	"mp3" : "audio/mpeg",
	"opus": "audio/opus",
	"weba": "audio/webm",
	
	"ogv" : "video/ogg",
	"mp4" : "video/mp4",
	"ts"  : "video/mp2t",
	"webm": "video/webm",
	"mpeg": "video/mpeg",
	"avi" : "video/x-msvideo",
	
	"css" : "text/css",
	"csv" : "text/csv",
	"html": "text/html",
	"scss": "text/scss",
	"ics" : "text/calendar",
	"js"  : "text/javascript",
	"xml" : "application/xhtml+xml",

	"bmp" : "image/bmp",
	"gif" : "image/gif",
	"png" : "image/png",
	"jpg" : "image/jpeg",
	"jpeg": "image/jpeg",
	"webp": "image/webp",
	"svg" : "image/svg+xml",
	"ico" : "image/vnd.microsoft.icon",
	
	"zip" : "application/zip",
	"gz"  : "application/gzip",
	"sh"  : "application/x-sh",
	"json": "application/json",
	"tar" : "application/x-tar",
	"rar" : "application/vnd.rar",
	"7z"  : "application/x-7z-compressed",
	"m3u8": "application/vnd.apple.mpegurl",
	
	"pdf" : "application/pdf",
	"doc" : "application/msword",
	"vsd" : "application/vnd.visio",
	"xls" : "application/vnd.ms-excel",
	"ppt" : "application/vnd.ms-powerpoint",
	"swf" : "application/x-shockwave-flash",
	"ods" : "application/vnd.oasis.opendocument.spreadsheet",
	"odp" : "application/vnd.oasis.opendocument.presentation",
	"odt" : "application/vnd.oasis.opendocument.presentation",
	"xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    
};

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

const headers = {
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

function parseProxy( arg ){

    let opt,prot;

    if( arg[1]?.proxy ) {

        opt = new Object();
        opt.path  = arg[1]?.url || arg[0] || arg[1].proxy?.path;

        opt.currentUrl = opt.path;
        prot = (/^https/i).test(arg[1].proxy.protocol) ? https : http;
        opt.host  = arg[1]?.proxy.host; opt.port = arg[1]?.proxy.port;
        opt.agent = new prot.Agent(arg[1]?.agent || { rejectUnauthorized: false });

    } else if( arg[0]?.proxy ){

        opt = new Object();
        opt.path  = arg[0]?.url || arg[0].proxy?.path;

        opt.currentUrl = opt.path;
        prot = (/^https/i).test(arg[0].proxy.protocol) ? https : http;
        opt.host  = arg[0].proxy.host; opt.port = arg[0].proxy.port;
        opt.agent = new prot.Agent(arg[0]?.agent ||{ rejectUnauthorized: false });

    } else {

        let _url = arg[0]?.url || arg[0] || '127.0.0.1';
            _url = _url.replace(/localhost/gi,'127.0.0.1');
        opt = url.parse( _url ); opt.currentUrl = _url;

        prot = (/^https/i).test( arg[0]?.url || arg[0] ) ? https : http;
        opt.agent = new prot.Agent(arg[1]?.agent || arg[0]?.agent || { rejectUnauthorized: false });
        opt.port = typeof opt?.port == 'string' ? +opt.port : (/^https/i).test( arg[0]?.url || arg[0] ) ? 443 : 80;

    }

    return { opt,prot };
}

function parseURL( arg ){

    const { opt,prot } = parseProxy( arg );

    opt.headers  = new Object();
    opt.body     = arg[1]?.body || arg[0]?.body || null;
    opt.decode   = !( !arg[1]?.decode && !arg[0]?.decode );
    opt.method   = arg[1]?.method || arg[0]?.method || 'GET';
    opt.redirect =  ( !arg[1]?.redirect && !arg[0]?.redirect );
    opt.timeout  = arg[1]?.timeout || arg[0]?.timeout || (1000*60);
    tmp_headers  = arg[1]?.headers || arg[0]?.headers || new Object();
    opt.response = arg[1]?.responseType || arg[0]?.responseType || 'json';

    for( let i in headers ){
        const key = i.match(/\w+/gi).map(x=>{
            const st = x.match(/^\w/gi).join('');
            return x.replace(st,st.toLowerCase());
        }).join('-'); opt.headers[key] = headers[i]
    }

    for( let i in tmp_headers ){
        const key = i.match(/\w+/gi).map(x=>{
            const st = x.match(/^\w/gi).join('');
            return x.replace(st,st.toLowerCase());
        }).join('-'); opt.headers[key] = tmp_headers[i]
    }

    return { opt,prot };
}

function parseRange( range, chunkSize ){
    const interval = range.match(/\d+/gi);
	const start = Math.floor(+interval[0]/chunkSize)*chunkSize; 
//  const end = !interval[1] ? chunkSize+start : +interval[1];
    const end = chunkSize + start;
	return `bytes=${start}-${end}`;
}

function body( stream ){
    return new Promise((response,reject)=>{
        const raw = new Array(); stream.on('close',()=>{
            const data = Buffer.concat(raw); response( data.toString() )
        }); stream.on('data',(chunk)=>{ raw.push(chunk); })
    });
}

function mimeType( _path ){
	for(let key of Object.keys(mime)) if( _path.endsWith(key) ) 
        return mime[key]; return 'text/plain';
}

function decoding( enc,res ){
    return new Promise(async(response,reject)=>{
        const out = new stream.PassThrough(), err = (e)=>{ }; switch ( enc ) {
            case 'br': await stream.pipeline(res,zlib.createBrotliDecompress(),out,err); response(out); break;
            case 'deflate': await stream.pipeline(res,zlib.createInflate(),out,err); response(out); break;
            case 'gzip': await stream.pipeline(res,zlib.createGunzip(),out,err); response(out); break;
            default: response(res); break;
        }
    })
}

function parseBody( opt ){
    if( !( opt.body instanceof stream ) ){
        if( typeof opt.body == 'object' ){
            opt.headers['content-type'] = 'application/json';
            opt.body = stream.Readable.from( JSON.stringify(opt.body) );
        } else if( (/^\?/i).test(opt.body) ){
            opt.headers['content-type'] = 'application/x-www-form-urlencoded';
            opt.body = stream.Readable.from( opt.body.replace(/^\?/i,'') );
        } else if( (/^file:/i).test(opt.body) ){
            const path = opt.body.replace(/^file:/i,'');
            opt.headers['content-type'] = mimeType(path);
            opt.body = fs.createReadStream(path);
        } else if( !opt.headers['content-type'] ) {
            opt.headers['content-type'] = 'text/plain';
            opt.body = stream.Readable.from( opt.body );
        }
    }   return opt;
}

function parseRedirect( arg,opt,res ){
    let u, o = typeof arg[0]!='string' ? arg[0] : arg[1];
    const port = !opt.port ? '' : `:${opt.port}`;
    if( !(/^http/i).test(res.headers.location) )
         u = `${opt.protocol}//${opt.hostname}${port}${res.headers.location}`;
    else u = res.headers.location; return { u,o };
}

function parseData( opt,res ){ 
    return new Promise(async(response,reject)=>{
        let data; const enc = res.headers['content-encoding'];
        const out = !opt.decode ? res : await decoding(enc,res);
        if( opt.response == 'buffer' ) data = Buffer.from( await body(out) );
        else if( opt.response == 'text' ) data = await body(out);
        else if( opt.response == 'stream' ) data = out;
        else if( opt.response == 'json' ) try {
            data = await body(out);
            data = JSON.parse(data);
        } catch(e) { } response(data);
    });
}

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

function fetch( ...arg ){
    return new Promise((response,reject)=>{

        let { opt,prot } = parseURL( arg );
        const size = +opt.headers['chunk-size'] || 
                     Math.pow(10,6) * 10;
        delete opt.headers.host;

        if( opt.headers.range ) 
            opt.headers.range = parseRange( opt.headers.range,size );
            opt.headers.referer = opt.currentUrl;
            opt.headers.origin  = opt.currentUrl;
        if( opt.body ){ opt = parseBody( opt ); }

        const req = new prot.request( opt,async(res) => {
            try{

                if( res.headers.location && opt.redirect ) { 
                    const { u,o } = parseRedirect(arg,opt,res);
                    return response( await fetch(u,o) );
                }
                
                const schema = {
                    data: await parseData( opt,res ),
                    request: req, response: res, config: opt,
                    status: res.statusCode, headers: res.headers,
                }; 
                
                if( res.statusCode >= 400 )
                     return reject( schema );
                else return response( schema );

            } catch(e) { reject(e); }
        });

        if( opt.body && opt.method == 'POST' ) 
            opt.body.pipe(req); else req.end();
        req.on('error',(e)=>reject(e));
        req.on('close',()=>req.end());

    });
}

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

module.exports = fetch;
