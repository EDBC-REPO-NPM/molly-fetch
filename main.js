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
    opt.method   = arg[1]?.method || arg[0]?.method || 'GET';
    tmp_headers  = arg[1]?.headers || arg[0]?.headers || new Object();
    opt.timeout  = arg[1]?.timeout || arg[0]?.timeout || 100 * 60 * 1000 ;
    opt.response = arg[1]?.responseType || arg[0]?.responseType || 'json';

    opt.decode   = !( !arg[1]?.decode && !arg[0]?.decode );
    opt.redirect = !( !arg[1]?.decode && !arg[0]?.decode );

    opt.proxyIndex = arg[1]?.proxyIndex|| arg[0]?.proxyIndex|| 0;
    opt.proxyList  = arg[1]?.proxyList || arg[0]?.proxyList || null;
    process.chunkSize = arg[1]?.chunkSize || arg[0]?.chunkSize || Math.pow(10,6) * 3;

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

function parseRange( range, chunkSize ){
    const interval = range.match(/\d+/gi);
	const start = Math.floor(+interval[0]/chunkSize)*chunkSize; 
	const end = !interval[1] ? chunkSize+start : +interval[1];
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
	for(let key of Object.keys(mime)){
		if( _path.endsWith(key) ) return mime[key];
	}	return 'text/plain';
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
    //opt.headers['Content-Length'] = Buffer.byteLength(opt.body);
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

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

function fetch( ...arg ){
    return new Promise((response,reject)=>{

        let { opt,prot } = parseURL( arg );
        const size = +opt.headers['chunk-size'] || 
                     Math.pow(10,6) * 10;
        const range = opt.headers.range;

        delete opt.headers.host;

        if( opt.headers.range ) opt.headers.range = parseRange( opt.headers.range,size );
            opt.headers.referer = opt.currentUrl;
        if( opt.body ){ opt = parseBody( opt ); }

        const req = new prot.request( opt,async(res) => {
            try{

                if( res.headers.location && opt.redirect ) { let newURL = '';
                    const options = typeof arg[0]!='string' ? arg[0] : arg[1];
                    if( !(/^http/i).test(res.headers.location) )
                         newURL = `${opt.protocol}//${opt.hostname}${res.headers.location}`;
                    else newURL = res.headers.location; return response( await fetch(newURL,options) );
                }; const schema = {
                    request: req, response: res, config: opt,
                    status: res.statusCode, headers: res.headers,
                }; const output = !opt.decode ? res : await decoding(req,res);

                if( opt.response == 'buffer' ) schema.data = Buffer.from( await body(output) );
                else if( opt.response == 'text' ) schema.data = await body(output);
                else if( opt.response == 'stream' ) schema.data = output;
                else if( opt.response == 'json' ) try {
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

        req.on('error',(e)=>{ reject(e) });
        if( opt.body ) opt.body.pipe(req);
        req.end();

    });
}

/*--──────────────────────────────────────────────────────────────────────────────────────────────────────────────--*/

module.exports = fetch;
