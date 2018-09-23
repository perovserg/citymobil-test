import Sequelize from 'sequelize';
import op from 'object-path';
import cheerio from 'cheerio';
import moment from 'moment';
import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';

import config from './config';
import classCityFactory from './citytaxi.class';
import routes from './routes/index';
import * as handlerTelegramBot from './lib/handlerTelegramBot';


const app = express();

const Op = Sequelize.Op;
const operatorsAliases = {
    $eq: Op.eq,
    $ne: Op.ne,
    $gte: Op.gte,
    $gt: Op.gt,
    $lte: Op.lte,
    $lt: Op.lt,
    $not: Op.not,
    $in: Op.in,
    $notIn: Op.notIn,
    $is: Op.is,
    $like: Op.like,
    $notLike: Op.notLike,
    $iLike: Op.iLike,
    $notILike: Op.notILike,
    $regexp: Op.regexp,
    $notRegexp: Op.notRegexp,
    $iRegexp: Op.iRegexp,
    $notIRegexp: Op.notIRegexp,
    $between: Op.between,
    $notBetween: Op.notBetween,
    $overlap: Op.overlap,
    $contains: Op.contains,
    $contained: Op.contained,
    $adjacent: Op.adjacent,
    $strictLeft: Op.strictLeft,
    $strictRight: Op.strictRight,
    $noExtendRight: Op.noExtendRight,
    $noExtendLeft: Op.noExtendLeft,
    $and: Op.and,
    $or: Op.or,
    $any: Op.any,
    $all: Op.all,
    $values: Op.values,
    $col: Op.col
};

app.$ = cheerio;

app.Sequelize = Sequelize;

// app.models = ???

app.sequelizeConnection = async () => {

    app.con = new Sequelize(process.env.DATABASE_URL,{
        logging: false,
        operatorsAliases: operatorsAliases,
        pool: {
            max: 5,
            min: 0,
            idle: 20000,
            acquire: 20000
        }
    });

    app.Parks = app.con.define('city_parks', {
        parkId: {type: app.Sequelize.INTEGER},
        login: {type: app.Sequelize.STRING},
        password: {type: app.Sequelize.STRING},
    });

    try {
        await app.con.sync({force: false});
        console.info(`Sequelize is ready!`);
    } catch (e) {
        app.sendErr('Sequelize connection error: ', e);
    }

};


app.handleParksList = async () => {

    console.log(`parks list handling start -> ${moment().format('DD/MM/YYYY HH:mm:ss')}`);

    const ClassCity = classCityFactory(app);

    const parksList = await app.Parks.findAll();

    console.log(`count of parks: ${parksList.length}`);

    const from = moment().subtract(1, 'days').startOf('day').format('DD-MM-YYYY'); //%начало вчерашнего дня в формате 08-09-2018%
    const to = moment().add(1, 'days').startOf('day').format('DD-MM-YYYY'); //%начало следующего дня  в формате 10-09-2018%

    let count = 0;

    for (const park of parksList) {

        console.log(`start for ParkId: ${park.dataValues.parkId}`);

        const citytaxi = new ClassCity(park.dataValues.login, park.dataValues.password);

        const res = await citytaxi.syncOrders(from, to);

        if (res.error) {
            app.sendErr(`method syncOrders for parkId: ${park.dataValues.parkId} ended with error: `, res.error);
        } else {
            console.log(`City ParkId: ${park.dataValues.parkId}
            From: ${from}
            To: ${to}
            Total: ${res.total}, new: ${res.new}, drivers +${res.newDrvs.length + res.drvSync.new}`);
            count++;
        }
    }

    if (!count) app.sendErr('', 'there is no handled park! maybe source out of service...');

};

// default interval = 30 minutes
app.startHandling = async (interval = 30) => {

    app.startTime = moment();

    await app.sequelizeConnection();

    await app.handleParksList();

    const intervalMS = parseInt(interval, 10) * 60 * 1000;

    app.handlingInterval = setInterval(app.handleParksList,intervalMS);

};


app.set('port', (op.get(config, 'port') || 5000));

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.raw({limit: '2048kb'}));

app.telegramBot = new TelegramBot(op.get(config, 'telegram.token') || '', {polling: true});

app.telegramBot.chatIds = [];

app.telegramBot.onText(/\//, async(msg) => handlerTelegramBot.onText(app, msg));


app.sendErr = (desc, error) => {
    console.error(desc, error);
    app.telegramBot.chatIds.forEach((chatId) => {app.telegramBot.sendMessage(chatId, 'error: ' + desc + error)});
};


routes({app, express});

app.listen(app.get('port'), function() {
    console.log('Citymobil parser app is running on port: ' + app.get('port'));
});
