# Cardano Stake Dataset

## Overview

This repository contains a dataset extracted from a cardano-node sychronizing to the **mainnet** network tracking stake distribution across stake pools as well as their parameters and approximate performances. Each dataset was taken at the beginning of each epoch from epoch 208 onwards. Said differently, it tracks historical data all the way from the beginning of the Shelley era.

Each file is named after the epoch it was extracted from (e.g. `314.json` for the epoch 314).

### Fields

- `desiredNumberOfStakePools`: the number of stake pools that the network currently consider as 'optimal'. This is also known as the `k`-parameter.

- `stakePoolPledgeInfluence`: the influence of the pool's owner pledge on the rewards. This is also known as `a0`.

- `totalRewards.ada.lovelace`: the total amount rewards available for the epoch, generated from the previous epoch.

- `totalStake.ada.lovelace`: the amount of lovelace available for staking in the epoch. Said differently, it's the circulating supply of Ada minus the treasury.

- `activeStake.ada.lovelace`: the amount of lovelace delegated to stake pools and actively participating in the consensus (i.e. elligible for rewards).

- `stakePools`: a list of datapoints for each stake pools as a key/value object mapping stake pool ids to the following fields.

#### `stakePools` fields

- `id`: the pool's identifier, bech32-encoded.

- `stake.ada.lovelace`: the pool's absolute stake in the epoch.

- `ownerStake.ada.lovelace`: the pool's owner own stake.

- `approximatePerformance`: an indicator of how well the pool is performing (comparing its actually produced blocks in past epochs vs the expectations according to its stake).

- `parameters.cost.ada.lovelace`: the pool's fixed cost.

- `parameters.margin`: the pool's margin as a ratio of two integers.

- `parameters.pledge.ada.lovelace`: the pool's declared pledge.

## How is the dataset constructed?

The raw dataset was obtained from [`Ogmios==v6.3.0`](https://ogmios.dev) and a [`cardano-node==8.9.3`](https://github.com/IntersectMBO/cardano-node) from a [rudimentary script](./scripts/fetch.mjs) fetching data at every epoch boundary while the node is synchronizing. Some fields are then renamed and the structure slightly adjusted through [another script](./scripts/adjust.mjs).

<p align="center">
  <img alt="CC BY-SA" src="https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/by-sa.svg" />
</p>
