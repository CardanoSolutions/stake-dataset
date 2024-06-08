import assert from 'node:assert';
import * as fs from 'node:fs';
import JSONBig from '@cardanosolutions/json-bigint';

const FROM = 208;
const TO = 480;

const $ = JSONBig({ useNativeBigInt: true });

for (let i = FROM; i <= TO; i += 1) {
  const rewardsProvenance = $.parse(fs.readFileSync(`../raw/queryLedgerState/rewardsProvenance/${i}.json`));
  const stakePools = rewardsProvenance.stakePools;

  let activeStake = 0n;
  let pools = [];
  for (let poolId in stakePools) {
    const stake = stakePools[poolId].stake.ada.lovelace;
    activeStake += stake instanceof BigInt ? stake : BigInt(stake);
    pools.push(stakePools[poolId]);
  }

  rewardsProvenance.totalRewards = rewardsProvenance.totalRewardsInEpoch;
  delete rewardsProvenance.totalRewardsInEpoch;

  rewardsProvenance.totalStake = rewardsProvenance.activeStakeInEpoch;
  delete rewardsProvenance.activeStakeInEpoch;

  rewardsProvenance.activeStake = { ada: { lovelace: activeStake } };

  rewardsProvenance.stakePools = pools;

  fs.writeFileSync(`../data/mainnet/${i}.json`, $.stringify(rewardsProvenance, null, 2));
}
