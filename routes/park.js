import op from 'object-path';

export default ({app, express, router}) => {

    router.route('/park')
        .post(async (req, res) => {
            const parkData = {
                parkId: op.get(req.body, 'parkId'),
                login: op.get(req.body, 'login'),
                password: op.get(req.body, 'password')
            };

            try {

                if (!parkData.login || !parkData.password) throw new Error('Got no login or password!');

                if (!app.con) {
                    await app.sequelizeConnection();
                }

                await app.Parks.findOrCreate({where: {parkId: parkData.parkId}, defaults: parkData});
                res.status(200).json({message: `park was added successfully.`});
            } catch (e) {
                res.status(400).json({error: e.message});
            }

        });
    router.route('/park/:id')
        .delete(async (req, res) => {
            const id = op.get(req.params, 'id');

            try {

                if (!id) throw new Error('Got no parkId!');

                if (!app.con) {
                    await app.sequelizeConnection();
                }

                const park = await app.Parks.findOne({where: {parkId: id}});
                await park.destroy();
                res.status(200).json({message: `park was deleted.`});
            } catch (e) {
                res.status(400).json({error: e.message});
            }

        });


};