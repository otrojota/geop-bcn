const {ProveedorCapas, CapaVectorial} = require("geop-base-proveedor-capas");
const minz = require("./MinZClient");
const ine = require("./INEClient");
const moment = require("moment-timezone");
const config = require("./Config").getConfig();

class ProveedorCapasBCN extends ProveedorCapas {
    constructor(opciones) {
        super("bcn", opciones);
        this.addOrigen("bcn", "Biblioteca del Congreso Nacional de Chile", "https://www.bcn.cl/", "./img/bcn.jpg");        

        let capaAreasPobladas = new CapaVectorial("bcn", "AreasPobladas", "Areas Pobladas", "bcn", {
            temporal:false,
            formatos:{
                geoJSON:true,
            },
            estilos:function(f) {
                let tipo = f.properties.Entidad;
                if (tipo == "Ciudad") return {color:"#ff0000", weight:1, fillColor:"#ff0000", fillOpacity:0.4}
                else if (tipo == "Pueblo") return {color:"#523b03", weight:1, fillColor:"#876205", fillOpacity:0.4}
                else if (tipo == "Aldea") return {color:"#190224", weight:1, fillColor:"#601982", fillOpacity:0.4}
                else if (tipo == "Localidad") return {color:"#031c2e", weight:1, fillColor:"#1875b8", fillOpacity:0.4}
                else return {color:"#555555", weight:1, fillColor:"#555555", fillOpacity:0.4}
            }
        }, [], "img/area-poblada.svg");
        this.addCapa(capaAreasPobladas);

        let capaRegiones = new CapaVectorial("bcn", "Regiones", "Regiones", "bcn", {
            temporal:false,
            dimensionMinZ:"bcn.region",
            tipoObjetos:"poligono",
            formatos:{
                geoJSON:true,
            },
            estilos:function(f) {return {color:"#000000", weight:1, fillColor:"rgba(0,0,0,0)"}}
        }, [], "img/map-location.svg");
        this.addCapa(capaRegiones);

        let capaProvincias = new CapaVectorial("bcn", "Provincias", "Provincias", "bcn", {
            temporal:false,
            formatos:{
                geoJSON:true,
            },
            estilos:function(f) {return {color:"#000000", weight:1, fillColor:"rgba(0,0,0,0)"}}
        }, [], "img/map-location.svg");
        this.addCapa(capaProvincias);

        let capaComunas = new CapaVectorial("bcn", "Comunas", "Comunas", "bcn", {
            temporal:false,
            formatos:{
                geoJSON:true,
            },
            estilos:function(f) {return {color:"#000000", weight:1, fillColor:"rgba(0,0,0,0)"}}
        }, [], "img/map-location.svg");
        this.addCapa(capaComunas);

        let capaAreasSilvestresProtegidas = new CapaVectorial("bcn", "AreasSilvestresProtegidas", "Areas Silvestres Protegidas", "bcn", {
            temporal:false,
            formatos:{
                geoJSON:true,
            },
            estilos:function(f) {return {color:"#008800", weight:1, fillColor:"#00aa00", fillOpacity:0.8}}
        }, [], "img/area-silvestre.svg");
        this.addCapa(capaAreasSilvestresProtegidas);

        let capaRedHidrografica = new CapaVectorial("bcn", "RedHidrografica", "Red Hidrográfica", "bcn", {
            temporal:false,
            formatos:{
                geoJSON:true,
            },
            estilos:function(f) {return {color:"#0000ff", weight:2}}
        }, [], "img/rio.svg");
        this.addCapa(capaRedHidrografica);

        let capaMasasDeAgua = new CapaVectorial("bcn", "MasasDeAgua", "Masas de Agua", "bcn", {
            temporal:false,
            formatos:{
                geoJSON:true,
            },
            estilos:function(f) {return {color:"#0000ff", weight:1, fillColor:"#0000ff", fillOpacity:0.6}}
        }, [], "img/lago.svg");
        this.addCapa(capaMasasDeAgua);

        // cache
        this.areasPobladas = this.getFeaturesAreasPobladas();
        this.regiones = this.getFeaturesRegiones();
        this.provincias = this.getFeaturesProvincias();
        this.comunas = this.getFeaturesComunas();
        this.areasSilvestresProtegidas = this.getFeaturesAreasSilvestresProtegidas();
        this.redHidrografica = this.getFeaturesRedHidrografica();
        this.masasDeAgua = this.getFeaturesMasasDeAgua();
    }

    async resuelveConsulta(formato, args) {
        try {
            if (formato == "geoJSON") {
                return await this.generaGeoJSON(args);
            } else throw "Formato " + formato + " no soportado";
        } catch(error) {
            throw error;
        }
    }

