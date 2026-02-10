# 4Sight Demo Application for CSIR:

## CSIR: EOI No. 8121/10/02/2026
The Provision or supply of Software Development Services
 CSIR EOI No. 8121/10/02/2026

# Docker build
docker build -f src\csirreact.client\Dockerfile --force-rm -t 4sightdev/csir-eoi-demo-client:latest src\.
docker build -f src\CSIRReact.Server\Dockerfile --force-rm -t 4sightdev/csir-eoi-demo-server:latest src\.


docker pull 4sightdev/csir-eoi-demo-server
docker pull 4sightdev/csir-eoi-demo-client

docker run -d -p 3001:3000 -e NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 4sightdev/csir-eoi-demo-client:latest
docker run -d -p 8081:8081 -p 8080:8080 -e CorsOrigins:[0]=http://localhost:3001 4sightdev/csir-eoi-demo-server:latest
