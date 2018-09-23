import op from 'object-path';
import moment from 'moment';

export default ({app, express, router}) => {

    router.route('/app/start')
        .get(async (req, res) => {
            const interval = op.get(req.query, 'interval');
            try {
                await app.startHandling(interval);
            } catch (e) {
                res.status(400).json({error: e});
            }

            res.status(200).json({
                message: `parks list handling is started with interval: ${interval} minutes.`
            });

        });

    router.route('/app/stop')
        .get(async (req, res) => {
            if (app.handlingInterval) {
                try {
                    clearInterval(app.handlingInterval);
                } catch (e) {
                    res.status(400).json({error: e});
                }
            } else {
                res.status(400).json({error: `parks list handling didn't started`});
            }

            res.status(200).json({
                message: `parks list handling is stopped. working time: ${moment().diff(app.startTime, 'seconds')} seconds`
            });

        });

};