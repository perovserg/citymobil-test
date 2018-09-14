import Sequelize from 'sequelize';
import cheerio from 'cheerio';
import classCityFactory from './citytaxi.class';
import moment from 'moment';


const app = {};

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

app.sendErr = function(desc, error) {  console.log(desc, error);  /* отправка ошибки в телеграм бот*/ }

app.$ = cheerio;

app.Sequelize = Sequelize;

// app.models = ???

app.con = new Sequelize(process.env.DATABASE_URL, { logging: false, operatorsAliases: operatorsAliases, pool: {
        max: 5,
        min: 0,
        idle: 20000,
        acquire: 20000
    }});

const login = 'kosarev__ba',
    password = '1G3uC6ii4gpx';

const ClassCity = classCityFactory(app);

const citytaxi = new ClassCity(login, password);


const from = moment().subtract(1, 'days').startOf('day').format('DD-MM-YYYY');
const to = moment().add(1, 'days').startOf('day').format('DD-MM-YYYY');

//const from = %начало вчерашнего дня в формате 08-09-2018%
//const to = %начало следующего дня  в формате 10-09-2018%
citytaxi.syncOrders(from, to)
    .then((res) => {
        console.log(`City
            From: ${from}
            To: ${to}
            Total: ${res.total}, new: ${res.new}, drivers +${res.newDrvs.length + res.drvSync.new}`);
        });
