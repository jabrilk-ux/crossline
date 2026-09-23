// Serve the exported SPA only while the browser regression suite runs.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const root=path.resolve(__dirname,'../dist');
const types={'.css':'text/css','.html':'text/html','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
 res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
});
server.listen(0,'127.0.0.1',()=>{
 const test=spawn(process.execPath,['tests/browser-smoke.cjs'],{cwd:path.resolve(__dirname,'..'),stdio:'inherit',env:{...process.env,CROSSLINE_TEST_GOOGLE:'1',CROSSLINE_TEST_URL:`http://127.0.0.1:${server.address().port}`}});
 test.on('exit',code=>server.close(()=>process.exit(code??1)));
});
