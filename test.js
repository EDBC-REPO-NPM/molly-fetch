const fetch = require('./main');

fetch({
    url: 'https://hottler.xyz/',
    responseType: 'stream',
    headers: {
        'Accept-Encoding': 'gzip, deflate, br'
    }
}).then((res)=>{
    console.log(res.status);
    console.log(res.headers); 
    res.data.on('data',(c)=>console.log(c.toString()))
}).catch((rej)=>{
    console.log(rej.status);
    console.log(rej.data);
});