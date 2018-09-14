/**
 * Created by Konstantin Nedovizin on 07.06.2018.
 */


module.exports = (app) => {

    class citytaxi {

        constructor(login, password) {

            this.baseUrl = 'https://city-mobil.ru/taxiserv';
            this.logined = false;
            this.request = require('request-promise');

            this.auth = {
               login: login,
               password: password
            }

            this.Trips = app.con.define('city_trips', {
                driverUID:	        {type: app.Sequelize.INTEGER},
                driverName:	        {type: app.Sequelize.STRING},
                UUID:	            {type: app.Sequelize.STRING},
                clientTariff:       {type: app.Sequelize.STRING},
                start:              {type: app.Sequelize.DATE},
                end:                {type: app.Sequelize.DATE},
                from:               {type: app.Sequelize.STRING},
                to:                 {type: app.Sequelize.STRING},
                payCash:            {type: app.Sequelize.DECIMAL(7,2)},
                payTariff:          {type: app.Sequelize.DECIMAL(7,2)},
                payDiff:            {type: app.Sequelize.DECIMAL(7,2)},
                payType:            {type: app.Sequelize.STRING},
                payPromo:           {type: app.Sequelize.DECIMAL(7,2)},
                payDeposit:         {type: app.Sequelize.DECIMAL(7,2)},
                payCommission:      {type: app.Sequelize.DECIMAL(7,2)},
                payAcquiring:       {type: app.Sequelize.DECIMAL(7,2)},
                sms:                {type: app.Sequelize.TEXT},
                paySystem:          {type: app.Sequelize.DECIMAL(7,2)},
                payCity:            {type: app.Sequelize.DECIMAL(7,2)},
                driverTariff:       {type: app.Sequelize.STRING},
                duration:           {type: app.Sequelize.TIME},
                waiting:            {type: app.Sequelize.TIME},
                distance:           {type: app.Sequelize.INTEGER}

            });

            this.Payments = app.con.define('city_payments', {
                UID:	            {type: app.Sequelize.INTEGER},
                companyName:	    {type: app.Sequelize.STRING},
                debit:              {type: app.Sequelize.DECIMAL(7,2)},
                credit:             {type: app.Sequelize.DECIMAL(7,2)},
                type:               {type: app.Sequelize.TEXT},
                date:               {type: app.Sequelize.DATE},
                comment:            {type: app.Sequelize.TEXT},
                tripUUID:           {type: app.Sequelize.STRING},
                penalty:            {type: app.Sequelize.DECIMAL(7,2)},
                userName:           {type: app.Sequelize.STRING}
            });

            this.Drivers = app.con.define('city_drivers', {
                UID:	        {type: app.Sequelize.INTEGER},
                lastName:	    {type: app.Sequelize.STRING},
                firstName:	    {type: app.Sequelize.STRING},
                surname:	    {type: app.Sequelize.STRING},
                callsign:       {type: app.Sequelize.STRING},
                phone:          {type: app.Sequelize.STRING},
                tariff:         {type: app.Sequelize.STRING},
                company:        {type: app.Sequelize.STRING},
                car:            {type: app.Sequelize.STRING},
                limit_balance:  {type: app.Sequelize.INTEGER},
                min_balance:    {type: app.Sequelize.INTEGER},
                max_balance:    {type: app.Sequelize.INTEGER},
                percent:        {type: app.Sequelize.DECIMAL(4,2)},
                scores:         {type: app.Sequelize.INTEGER},
                cash:           {type: app.Sequelize.BOOLEAN, allowNull: false, defaultValue: true},
                is_sber:        {type: app.Sequelize.BOOLEAN, allowNull: false, defaultValue: false}
            }, {
                getterMethods: {
                    balance() {
                        return this.outerBalance || null
                    },
                    fullName() {
                        return `${this.lastName}${this.firstName? (' ' + this.firstName) : ''}${this.surname? (' ' + this.surname) : ''}`
                    }
                }
            });

            this.Drivers.prototype.classInstance = this;

            this.Drivers.prototype.balanceTxn = function(amount, txnId, comment, typeId) {
                return this.classInstance.driverBalanceChange(this.UID, amount, txnId, comment, typeId)
            }

            this.Drivers.prototype.loadBalance = async function() {
                this.outerBalance = await this.classInstance.getDriverBalance(this.UID);
                return this.outerBalance;
            }

            this.Balances = app.con.define('city_balances', {
                amount:          {type: app.Sequelize.DECIMAL(9,2)},
                balance:         {type: app.Sequelize.DECIMAL(9,2)},
                park_percent:    {type: app.Sequelize.DECIMAL(4,2)},
                is_processed:    {type: app.Sequelize.BOOLEAN, allowNull: false, defaultValue: false}
            });

            this.BalanceTypes = app.con.define('city_balances_types', {
                name:            {type: app.Sequelize.STRING},
            });

            this.Users = app.con.define('users', {
                first_name:             {type: app.Sequelize.STRING},
                last_name:              {type: app.Sequelize.STRING},
                username:               {type: app.Sequelize.STRING},
                telegramId:             {type: app.Sequelize.INTEGER},
                desc:                   {type: app.Sequelize.STRING},
                alfa:                   {type: app.Sequelize.BOOLEAN, defaultValue: false},
                sber:                   {type: app.Sequelize.BOOLEAN, defaultValue: false},
                qiwi:                   {type: app.Sequelize.BOOLEAN, defaultValue: true},
                card:                   {type: app.Sequelize.STRING},
                phone:                  {type: app.Sequelize.STRING},
                is_verified:            {type: app.Sequelize.BOOLEAN, defaultValue: false},
                promo_link:             {type: app.Sequelize.STRING},
                is_partner:             {type: app.Sequelize.BOOLEAN, defaultValue: false},
                is_recruiter:           {type: app.Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
                resident:               {type: app.Sequelize.INTEGER(1), defaultValue: 1, allowNull: false},
                apihash:                {type: app.Sequelize.STRING},
                apitoken:               {type: app.Sequelize.STRING},
                is_blocked:             {type: app.Sequelize.BOOLEAN, allowNull: false, defaultValue: false}
            }, {
                getterMethods:          {
                    fullname()          {return `${this.last_name ? this.last_name  : ''} ${this.first_name} ${this.username ? `(@${ this.username })` : ''}`},
                    respectname()       {return this.first_name}
                }
            });


            this.Drivers        .hasMany(   this.Trips,               { foreignKey: 'driverId', as: 'trips'});
            this.Drivers        .hasMany(   this.Balances,            { foreignKey: 'driverId', as: 'balances'});
            this.Balances       .belongsTo( this.BalanceTypes,        { foreignKey: 'typeId',   as: 'type'});
            this.Balances       .belongsTo( this.Drivers,             { foreignKey: 'driverId', as: 'driver'});
            this.Trips          .belongsTo( this.Drivers,             { foreignKey: 'driverId', as: 'driver'});
            this.Trips          .hasMany(   this.Payments,            { foreignKey: 'tripId',   as: 'payments'});
            this.Payments       .belongsTo( this.Trips,               { foreignKey: 'tripId',   as: 'trip'});
            this.Payments       .belongsTo( this.Drivers,             { foreignKey: 'driverId', as: 'driver'});
            this.Drivers        .hasMany(   this.Payments,            { foreignKey: 'driverId', as: 'payments'});


            //console.log('app.models.Users', app.models.Users)

      //      this.Drivers        .belongsTo( app.models.Users,         { foreignKey: 'userId',   as: 'user'});
      //      app.models.Users    .hasOne(    this.Drivers,             { foreignKey: 'userId',   as: 'city'});
            this.Drivers        .belongsTo( this.Users,         { foreignKey: 'userId',   as: 'user'});
            this.Users          .hasOne(    this.Drivers,       { foreignKey: 'userId',   as: 'city'});

            //console.log('app.models.Users', app.models.Users)
        }


        async getOrders(from, to) {
            const xlsParser = require('node-xlsx');
            try {

                await this.login();

                const opt = {
                    method: 'GET',
                    url: `${this.baseUrl}/partnerordersreport`,
                    qs: {
                        exec: '1',
                        companyid: this.companyId,
                        id_locality: '2',
                        dayB: from,
                        time_b: '',
                        dayE: to,
                        time_e: '' },
                    headers: {
                        'Cache-Control': 'no-cache' },
                    encoding: null,
                    jar: true
                };

                const orders = await this.request(opt);


                const xlsxData = xlsParser.parse(orders);

                const ordersData = xlsxData[0].data;

                return ordersData;

            } catch (e) {
                app.sendErr('citytaxi getOrders', e);
                throw e
            }
        }

        async getPartnerPayments(from, to) {
            try {

                await this.login();

                const paymentsData = [];

                const opt = {
                    method: 'GET',
                    url: `${this.baseUrl}/companypayments/dictionary`,
                    qs: {
                        page: 1,
                        filter: JSON.stringify({
                            date_only: {
                                b: from ,
                                e: to },
                            idhash: '',
                            id_type: 0,
                            companyid: '',
                            filterDriver: ''}),
                        sort: JSON.stringify({}),
                        info: JSON.stringify({}) },
                    headers: {
                        'Cache-Control': 'no-cache' },
                    json: true,
                    jar: true
                };

                const payments = await this.request(opt);



                const $ = app.$.load(payments.html, {decodeEntities: true});

                const paymentsTable = $('.bs_dictionary tbody tr').toArray();
                Array.prototype.push.apply(paymentsData, paymentsTable.map( row => {

                    const cells = $('td', row).toArray();

                    return cells.map( cell => {
                        return $(cell).text().trim();
                    })

                }));
                const pages = parseInt( $('.pages li:last-child span').text().replace(/\D/g,'') );

                console.log('pages', pages);

                for(let page = 2; page <= pages; page++) {
                    opt.qs.page = page;
                    console.log('page', page);

                    const payments = await this.request(opt);

                    const $ = app.$.load(payments.html, {decodeEntities: true});

                    const paymentsTable = $('.bs_dictionary tbody tr').toArray();
                    Array.prototype.push.apply(paymentsData, paymentsTable.map( row => {

                        const cells = $('td', row).toArray();

                        return cells.map( cell => {

                            let text = $(cell).text().trim();

                            if(/^\d+$/.test(text)) {
                                const dId = $(cell).html().match(/driverId=(\d+)/);

                                if(dId) {
                                    text = dId[1];
                                }

                            }

                            return text;
                        })

                    }));
                }

                //console.log()

                return paymentsData;

            } catch (e) {
                app.sendErr('citytaxi getPartnerPayments', e);
                throw e
            }
        }

        async getCompanyId() {
            try {

                await this.login();

                const opt = {
                    method: 'GET',
                    url: `${this.baseUrl}/drivers`,
                    headers: {
                        'Cache-Control': 'no-cache' },
                    json: true,
                    jar: true
                };

                const driversPage = await this.request(opt);

                const $ = app.$.load(driversPage, {decodeEntities: true});


                this.companyId = parseInt( $('#companyid :selected')[0].attribs.value);

                console.log('companyId: ', this.companyId);

            } catch (e) {
                app.sendErr('citytaxi getCompanyId', e);
                throw e
            }
        }

        async getDrivers() {
            try {

                await this.login();

                const driversData = [];

                const rowStructure = ['check','UID','on','callsign','fullname','phone','car','tariff','company',
                    'dk','limit_balance','min_balance','max_balance','percent', 'balance','transit_balance','scores','photo','cash',
                    'last_order','version'];

                const opt = {
                    method: 'GET',
                    url: `${this.baseUrl}/drivers/dictionary`,
                    qs: {
                        page: 1,
                        filter: JSON.stringify({
                            "id": "",
                            "bankid": "",
                            "status": "A",
                            "child":0,
                            "outer_uuid":"",
                            "companyid": this.companyId,
                            "has_warning":[],
                            "y_import_status":[],
                            "id_locality":2,
                            "block_number":"",
                            "phone_text":"",
                            "app_version":"",
                            "not_equal":0,
                            "driver_license": 0,
                            "driver_license_class":"",
                            "inn_valid":"",
                            "id_class":"",
                            "id_mark":"0",
                            "id_model":"",
                            "reg_num":"",
                            "phone_brand":"",
                            "phone_model":"",
                            "show_device": 0,
                            "block_reason": 0,
                            "last_name":"",
                            "name":"",
                            "autoget_status":"",
                            "active_driver":"",
                            "driver_status":"",
                            "date_register":{
                                "b":"",
                                "e":""
                            },
                            "smoking":"",
                            "is_test":"0",
                            "outsourced":"",
                            "show_blocked_companies": 0,
                            "partnership_level":"",
                            "last_order_date":{
                                "b":"",
                                "e":""
                            },
                            "no_completed_orders": 0,
                            "fraud_drivers":0,
                            "passport_num_mask_id": "",
                            "passport_num": "",
                            "passport_date": "",
                            "driver_license_number": "",
                            "passport_expiration_date": "",
                            "driver_license_mask_id": "",
                            "driver_license_date": "",
                            "driver_license_expiration_date": ""
                        }),
                        sort: JSON.stringify({}),
                        info: JSON.stringify({}) },
                    headers: {
                        'Cache-Control': 'no-cache' },
                    json: true,
                    jar: true
                };

                const drivers = await this.request(opt);

                const $ = app.$.load(drivers.html, {decodeEntities: true});


                const pages = parseInt( $('.pages li:last-child span').text().replace(/\D/g,'') );

                console.log('pages', pages);

                for(let page = 1; page <= pages; page++) {
                    opt.qs.page = page;
                    console.log('page', page);

                    const drivers = await this.request(opt);

                    const $ = app.$.load(drivers.html, {decodeEntities: true});

                    const driversTable = $('.table_view tbody tr').toArray();
                    Array.prototype.push.apply(driversData, driversTable.map( row => {

                        const cells = $('td', row).toArray();

                        return cells.reduce( (a, cell, i) => {
                            a[rowStructure[i]] = $(cell).text().trim();

                            if(rowStructure[i] === 'fullname') {
                                const names = a.fullname.split(' ');
                                a.lastName = names[0] || null;
                                a.firstName = names[1] || null;
                                a.surname = names[2] || null;
                            }

                            if(rowStructure[i] === 'cash') {
                                a.cash = a.cash === 'Да';
                            }

                            return a;
                        }, {})

                    }));
                }

                //console.log()

                return driversData;

            } catch (e) {
                app.sendErr('citytaxi getDrivers', e);
                throw e
            }
        }

        async driversSync() {

            try {

                await this.login();

                const drivers = await this.getDrivers();

                let sync = {new: 0, upd: 0, total: drivers.length};

                for(const drv of drivers) {
                    const [driver, is_new] = await this.Drivers.findOrCreate( {where: {UID: drv.UID }, defaults: drv });
                    if(is_new) {
                        sync.new++
                    } else {
                        await driver.update(drv);
                        sync.upd++
                    }

                }

                return sync;

            } catch (e) {
                app.sendErr('citytaxi driversSync', e);
                throw e
            }

        }

        async syncOrders(from, to) {
            let orderArr;
            try {

                await this.login();

                await this.getCompanyId();

                const drvResult = await this.driversSync();

                const paymentArr = await this.getPartnerPayments(from, to);
                const orders = await this.getOrders(from, to);

                orderArr = orders;

                const paymentsObj = paymentArr.reduce((a,e) => {

                    if(!a[e[7]]) a[e[7]] = [];

                    a[e[7]].push(e);

                    return a;
                }, {});

                const trips = {
                    total: 0,
                    new: 0,
                    newDrvs: [],
                    drvSync: drvResult
                }

                for(const order of orders) {

                    trips.total++;

                    //console.log('order', order);

                    if( !(order[2] && /^\d+$/.test(order[0]) && order[4]) ) continue;

                    const orderData = {
                        driverUID:	        order[0] || null,
                        driverName:	        order[1] || null,
                        UUID:	            order[2] || null,
                        clientTariff:       order[3] || null,
                        start:              order[4] || null,
                        end:                order[5] || null,
                        from:               order[6] || null,
                        to:                 order[7] || null,
                        payCash:            order[8] || null,
                        payTariff:          order[9] || null,
                        payDiff:            order[10]|| null,
                        payType:            order[11]|| null,
                        payPromo:           order[12]|| null,
                        payDeposit:         order[13]|| null,
                        payCommission:      order[14]|| null,
                        payAcquiring:       order[15]|| null,
                        sms:                order[16]|| null,
                        paySystem:          order[17]|| null,
                        payCity:            order[18]|| null,
                        driverTariff:       order[19]|| null,
                        duration:           order[20]|| null,
                        waiting:            order[21]|| null,
                        distance:           order[22]|| null

                    };

                    //console.log('orderData', orderData);

                    const [driver, drvIsNew] = await this.Drivers.findOrCreate({ where: {UID: orderData.driverUID}, defaults: {
                            UID: orderData.driverUID,
                            lastName:	    orderData.driverName.split(' ')[0],
                            firstName:	    orderData.driverName.split(' ')[1] || null,
                            surname:	    orderData.driverName.split(' ')[2] || null,
                        }})

                    if(drvIsNew) {
                        trips.newDrvs.push(driver.get({ plain: true }));
                    }

                    orderData.driverId = driver.id;

                    const [trip, tripIsNew] = await this.Trips.findOrCreate({ where: {UUID: orderData.UUID}, defaults: orderData});

                    if(tripIsNew) {
                        trips.new++;
                    }

                    if(trip.driverId !== driver.id) {
                        await trip.update({driverId: driver.id});
                    }

                    if(paymentsObj[trip.UUID]) {
                        for(const pay of paymentsObj[trip.UUID]) {
                            const payData = {
                                UID:	            pay[0],
                                companyName:	    pay[1],
                                debit:              pay[2],
                                credit:             pay[3],
                                type:               pay[4],
                                date:               pay[5],
                                comment:            pay[6],
                                tripUUID:           pay[7],
                                driverUIU:          pay[8],
                                userName:           pay[9],
                                penalty:            pay[10],
                                tripId:             trip.id
                            }

                            const driver = await this.Drivers.findOne({ where: {UID: payData.driverUIU}});

                            if(driver) {
                                payData.driverId = driver.id;
                            }

                            await this.Payments.findOrCreate({ where: { UID: payData.UID }, defaults: payData})
                        }

                    }

                }

                return trips;

            } catch (e) {
                console.log('orderArr', orderArr);
                app.sendErr('citytaxi syncOrders', e);
                throw e
            }
        }

        async driverBalanceChange(driverUID, amount, txnId, comment = '', typeId = 84) {

            const vm = require('vm');

            const txnTypes = {
                14: "Ручной платеж",
                15: "Оплата долга (перевод полученного долга др исполни",
                17: "Штраф",
                20: "Возврат штрафа",
                22: "Переведено на баланс другого водителя",
                23: "Клиент оплатил долг",
                26: "Компенсация водителю за счет диспетчера, оператора",
                28: "Компенсация водителю от Клиента",
                30: "Компенсация от водителя клиенту на бонусы",
                32: "Возмещение за рекламу СМ на Авто, 1000",
                36: "списание ошибочно за",
                41: "Перечисление на расчетный счет",
                50: "Штраф за отказ от утреннего заказа, 500",
                53: "Штраф за обман Ситимобил или Клиента, 1000",
                54: "Штраф за грязную машину, 500",
                55: "Штраф за несвоевременное закрытие, 20",
                56: "Штраф за закрытие не выполненного заказа, 50",
                57: "Штраф за попытку взлома системы, 5000",
                58: "Возврашаем проценты заказов за оценку 5",
                62: "Пополнение баланса через Qiwi. Ручной",
                64: "Пополнение баланса через Элекснет. Ручной",
                70: "Компенсация водителю за счет Ситимобил",
                76: "Клиенту на бонус. Ручной",
                80: "Сдача на бонусный счет. Ручной.",
                82: "Пополнение баланса водителя",
                84: "Списание баланса водителя",
                90: "Пополнение баланса с карты. Ручной.",
                92: "Ручной. Электронный платеж по заказу",
                98: "Ручной. Отказ от заказа., 200",
                100: "Штраф Ручной. Отказ от заказа. Срыв., 1000",
                102: "Возврат % по заказу",
                104: "% от заказа (II)"
            }

            try {

                await this.login();

                const paymentPage = await this.request({
                    method: 'GET',
                    url: 'https://city-mobil.ru/taxiserv/driverpayment',
                    qs: { id_driver: driverUID },
                    jar: true
                });

                const $ = app.$.load(paymentPage, {decodeEntities: true});

                let balance = parseFloat($('#balance span').text());

                const script = $('head script').not('[src]');

                const sandbox = { window: {} };
                vm.createContext(sandbox);

                let CSRF_TOKEN = null;
                script.each((inx, elem) => {
                    const code = elem.children[0].data;
                    //console.log('code', code);

                    try {
                        vm.runInContext(code, sandbox);
                    } catch (e) {
                        console.log('vm error', e)
                    }
                    //console.log('sandbox', sandbox);

                    CSRF_TOKEN = CSRF_TOKEN || sandbox.CSRF_TOKEN;
                });

                const opt = { method: 'POST',
                    url: 'https://city-mobil.ru/taxiserv/driverpayment',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Content-Type': 'application/x-www-form-urlencoded' },
                    form: {
                        id_driver: driverUID,
                        balance_type: 0,
                        id_type_action: '',
                        payment: amount,
                        pay_date: '',
                        add_remove: 1,
                        transfer_to: '',
                        id_type: typeId,
                        comment: comment,
                        id_order: '',
                        id_pdd: '',
                        id_request: '',
                        id_payment: '',
                        id_transaction: txnId,
                        _csrf_token: CSRF_TOKEN },
                    json: true,
                    jar: true
                };

                const paymentResult = await await this.request(opt);

                if(paymentResult.success === 1) {
                    paymentResult.balance = balance +  amount;
                    paymentResult.type = txnTypes[typeId];
                    paymentResult.comment = comment;

                    return paymentResult;
                } else {
                    console.log(paymentResult);

                    return false;
                }

            } catch (e) {
                app.sendErr('citytaxi driverBalanceChange', e);
                throw e
            }
        }

        async getDriverBalance(UID) {
            const vm = require('vm');

            try {

                await this.login();

                let paymentPage = await this.request({
                    method: 'GET',
                    url: 'https://city-mobil.ru/taxiserv/driverpayment',
                    qs: { id_driver: UID },
                    jar: true
                });

                let $ = app.$.load(paymentPage, {decodeEntities: true});

                if($('#form1').html()) {
                    await this.login();
                    paymentPage = await this.request({
                        method: 'GET',
                        url: 'https://city-mobil.ru/taxiserv/driverpayment',
                        qs: { id_driver: UID },
                        jar: true
                    });

                    let $ = app.$.load(paymentPage, {decodeEntities: true});
                }

                let balance = parseFloat($('#balance span').text());

                if(!balance && balance !== 0) {

                    app.sendErr(`CityTaxi Wrong balance (${balance}, o: ${$('#balance span').text()}), driverUID: ${UID}`);
                    console.log('CityTaxi erorr balance page',paymentPage)
                    balance = { error: true, text: 'Ошибка сервера Ситимобил, попробуйте позже.' }
                }

                return balance;

            } catch (e) {
                app.sendErr('citytaxi getDriverBalance', e);
                throw e
            }
        }

        async login() {
            try {

                const now = Date.now();

                if(this.logined && ((now - this.logined) < (10 * 60 * 1000))) {
                    return true;
                }

                const opt = {
                    method: 'POST',
                    url: `${this.baseUrl}/login`,
                    headers:
                        {
                            'Cache-Control': 'no-cache',
                            'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
                        },
                    formData:
                        {
                            login: this.auth.login,
                            password: this.auth.password,
                            Submit: 'Войти'
                        },
                    jar: true
                };

                let loginData;

                try {
                    loginData = await this.request(opt);

                    console.log('loginData',loginData);
                } catch (e) {
                    if(e.statusCode !== 302) {
                        throw e
                    }
                }
                this.logined = Date.now();

                return true;

            } catch (e) {
                app.sendErr('citytaxi login', e);
                throw e
            }
        }

    }

    return citytaxi;

};