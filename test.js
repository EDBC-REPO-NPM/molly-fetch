const fetch = require('./main');

fetch({
    url: 'https://www.google.com/',
    responseType: 'stream',
}).then((res)=>{
    console.log(res.status);
    console.log(res.headers);
    res.data.on('data',(c)=>console.log(c.toString()))
}).catch((rej)=>{ console.log(rej); });
