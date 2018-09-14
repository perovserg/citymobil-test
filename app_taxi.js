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

let Parks;

const sequelizeConnection = async () => {

    app.con = await new Sequelize(process.env.DATABASE_URL, { logging: false, operatorsAliases: operatorsAliases, pool: {
            max: 5,
            min: 0,
            idle: 20000,
            acquire: 20000
        }});
    app.con.sync()
        .then(() => {
            console.info(`Sequelize is ready!`);
        })
        .catch((e) => console.error(e));
};

sequelizeConnection()
    .then(async () => {
        Parks = app.con.define('city_parks', {
            parkId: {type: app.Sequelize.INTEGER},
            login: {type: app.Sequelize.STRING},
            password: {type: app.Sequelize.STRING},
        });

        // todo incoming request for this

        const parkData = {
            parkId: 3414,
            login: 'kosarev__ba',
            password: '1G3uC6ii4gpx'
        };

        await Parks.findOrCreate({ where: {parkId: parkData.parkId}, defaults: parkData});

        await handleParksList();

    });


const handleParksList = async () => {

    const ClassCity = classCityFactory(app);

    const parksList = await Parks.findAll();

    console.log(`count of parks: ${parksList.length}`);

    const from = moment().subtract(1, 'days').startOf('day').format('DD-MM-YYYY'); //%начало вчерашнего дня в формате 08-09-2018%
    const to = moment().add(1, 'days').startOf('day').format('DD-MM-YYYY'); //%начало следующего дня  в формате 10-09-2018%

    parksList.forEach(async (park) => {

        const citytaxi = new ClassCity(park.dataValues.login, park.dataValues.password);

        const res = await citytaxi.syncOrders(from, to);

        console.log(`City
            ParkId: ${park.dataValues.parkId}
            From: ${from}
            To: ${to}
            Total: ${res.total}, new: ${res.new}, drivers +${res.newDrvs.length + res.drvSync.new}`);
    });
};
