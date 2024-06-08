import WebSocket from 'ws';
import fetch from 'node-fetch';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const HOST = '127.0.0.1:1337';
const HTTP_URL = `http://${HOST}`;
const WS_URL = `ws://${HOST}`;

let client;

let lastKnownEpoch;
let lastKnownTip;
let currentEra = 'byron';

const node = spawn('run-cardano-node', [ 'mainnet' ]);

process.on('exit', (code) => {
  console.log(`Last known epoch: ${lastKnownEpoch}`);
  console.log(`Last known tip: ${JSON.stringify(lastKnownTip)}`);
  console.log(`Current era: ${currentEra}`);
  if (client) { client.close(); }
  node.exit();
});

node.stdout.on('data', (data) => console.error(data.toString()));
node.stderr.on('data', (data) => console.error(data.toString()));

tick();

function tick(delay = 0) {
  setTimeout(async () => {
    const health = await fetch(`${HTTP_URL}/health`).then(x => x.json());

    if (health.currentEpoch == null || health.connectionStatus !== 'connected') {
      console.log('Awaiting for node to start...');
      return tick(1000);
    }

    let ready;
    if (!client) {
      client = new WebSocket(WS_URL);

      client.on('close', (e) => {
        console.log(`Connection closed with code: ${e}`);
        process.exit();
      });

      client.on('error', (e) => {
        console.log(e);
        process.exit(1);
      });

      ready = new Promise(resolve => {
        client.once('open', resolve);
      });
    } else {
      ready = Promise.resolve();
    }

    await ready;

    if (health.currentEpoch === lastKnownEpoch) { return tick(); }

    lastKnownEpoch = health.currentEpoch;
    lastKnownTip = health.lastKnownTip;
    currentEra = health.currentEra;

    if (currentEra === 'byron') {
      console.log(`Current era at epoch ${lastKnownEpoch} is still byron...`);
      tick();
    } else {
      console.log(`Acquire state for epoch ${lastKnownEpoch}`);
      client.once('message', onAcquired);
      rpc('acquireLedgerState', { point: lastKnownTip });
    }
  }, delay);
}

function rpc(method, params) {
  client.send(JSON.stringify({
    jsonrpc: '2.0',
    method,
    params,
  }));
}

function onAcquired(msg) {
  const { result, error } = JSON.parse(msg);

  if (error || result?.acquired !== 'ledgerState') {
    console.log(`Error while acquiring ledger state: ${JSON.stringify(error)}`);
    process.exit(1);
  }

  console.log(`Acquired ledger state at ${JSON.stringify(result)}`);

  let queries = [
    () => rpc('queryLedgerState/liveStakeDistribution'),
    () => rpc('queryLedgerState/rewardsProvenance'),
  ];

  let tasks = [];

  let count = queries.length;

  client.on('message', async function collect(msg) {
    const { result, method, error } = JSON.parse(msg)

    if (error) {
      console.log(`Error while fetching ${method}: ${JSON.stringify(error)}`);
      process.exit(1);
    }

    tasks.push(writeFile(`../raw/${method}/${lastKnownEpoch}.json`, JSON.stringify(result, null, 2)));

    count -= 1;

    if (count === 0) {
      client.off('message', collect);

      try {
        await Promise.all(tasks.concat(new Promise((resolve, reject) => {
          client.once('message', (msg) => {
            const { result, error } = JSON.parse(msg);
            if (error || result?.released !== 'ledgerState') {
              return reject(`Error while releasing ledger state: ${JSON.stringify(error)}`);
            }
            resolve();
          });

          rpc('releaseLedgerState');
        })));
      } catch (e) {
        console.log(e);
        process.exit(1);
      }

      tick();
    }
  });

  queries.forEach(send => send());
}
