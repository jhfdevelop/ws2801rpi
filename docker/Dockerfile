FROM raspbian/stretch:latest

WORKDIR /usr/src/ws2801

COPY package*.json ./

COPY . .

RUN apt update
RUN apt install -y nodejs npm

RUN npm install 

EXPOSE 2684

ENTRYPOINT ["node", "app"]
