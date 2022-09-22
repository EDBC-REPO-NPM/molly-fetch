const fetch = require('./main');

fetch({
    url: 'https://www.google.com'
}).then((res)=>{
    console.log(res.status);
    console.log(res.data);
}).catch((rej)=>{
    console.log(rej.status);
    console.log(rej.data);
});