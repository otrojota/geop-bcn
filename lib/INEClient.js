const config = require("./Config").getConfig();

class INEClient {
    constructor() {
        this.apiKey = config.ineAPIKey;
    }
    static get instance() {
        if (!INEClient.singleton) INEClient.singleton = new INEClient();
        return INEClient.singleton;
    }

    request(method, url, data) {
        const http = (url.toLowerCase().startsWith('https://') ? require("https"):require("http")) ;
        //process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
        let postData, options = {method:method};
        if (method == "POST") {
            postData = JSON.stringify(data || {});
            options.headers = {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }  
        }        
        return new Promise((resolve, reject) => {
            let req = http.request(url, options, res => {
                let chunks = [];
                res.on("data", chunk => chunks.push(chunk));
                res.on("end", _ => {
                    let body = Buffer.concat(chunks).toString();
                    if (res.statusCode != 200) reject(body);
                    else resolve(JSON.parse(body));
                });
            });
            req.on("error", err => reject(err));
            if (method == "POST") req.write(postData);
            req.end();
        }); 
    }
    
    async getCosechaAcuicola(region) {
        try {
            let url = `https://api.datosabiertos.ine.cl/api/v2/datastreams/ESTAD-REGIO-PESCA-VARIA-COSEC/data.json/?auth_key=${this.apiKey}&limit=50000&pArgument0=${region}`;
            let rows = await this.request("GET", url);
            let ret = [], n=0, newRow = {};
            rows.result.fArray.forEach(row => {
                if (!row.fHeader) {
                    if (n == 7) newRow.codigoRegion = row.fStr;
                    if (n == 9) newRow.mes = row.fNum;
                    if (n == 11) newRow.ano = parseInt(row.fStr);
                    if (n == 13) newRow.valor = row.fNum;
                    if (n == 14) {
                        ret.push(newRow);
                        newRow = {};
                    }
                }
                if (++n > 14) n=0;
            })
            return ret;
        } catch(error) {
            throw error;
        }
    }
    async getPescaArtesanal(region) {
        try {
            let url = `https://api.datosabiertos.ine.cl/api/v2/datastreams/ESTAD-REGIO-PESCA/data.json/?auth_key=${this.apiKey}&limit=50000&pArgument0=${parseInt(region)}`;
            let rows = await this.request("GET", url);
            let ret = [], n=0, newRow = {};
            rows.result.fArray.forEach(row => {
                if (!row.fHeader) {
                    if (n == 7) newRow.codigoRegion = row.fStr;
                    if (n == 9) newRow.mes = row.fNum;
                    if (n == 11) newRow.ano = parseInt(row.fStr);
                    if (n == 13) newRow.valor = row.fNum;
                    if (n == 14) {
                        ret.push(newRow);
                        newRow = {};
                    }
                }
                if (++n > 14) n=0;
            })
            return ret;
        } catch(error) {
            throw error;
        }
    }
}

module.exports = INEClient.instance;