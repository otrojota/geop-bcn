FROM node:12.3.1-alpine
#ENV NODE_ENV production
WORKDIR /opt/geoportal/geop-bcn
COPY . .
RUN npm install 
EXPOSE 8188
CMD node index.js