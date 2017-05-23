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

	let recv = stanza.getChildText('body');

  if (recv) {

    let stanza = new Client.Stanza(
      'message', {
        to: ACCOUNTS.OWNER,
        type: 'chat'
      }
    )
    .c('body')
    .t('RECEIVED MESSAGE:\n' + recv);

    client.send(stanza);

    try {
      recv = JSON.parse(recv);
    } catch (ex) {
      return;
    }

    if (recv.hasOwnProperty('contacts') && recv.hasOwnProperty('pollTitle')
      && recv.hasOwnProperty('creator')) {
      for (let contact of recv.contacts) {

        stanza = new Client.Stanza(
          'message', {
            to: contact,
            type: 'chat'
          }
        )
        .c('body')
        .t('Nueva encuesta disponible de ' + recv.creator + ': ' + recv.pollTitle);

        client.send(stanza);
        console.log('Encuesta ' + recv.pollTitle + ' enviada a ' + contact);
      }
    }
  }

})
