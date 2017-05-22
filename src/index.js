import { ACCOUNTS } from './credentials.js';

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

  var stanza = new Client.Stanza(
    'message', {
      to: ACCOUNTS.OWNER,
      type: 'chat'
    }
  )
  .c('body')
  .t(onOnlineMessage);

  client.send(stanza);

})

/* When bot receives a message */
client.on('stanza', function(stanza) {

	let recv = stanza.getChildText('body');

  if (recv) {

    console.log('Mensaje recibido: ' + recv);

    let stanza = new Client.Stanza(
      'message', {
        to: ACCOUNTS.OWNER,
        type: 'chat'
      }
    )
    .c('body')
    .t('RECEIVED MESSAGE:\n' + recv);

    client.send(stanza);
  }

})
