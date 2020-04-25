//const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
//const port = new SerialPort("/dev/ttyUSB0", { baudRate: 57600 });
const Influx = require('influx');
const { spawn } = require('child_process')

const BME280 = require('bme280-sensor');
const options = {
    i2cBusNo: 1, // defaults to 1
    i2cAddress: 0x76 // defaults to 0x77
};

const bme280 = new BME280(options);

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

const influx = new Influx.InfluxDB('http://admin:extra@127.0.0.1:8086/hives');
influx.schemas = schemas;

const python = spawn('python', ['script1.py']);
const parser = new Readline();
process.pipe(python.stdout);

parser.on('data', function (line) {
    console.log(line);
    try {
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
    } catch (error) {
        console.error(error);
    }

});

const readSensorData = () => {
    var i = 0;

    var temp = [];
    var pres = [];
    var measure = setInterval(() => {
        if (i < 5) {
            bme280.readSensorData()
                .then((data) => {
                    temp.push(data.temperature_C);
                    pres.push(data.pressure_hPa);
                    console.log(`BME280 reading: ${JSON.stringify(data)}`)
                    i += 1;
                })
                .catch((err) => {
                    console.log(`BME280 read error: ${err}`);
                });
        } else {
            clearInterval(measure);
            var points = [];
            points.push({
                measurement: "temperature",
                tags: { hive: "sensor_1" },
                fields: { value: temp.sort()[2] }
            });
            points.push({
                measurement: "pressure",
                tags: { hive: "sensor_1" },
                fields: { value: pres.sort()[2] }
            });
            influx.writePoints(points);
            setTimeout(readSensorData, 1000 * 60 * 10);
            i = 0;
        }
    }, 5000);
};

// Initialize the BME280 sensor
//
bme280.init()
    .then(() => {
        console.log('BME280 initialization succeeded');
        readSensorData();
    })
    .catch((err) => console.error(`BME280 initialization failed: ${err} `));

