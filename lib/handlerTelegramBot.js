import op from 'object-path';
import moment from "moment";

const appStart = async (app, msg) => {

    if (!app.telegramBot.chatIds.includes(msg.chat.id)) app.telegramBot.chatIds.push(msg.chat.id);

    const match = msg.text.match(/\/app\/start (.+)/);

    let interval;

    if (match) {
        const args = op.get(match, '1');

        const argsJSON = JSON.parse('{"' + args.replace(/ /g, '", "').replace(/=/g, '": "') + '"}');

        interval = op.get(argsJSON, 'interval', 30);
    } else interval = 30;


    try {
        await app.startHandling(interval);
    } catch (e) {
        app.telegramBot.sendMessage(msg.chat.id, `error: ${e}`);
    }

    app.telegramBot.sendMessage(msg.chat.id, `parks list handling is started with interval: ${interval} minutes.`);

};

const appStop = (app, msg) => {

    const i = app.telegramBot.chatIds.indexOf(msg.chat.id);
    if (i > -1) app.telegramBot.chatIds.splice(i, 1);

    if (app.telegramBot.chatIds.length > 0) {
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

};

const appStatus = (app, msg) => {
    if (app.handlingInterval){
        app.telegramBot.sendMessage(msg.chat.id, `parks list handling is working: ${moment().diff(app.startTime, 'seconds')} seconds`);
    } else {
        app.telegramBot.sendMessage(msg.chat.id, `parks list handling is not working`);
    }
};

const parkAdd = (app, msg) => {
    app.telegramBot.sendMessage(msg.chat.id, `method "park add" is coming soon`);
};

const parkDelete = (app, msg) => {
    app.telegramBot.sendMessage(msg.chat.id, `method "park delete" is coming soon`);
};

export const onText = async (app, msg) => {

    if (msg.text.includes('/app/start')) return await appStart(app, msg);

    if (msg.text.includes('/app/stop')) return appStop(app, msg);

    if (msg.text.includes('/app/status')) return appStatus(app, msg);

    if (msg.text.includes('/park/add')) return parkAdd(app, msg);

    if (msg.text.includes('/park/delete'))  return parkDelete(app, msg);

    app.telegramBot.sendMessage(msg.chat.id, `I got something! "${msg.text}", but I have no handle for this`);

};