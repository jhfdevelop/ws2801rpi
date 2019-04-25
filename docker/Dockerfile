FROM node:current-alpine

WORKDIR /usr/src/ws2801

COPY package*.json ./

COPY . .

RUN npm install 

EXPOSE 2684

ENTRYPOINT ["node", "app"]