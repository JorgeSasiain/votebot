import { ACCOUNTS } from './credentials.js';
import StanzaHandlers from './stanzaHandlers.js';

const Client = require('node-xmpp-client');

const client = new Client({
  jid: ACCOUNTS.BOT_JID,
  password: ACCOUNTS.BOT_PASS,
  preferredSaslMechanism: 'DIGEST-MD5'
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

})

/* When bot receives a message */
client.on('stanza', function(stanza) {

	let body = stanza.getChildText('body');

  if (body) {

    let stanza = new Client.Stanza(
      'message', {
        to: ACCOUNTS.OWNER,
        type: 'chat'
      }
    )
    .c('body')
    .t('RECEIVED MESSAGE:\n' + body);

    client.send(stanza);

    try {

      /* JSON */
      body = JSON.parse(body);
      if (body.hasOwnProperty('type')) handleStanza(client, body);

    } catch (ex) {

      /* Not JSON */
      return;

    }

  }

})

function handleStanza(client, body) {

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
