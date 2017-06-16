import StanzaHandlers from './stanzaHandlers';
import CommandHandlers from './commandHandlers';

var ACCOUNTS = '';
try {
  ACCOUNTS = require('./credentials').ACCOUNTS;
} catch (ex) {
  ACCOUNTS = process.env.ACCOUNTS;
}

const Client = require('node-xmpp-client');

const client = new Client({
  jid: ACCOUNTS.BOT_JID,
  password: ACCOUNTS.BOT_PASS,
  preferredSaslMechanism: 'DIGEST-MD5'
});

const monitorTTLs = function() {
  console.log("Monitoring TTL of documents in the 'polls' collection...");
}

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

  setInterval(monitorTTLs, 60000);

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

function handleCommand(client, body, user) {

  /* Voting commands */
  if (new RegExp(/^[1-4]{1,4}$/).test(body)) {
    CommandHandlers.onVoteCommand(client, body);
    return;
  }

  /* Other commands */
  switch (body) {

    case 'l':
    case 'list':
    case 'listado':
      CommandHandlers.onListCommand(client, body);
      break;

    case 's':
    case 'select':
    case 'seleccionar':
      CommandHandlers.onSelectCommand(client, body);
      break;

    case 'd':
    case 'discard':
    case 'descartar':
      CommandHandlers.onDiscardCommand(client, body);
      break;

    default:
      CommandHandlers.onCommandError(client, body, user);
      break;
  }

}

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
