import { Server } from 'http';
import Express from 'express';
import Mongo from './mongo';
import StanzaHandlers from './stanzaHandlers';
import CommandHandlers from './commandHandlers';

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
const PORT = process.env.PORT || 3000;
const TIMER = 60000;

const Client = require('node-xmpp-client');

const client = new Client({
  jid: ACCOUNTS.BOT_JID,
  password: ACCOUNTS.BOT_PASS,
  preferredSaslMechanism: 'DIGEST-MD5'
});

/* Function to run every minute */
function monitorTTLs() {
  console.log("Monitoring TTL of documents in the 'polls' collection...");
  Mongo.getAboutToExpirePollsID(sendMessage);
}

/* Send notification to one or more users or to a groupchat */
function sendMessage(dests, type, body) {

}

/* Function to handle user commands */
function handleCommand(client, body, user) {

  /* Voting commands */
  if (new RegExp(/^[1-4]{1,4}$/).test(body)) {
    CommandHandlers.onVoteCommand(client, body, user);
    return;
  }

  /* Other commands */
  switch (body) {

    case 'l':
    case 'list':
    case 'listado':
      CommandHandlers.onListCommand(client, body, user);
      break;

    case 's':
    case 'select':
    case 'seleccionar':
      CommandHandlers.onSelectCommand(client, body, user);
      break;

    case 'd':
    case 'discard':
    case 'descartar':
      CommandHandlers.onDiscardCommand(client, body, user);
      break;

    case 'b':
    case 'a':
    case 'back':
    case 'atras':
      CommandHandlers.onChangeCommand(client, body, user);
      break;

    default:
      CommandHandlers.onCommandError(client, body, user);
      break;
  }

}

/* Function to handle other events */
function handleStanza(client, body, user) {

  switch (body.type) {

    case 'newPoll':
      if (assertProps(body, ['contacts', 'pollTitle', 'creator']))
        StanzaHandlers.onNewPoll(client, body);
      break;

    case 'newVote':
      if (assertProps(body, ['mucs', 'pollTitle', 'creator']))
        StanzaHandlers.onNewVote(client, body);
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
client.on('online', function(data) {

  let jid = data.jid;
  let onOnlineMessage =
    'Bot connected via votebot app: ' + jid.local + '@' + jid.domain + '/' + jid.resource;

  let stanza = new Client.Stanza(
    'message', {
      to: ACCOUNTS.OWNER,
      type: 'chat'
    }
  )
  .c('body')
  .t(onOnlineMessage);

  client.send('<presence/>');
  client.send(stanza);

});

/* When bot receives a message */
client.on('stanza', function(stanza) {

  let user = stanza.attrs.from;
	let body = stanza.getChildText('body');

  if (body) {

    /* Send echo to owner account */
    let stanza = new Client.Stanza(
      'message', {
        to: ACCOUNTS.OWNER,
        type: 'chat'
      }
    )
    .c('body')
    .t('RECEIVED MESSAGE:\n' + body);

    client.send(stanza);

    /* Handle commands */
    if (body.startsWith("/") || body.startsWith("*")) {
      handleCommand(client, body.substr(1), user);
      return;
    }

    /* Handle external stanzas */
    try {

      /* JSON */
      body = JSON.parse(body);
      if (body.hasOwnProperty('type')) handleStanza(client, body, user);

    } catch (ex) {

      /* Not JSON */
      return;

    }

  }

});