    async generaGeoJSON(args) {
        try {           
            if (args.codigoVariable == "AreasPobladas") {
                return this.areasPobladas;
            } else if (args.codigoVariable == "Regiones") {
                return this.regiones;
            } else if (args.codigoVariable == "Provincias") {
                return this.provincias;
            } else if (args.codigoVariable == "Comunas") {
                return this.comunas;
            } else if (args.codigoVariable == "AreasSilvestresProtegidas") {
                return this.areasSilvestresProtegidas;
            } else if (args.codigoVariable == "RedHidrografica") {
                return this.redHidrografica;
            } else if (args.codigoVariable == "MasasDeAgua") {
                return this.masasDeAgua;
            } else throw "Código de Capa '" + args.codigoVariable + "' no manejado";            
        } catch(error) {
            throw error;
        }
    }

    getFeaturesAreasPobladas() {
        // ogr2ogr Areas_Pobladas.geojson Areas_Pobladas.shp -t_srs WGS84
        let path = global.resDir + "/Areas_Pobladas.geojson";
        let features = JSON.parse(require("fs").readFileSync(path));
        let filtros = {};
        features.name = "BCN - Areas Pobladas";
        features.features.forEach(f => {
            f.properties.id = f.properties.objectid;
            let entidad = f.properties.Entidad;
            f.properties._titulo = entidad + ": " + f.properties.Localidad;
            if (filtros[entidad] === undefined) {
                filtros[entidad] = 0;
            }
            filtros[entidad] ++;
        });
        features._filtros = Object.keys(filtros).map(tipo => ({
            nombre:tipo + " [" + filtros[tipo] + "]",
            filtro:`function(f) {return f.properties.Entidad == "${tipo}"}`,
            activo:tipo == "Ciudad"
        }));
        features._filtros.sort((f1, f2) => (f1.nombre > f2.nombre?1:-1));
        console.log("[Geoportal - BCN] Leidas " + features.features.length + " áreas pobladas a cache", JSON.stringify(filtros));
        return features;
    }
    getFeaturesRegiones() {
        // ogr2ogr Regional.geojson Regional.shp -simplify 100 -t_srs WGS84
        let path = global.resDir + "/Regional.geojson";
        let features = JSON.parse(require("fs").readFileSync(path));
        this.mapaRegiones = {};
        features.name = "BCN - Regiones";
        features.features.forEach(f => {
            f.properties.id = f.properties.objectid;
            f.properties._titulo = "Región: " + f.properties.Region; 
            f.properties._codigoDimension = this.pad(f.properties.codregion, 2);
            this.mapaRegiones[f.properties.codregion] = f.properties.Region;
        });
        console.log("[Geoportal - BCN] Leidas " + features.features.length + " regiones a cache");
        return features;
    }
    getFeaturesProvincias() {
        // ogr2ogr Provincias.geojson Provincias.shp -simplify 100  -t_srs WGS84
        let path = global.resDir + "/Provincias.geojson";
        let features = JSON.parse(require("fs").readFileSync(path));
        let filtros = {};
        features.name = "BCN - Provincias";
        features.features.forEach(f => {
            f.properties.id = f.properties.objectid;
            f.properties._titulo = "Provincia: " + f.properties.Provincia; 
            let codregion = f.properties.codregion;
            if (filtros[codregion] === undefined) {
                filtros[codregion] = 0;
            }
            filtros[codregion] ++;
        });
        features._filtros = Object.keys(filtros).map(codregion => ({
            orden:parseInt(codregion) == 13?5.5:parseInt(codregion),
            nombre:this.mapaRegiones[codregion] + " [" + filtros[codregion] + "]",
            filtro:`function(f) {return f.properties.codregion == "${codregion}"}`,
            activo:codregion == 5
        }));
        features._filtros.sort((f1, f2) => (f1.orden > f2.orden?1:-1));
        console.log("[Geoportal - BCN] Leidas " + features.features.length + " provincias a cache");
        return features;
    }
    getFeaturesComunas() {
        // ogr2ogr comunas.geojson comunas.shp -simplify 100  -t_srs WGS84
        let path = global.resDir + "/comunas.geojson";
        let filtros = {};
        let features = JSON.parse(require("fs").readFileSync(path));
        features.name = "BCN - Comunas";
        features.features.forEach(f => {
            f.properties.id = f.properties.objectid;
            f.properties._titulo = "Comuna: " + f.properties.Comuna; 
            let codregion = f.properties.codregion;
            if (filtros[codregion] === undefined) {
                filtros[codregion] = 0;
            }
            filtros[codregion] ++;
        });
        features._filtros = Object.keys(filtros).map(codregion => ({
            orden:parseInt(codregion) == 13?5.5:parseInt(codregion),
            nombre:this.mapaRegiones[codregion] + " [" + filtros[codregion] + "]",
            filtro:`function(f) {return f.properties.codregion == "${codregion}"}`,
            activo:codregion == 5
        }));
        features._filtros.sort((f1, f2) => (f1.orden > f2.orden?1:-1));
        console.log("[Geoportal - BCN] Leidas " + features.features.length + " comunas a cache");
        return features;
    }
    getFeaturesAreasSilvestresProtegidas() {
        // ogr2ogr snaspe.geojson snaspe.shp -simplify 100  -t_srs WGS84
        let path = global.resDir + "/snaspe.geojson";
        let features = JSON.parse(require("fs").readFileSync(path));
        let filtros = {};
        features.name = "BCN - Áreas Silvestres Protegidas";
        features.features.forEach(f => {
            f.properties.id = f.properties.objectid;
            let tipo = f.properties.Tipo_Snasp;
            tipo = tipo || "[Tipo No Indicado]";
            if (filtros[tipo] === undefined) filtros[tipo] = 0;
            filtros[tipo] ++;
            f.properties._titulo = tipo + ": " + f.properties.Nombre; 
        });
        features._filtros = Object.keys(filtros).map(tipo => ({
            nombre:tipo + " [" + filtros[tipo] + "]",
            filtro:`function(f) {return f.properties.Tipo_Snasp == "${tipo}"}`,
            activo:tipo == "Parque"
        }));
        features._filtros.sort((f1, f2) => (f1.nombre > f2.nombre?1:-1));
        console.log("[Geoportal - BCN] Leidas " + features.features.length + " áreas silvestres protegidas a cache");
        return features;
    }
    getFeaturesRedHidrografica() {
        // ogr2ogr Red_Hidrografica.geojson Red_Hidrografica.shp -simplify 100  -t_srs WGS84
        let path = global.resDir + "/Red_Hidrografica.geojson";
        let features = JSON.parse(require("fs").readFileSync(path));
        let filtros = {};
        features.name = "BCN - Red Hidrográfica";
        features.features.forEach(f => {
            f.properties.id = f.properties.objectid;
            let provincia = f.properties.Provincia;
            provincia = provincia || "[Provincia no Indicada]";
            if (filtros[provincia] === undefined) filtros[provincia] = 0;
            filtros[provincia] ++;
            f.properties._titulo = f.properties.Dren_Tipo + (f.properties.Nombre?": " + f.properties.Nombre:""); 
        });
        features._filtros = Object.keys(filtros).map(provincia => ({
            nombre:provincia + " [" + filtros[provincia] + "]",
            filtro:`function(f) {return f.properties.Provincia == "${provincia}"}`,
            activo:provincia == "Valparaíso"
        }));
        features._filtros.sort((f1, f2) => (f1.nombre > f2.nombre?1:-1));
        console.log("[Geoportal - BCN] Leidas " + features.features.length + " Red Hidrográfica a cache");
        return features;
    }
    getFeaturesMasasDeAgua() {
        // ogr2ogr masas_lacustres.geojson masas_lacustres.shp -simplify 100  -t_srs WGS84
        let path = global.resDir + "/masas_lacustres.geojson";
        let features = JSON.parse(require("fs").readFileSync(path));
        let filtros = {}
        features.name = "BCN - Masas de Agua";
        features.features.forEach(f => {
            f.properties.id = f.properties.objectid;
            let tipo = f.properties.Tipo || "[Tipo no Indicado]";
            if (filtros[tipo] === undefined) filtros[tipo] = 0;
            filtros[tipo] ++;
            f.properties._titulo = tipo + ": " + f.properties.Nombre; 
        });
        features._filtros = Object.keys(filtros).map(tipo => ({
            nombre:tipo + " [" + filtros[tipo] + "]",
            filtro:`function(f) {return f.properties.Tipo == "${tipo}"}`,
            activo:tipo == "Embalse"
        }));
        features._filtros.sort((f1, f2) => (f1.nombre > f2.nombre?1:-1));
        console.log("[Geoportal - BCN] Leidas " + features.features.length + " Masas de Agua a cache");
        return features;
    }

