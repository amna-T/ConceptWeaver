FROM node:18
#create app directory
WORKDIR /app
#install app dependencies
COPY package*.json ./
RUN npm install

#copy app source code
COPY . .

EXPOSE 5000
#START SERVER
CMD ["node", "index.js"]