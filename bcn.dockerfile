# docker build -f bcn.dockerfile -t otrojota/geoportal:bcn-0.11 .
# docker push otrojota/geoportal:bcn-0.11
#
FROM otrojota/geoportal:gdal-nodejs-1.01
WORKDIR /opt/geoportal/geop-bcn
COPY . .
RUN npm install 
EXPOSE 8188
CMD node index.js