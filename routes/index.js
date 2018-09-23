import app from './app';
import park from './park';


export default (args) => {

    args.router = args.express.Router();

    app(args);
    park(args);

    args.app.use('/', args.router);
};
