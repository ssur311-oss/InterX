const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const video = 'C:/Users/user/AppData/Local/Packages/Microsoft.ScreenSketch_8wekyb3d8bbwe/TempState/Recordings/20261025-0853-19.1126194.mp4';
http.createServer((req,res)=>{
  let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file = name==='/reference.mp4'?video:path.resolve(root, '.'+(name==='/'?'/index.html':name));
  if(file!==video && !file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return}
  const size=fs.statSync(file).size;
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.md':'text/plain; charset=utf-8','.mp4':'video/mp4'};
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  const range=req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):size-1,size-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res)}
  else{res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(file).pipe(res)}
}).listen(4318,'127.0.0.1',()=>console.log('Assistant preview: http://127.0.0.1:4318'));
