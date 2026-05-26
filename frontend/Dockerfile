# Dockerfile placeholder usado temporalmente por servicios sin implementar.
# Levanta un servidor mínimo respondiendo /health hasta que el servicio real exista.
# REEMPLAZAR al implementar cada servicio (ver Dockerfile.node-template).

FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /home/app

# Inline server tiny — /health responde 200; cualquier otra ruta 503.
ARG PORT=80
ENV PORT=${PORT}
EXPOSE ${PORT}

# C-01 (spec 012): security headers presentes incluso en el placeholder
CMD ["node", "-e", "const http=require('http');const port=process.env.PORT||4000;const SEC={'Content-Security-Policy':\"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'\",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{...SEC,'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',placeholder:true}))}else{res.writeHead(503,{...SEC,'Content-Type':'application/json'});res.end(JSON.stringify({error:'not implemented yet'}))}}).listen(port,()=>console.log('placeholder listening on '+port))"]