    // MinZ
    async comandoGET(cmd, req, res) {
        try {
            switch(cmd) {
                case "initMinZ":
                    await this.initMinZ(req, res);
                    break;
                case "importaINE":
                    await this.importaINE(req, res);
                    break;
                default: throw "Comando '" + cmd + "' no implementado";
            }
        } catch(error) {
            console.error(error);
            if (typeof error == "string") {
                res.send(error).status(401).end();
            } else {
                res.send("Error Interno").status(500).end();
            }
        }
    }

    pad(st, n) {
        let r = "" + st;
        while (r.length < n) r = "0" + r;
        return r;
    }
    async initMinZ(req, res) {
        try {
            // Crear dimensiones
            if (!(await minz.existeDimension("bcn.region"))) {
                await minz.addOrSaveDimension({code:"bcn.region", name:"Región"});
            }
            if (!(await minz.existeDimension("bcn.provincia"))) {
                await minz.addOrSaveDimension({code:"bcn.provincia", name:"Provincia", classifiers:[{fieldName:"region", name:"Región", dimensionCode:"bcn.region", defaultValue:"00"}]});
            }
            if (!(await minz.existeDimension("bcn.comuna"))) {
                await minz.addOrSaveDimension({code:"bcn.comuna", name:"Comuna", classifiers:[{fieldName:"provincia", name:"Provincia", dimensionCode:"bcn.provincia", defaultValue:"000"}]});
            }
            for (let i=0; i<this.regiones.features.length; i++) {
                let region = this.regiones.features[i];
                let cod = this.pad(region.properties.codregion, 2);                
                await minz.addOrUpdateRow("bcn.region", {code:cod, name:region.properties.Region});
            }
            for (let i=0; i<this.provincias.features.length; i++) {
                let provincia = this.provincias.features[i];
                console.log("Provincia: " + provincia.properties.Provincia);
                let cod = this.pad(provincia.properties.cod_prov, 3);                
                let codregion = this.pad(provincia.properties.codregion, 2);                
                await minz.addOrUpdateRow("bcn.provincia", {code:cod, name:provincia.properties.Provincia, region:codregion});
            }
            for (let i=0; i<this.comunas.features.length; i++) {
                let comuna = this.comunas.features[i];
                let cod = this.pad(comuna.properties.cod_comuna, 5);
                let provincia = this.provincias.features.find(p => p.properties.Provincia == comuna.properties.Provincia);
                if (provincia) {
                    let codprovincia = this.pad(provincia.properties.cod_prov, 3);                
                    await minz.addOrUpdateRow("bcn.comuna", {code:cod, name:comuna.properties.Comuna, provincia:codprovincia});
                } else {
                    console.warn("No se encontró la Provincia '" + comuna.properties.Provincia + "' referenciada desde la comuna", comuna);
                }
            }

            // Crear Variables
            if (!await minz.existeVariable("ine.cosecha_acuicola")) {
                await minz.addVariable({
                    code:"ine.cosecha_acuicola",
                    name:"Cosecha Acuícola",
                    temporality:"1M",
                    classifiers:[{
                        fieldName:"region", name:"Región", dimensionCode:"bcn.region", defaultValue:"00"
                    }],
                    options:{
                        unit:"ton",
                        decimals:2
                    }
                })
            } 
            if (!await minz.existeVariable("ine.pesca_artesanal")) {
                await minz.addVariable({
                    code:"ine.pesca_artesanal",
                    name:"Pesca Artesanal",
                    temporality:"1M",
                    classifiers:[{
                        fieldName:"region", name:"Región", dimensionCode:"bcn.region", defaultValue:"00"
                    }],
                    options:{
                        unit:"ton",
                        decimals:2
                    }
                })
            }            
            res.status(200).send("Ok").end();
        } catch(error) {
            throw error;
        }
    }

