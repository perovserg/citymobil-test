import Sequelize from 'sequelize';
import op from 'object-path';
import cheerio from 'cheerio';
import moment from 'moment';
import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';


import config from './config';
import classCityFactory from './citytaxi.class';


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

const sequelizeConnection = async () => {

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
        console.error(e);
        throw new Error('Sequelize connection error!');
    }

};


const handleParksList = async () => {

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
            console.log(`City ParkId: ${park.dataValues.parkId} -> error: ${res.error}`);
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
const startHandling = async (interval = 30) => {

    app.startTime = moment();

    await sequelizeConnection();

    await handleParksList();

    const intervalMS = parseInt(interval, 10) * 60 * 1000;

    app.handlingInterval = setInterval(handleParksList,intervalMS);

};


app.set('port', (op.get(config, 'port') || 5000));

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.raw({limit: '2048kb'}));

app.telegramBot = new TelegramBot(op.get(config, 'telegram.token') || '', {polling: true});

app.telegramBotChatIds = [];

app.telegramBot.onText(/\/startApp (.+)/, async(msg, match) => {

    if (!app.telegramBotChatIds.includes(msg.chat.id)) app.telegramBotChatIds.push(msg.chat.id);

    const args = match[1];

    const argsJSON = JSON.parse('{"' + args.replace(/ /g, '", "').replace(/=/g, '": "') + '"}');

    const interval = op.get(argsJSON, 'interval', 30);

    try {
        await startHandling(interval);
    } catch (e) {
        app.telegramBot.sendMessage(msg.chat.id, `error: ${e}`);
    }

    app.telegramBot.sendMessage(msg.chat.id, `parks list handling is started with interval: ${interval} minutes.`);
});

app.telegramBot.onText(/\/stopApp/, async(msg) => {

    const i = app.telegramBotChatIds.indexOf(msg.chat.id);
    if (i > -1) app.telegramBotChatIds.splice(i, 1);

    if (app.telegramBotChatIds.length > 0) {
        app.telegramBot.sendMessage(msg.chat.id, `your chat is removed form list of chats.`);
        return;
    }

    if (app.handlingInterval) {
        try {
            clearInterval(app.handlingInterval);
        } catch (e) {
            app.telegramBot.sendMessage(msg.chat.id, `error: ${e}`);
        }
    } else {
        app.telegramBot.sendMessage(msg.chat.id, `error: parks list handling didn't started`);
    }

    app.telegramBot.sendMessage(msg.chat.id, `parks list handling is stopped. working time: ${moment().diff(app.startTime, 'seconds')} seconds`);

});

app.telegramBot.onText(/\/statusApp/, async(msg) => {
    if (app.handlingInterval){
        app.telegramBot.sendMessage(msg.chat.id, `parks list handling is working: ${moment().diff(app.startTime, 'seconds')} seconds`);
    } else {
        app.telegramBot.sendMessage(msg.chat.id, `parks list handling is not working`);
    }
});


app.sendErr = (desc, error) => {
    console.error(desc, error);

    app.telegramBotChatIds.forEach((chatId) => {app.telegramBot.sendMessage(chatId, 'error: ' + desc + error)});
};

app.get('/', function(request, response) {
    response.send('Hello World!');
});

app.get('/start', async (request, response) => {

    try {
        await startHandling(op.get(request.query, 'interval'));
    } catch (e) {
        response.status(400).json({error: e});
    }

    response.status(200).json({
        message: `parks list handling is started with interval: ${interval} minutes.`
    });

});


app.get('/stop', async (request, response) => {

    if (app.handlingInterval) {
        try {
            clearInterval(app.handlingInterval);
        } catch (e) {
            response.status(400).json({error: e});
        }
    } else {
        response.status(400).json({error: `parks list handling didn't started`});
    }

    response.status(200).json({
        message: `parks list handling is stopped. working time: ${moment().diff(app.startTime, 'seconds')} seconds`
    });

});

app.post('/park', async (request, response) => {

    const parkData = {
        parkId: op.get(request.body, 'parkId'),
        login: op.get(request.body, 'login'),
        password: op.get(request.body, 'password')
    };

    if (!app.con) {
        await sequelizeConnection();
    }

    try {
        await app.Parks.findOrCreate({where: {parkId: parkData.parkId}, defaults: parkData});
        response.status(200).json({message: `park added successfully.`});
    } catch (e) {
        response.status(400).json({error: e});
    }
});


app.listen(app.get('port'), function() {
    console.log("Citymobil parser app is running on port: " + app.get('port'));
});
