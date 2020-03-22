const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const port = new SerialPort("/dev/ttyUSB0", { baudRate: 57600 });

const parser = new Readline();
port.pipe(parser);

var fields = ["weight", "temperature", "humidity", "voltage"];

var schemas = []
fields.forEach(field => {
    schemas.push({
        measurement: field,
        fields: {
            value: Influx.FieldType.FLOAT
        },
        tags: [
            'hive'
        ]
    });
});

const Influx = require('influx');
const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'hives',
    schema: schemas
})



parser.on('data', function (line) {

    data = JSON.parse(line);
    console.log(data)

    var points = []
    fields.forEach(field => {
        points.push({
            measurement: field,
            tags: { hive: "hive_1" },
            fields: { value: data[field] }
        });
    });

    influx.writePoints(points);
});