    async importaINE(req, res) {
        try {
            let regiones = await minz.findRows("bcn.region");

            console.log("\n\nCosecha Acuicola por Region");
            console.log("  => Eliminando periodo anterior");
            let startTime = moment.tz("2010-01-01", config.timeZone);
            let endTime = moment.tz("2100-01-01", config.timeZone);
            await minz.deletePeriod("ine.cosecha_acuicola", startTime.valueOf(), endTime.valueOf(), true);
            await minz.deletePeriod("ine.pesca_artesanal", startTime.valueOf(), endTime.valueOf(), true);
            for (let i=0; i<regiones.length; i++) {
                let region = regiones[i];
                if (region.code != "00") {
                    let cosechaAcuicola = await ine.getCosechaAcuicola(region.code);
                    console.log("Cosecha Acuicola:", region.name, cosechaAcuicola);
                    for (let j=0; j<cosechaAcuicola.length; j++) {
                        let row = cosechaAcuicola[j];
                        let time = moment.tz(row.ano + "-" + this.pad(row.mes,2) + "-01", config.timeZone);
                        await minz.postData("ine.cosecha_acuicola", time.valueOf(), row.valor, {region:row.codigoRegion});
                    }
                    let pescaArtesanal = await ine.getPescaArtesanal(region.code);
                    console.log("Pesca Artesanal:", region.name, pescaArtesanal);
                    for (let j=0; j<pescaArtesanal.length; j++) {
                        let row = pescaArtesanal[j];
                        let time = moment.tz(row.ano + "-" + this.pad(row.mes,2) + "-01", config.timeZone);
                        await minz.postData("ine.pesca_artesanal", time.valueOf(), row.valor, {region:row.codigoRegion});
                    }
                }
            }
            res.status(200).send("Ok").end();
        } catch(error) {
            console.error(error);
            throw error;
        }
    }
}

module.exports = ProveedorCapasBCN;