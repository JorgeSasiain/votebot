import { Server } from 'http';
import Express from 'express';
import Mongo from './mongo';
import StanzaHandlers from './stanzaHandlers';
import CommandHandlers from './commandHandlers';
import Utils from './utils';

var ACCOUNTS = {};
try {
  ACCOUNTS = require('./credentials').ACCOUNTS;
} catch (ex) {
  ACCOUNTS.BOT_JID = process.env.BOT_JID;
  ACCOUNTS.BOT_PASS = process.env.BOT_PASS;
  ACCOUNTS.OWNER = process.env.OWNER;
}

const app = new Express();
const server = new Server(app);
const PORT = process.env.PORT || 3001;
const TIMER = 6000;//0

const Client = require('node-xmpp-client');

const bot = new Client({
  jid: ACCOUNTS.BOT_JID,
  password: ACCOUNTS.BOT_PASS,
  preferredSaslMechanism: 'DIGEST-MD5'
});

/* Function to run every minute */
function monitorTTLs() {
  console.log("Monitoring TTL of documents in the 'polls' collection...");
  Mongo.getAboutToExpirePollsID(onPollExpire);
}

/* Handle notifications to users or to groupchat and other operations when a poll expires*/
function onPollExpire(pollType, _id, title) {

  console.log("A poll is about to expire! - " + _id);

  if (pollType === "poll") {

    let pollOwner = "";
    let msg = 'Los resultados finales de tu encuesta "' + title +
    '" están disponibles en la página web!';

    let callback = function(pollOwner) {
      Utils.sendStanza(bot, ACCOUNTS.BOT_JID, pollOwner, 'chat', msg);
      Mongo.onPollExpire.deleteFromUsersAvailablePolls(_id);
    };

    Mongo.onPollExpire.notifyPollOwner(_id, callback);

  } else if (pollType === "vote") {

    let mucs = [];
    let msg = "La votación " + title + " ha terminado." ; // = getVoteResults()

    let callback = function(mucs) {
      Utils.joinMucs(bot, mucs);
      Utils.sendStanza(bot, ACCOUNTS.BOT_JID, mucs, 'groupchat', msg);
    };

    Mongo.onVoteExpire.notifyMucs(_id, callback);
  }

}

/* Function to handle user commands */
function handleCommand(bot, body, user, type) {

  /* Vote command */
  if (new RegExp(/^v [1-4]{1,4}$|^vote [1-4]{1,4}$|^votar [1-4]{1,4}$/).test(body)) {
    CommandHandlers.onVoteCommand(bot, ACCOUNTS.BOT_JID, body, user, type);
    return;
  }

  /* Select command */
  if (new RegExp(/^s [A-Za-z0-9]{5}$|^select [A-Za-z0-9]{5}$|^seleccionar [A-Za-z0-9]{5}$/)
    .test(body)) {
    CommandHandlers.onSelectCommand(bot, ACCOUNTS.BOT_JID, body, user, type);
    return;
  }

  /* Other commands */
  switch (body) {

    case 'h':
    case 'c':
    case 'help':
    case 'commands':
    case 'comandos':
      CommandHandlers.onHelpCommand(bot, ACCOUNTS.BOT_JID, body, user, type);
      break;

    case 'l':
    case 'list':
    case 'listado':
      CommandHandlers.onListCommand(bot, ACCOUNTS.BOT_JID, body, user, type);
      break;

    case 'd':
    case 'discard':
    case 'descartar':
      CommandHandlers.onDiscardCommand(bot, ACCOUNTS.BOT_JID, body, user, type);
      break;

    case 'b':
    case 'a':
    case 'back':
    case 'atras':
      CommandHandlers.onBackCommand(bot, ACCOUNTS.BOT_JID, body, user, type);
      break;

    default:
      CommandHandlers.onCommandError(bot, ACCOUNTS.BOT_JID, body, user, type);
      break;
  }

}

/* Function to handle other events */
function handleStanza(bot, body, user) {

  switch (body.type) {

    case 'newPoll':
      if (assertProps(body, ['contacts', 'pollTitle', 'creator']))
        StanzaHandlers.onNewPoll(bot, ACCOUNTS.BOT_JID, body);
      break;

    case 'newVote':
      if (assertProps(body, ['mucs', 'pollTitle', 'creator']))
        StanzaHandlers.onNewVote(bot, ACCOUNTS.BOT_JID, body);
      break;
  }

}

function assertProps(obj, props) {
  for (let prop of props) {
    if (!obj.hasOwnProperty(prop)) return false;
  }
  return true;
}

/* Start server */
server.listen(PORT, err => {
  if (err) return console.error(err);
  console.info("Server running on port " + PORT);
  setInterval(monitorTTLs, TIMER);
});

/* When server starts and bot connects */
bot.on('online', function(data) {

  let jid = data.jid;
  let onOnlineMessage =
    'Bot connected via votebot app: ' + jid.local + '@' + jid.domain + '/' + jid.resource;

  bot.send('<presence/>');
  Utils.sendStanza(bot, ACCOUNTS.BOT_JID, ACCOUNTS.OWNER, 'chat', onOnlineMessage);

});

/* When bot receives a message */
bot.on('stanza', function(stanza) {

  if (!stanza.is('message')) return;

  let type = stanza.attrs.type;
  let user = stanza.attrs.from;
	let body = stanza.getChildText('body');

  if (body) {

    /* Send echo to owner account */
    Utils.sendStanza(bot, ACCOUNTS.BOT_JID, ACCOUNTS.OWNER, 'chat', 'RECEIVED MESSAGE:\n' + body);

    /* Handle commands */
    if (body.startsWith("/") || body.startsWith("*")) {
      handleCommand(bot, body.substr(1), user, type);
      return;
    }

    /* Handle external stanzas */
    try {

      /* JSON */
      body = JSON.parse(body);
      if (body.hasOwnProperty('type')) handleStanza(bot, body, user);

    } catch (ex) {

      /* Not JSON */
      return;

    }

  }

});
