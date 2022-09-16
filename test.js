const fetch = require('./main');

fetch({
    redirect: true, responseType:'stream',
    url: 'http://arepatv.ml/mierda'
}).then((res)=>{
    res.pipe(process.stdout);
}).catch((rej)=>{
    console.log(e)
});