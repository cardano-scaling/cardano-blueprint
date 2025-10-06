use std::collections::BTreeMap;
use pallas_codec::{minicbor, utils::AnyCbor};
use pallas_primitives::{conway::{
    Anchor, Constitution, DRep, GovActionId, StakeCredential
  }, AddrKeyhash, Coin, Epoch, Hash, Nullable, PoolMetadata, Relay, RewardAccount, Set, TransactionInput, UnitInterval, VrfKeyhash};

pub type PoolId = Hash<28>;

// NOTE: esssentially any `AnyCbor` here should be considered a TODO to find suitable types to substitute in

#[derive(minicbor::Decode)]
pub struct TestVector {
  #[n(0)]
  pub initial_state: NodeState,
  #[n(1)]
  pub final_state: NodeState,
  #[n(2)]
  pub transactions: AnyCbor,
  #[n(3)]
  pub test_metadata: AnyCbor,
}

#[derive(minicbor::Decode)]
pub struct NodeState {
  #[n(0)]
  pub epoch: u64,
  #[n(1)]
  pub previous_blocks_made: BTreeMap<PoolId, u64>,
  #[n(2)]
  pub current_blocks_made: BTreeMap<PoolId, u64>,
  #[n(3)]
  pub epoch_state: EpochState,
  #[n(4)]
  pub pulsing_reward_update: AnyCbor,
  #[n(5)]
  pub pool_distribution: AnyCbor,
  #[n(6)]
  pub stashed_avvm_addresses: AnyCbor,
}

#[derive(minicbor::Decode)]
pub struct EpochState {
  #[n(0)]
  pub account_state: AccountState,
  #[n(1)]
  pub ledger_state: LedgerState,
  #[n(2)]
  pub snapshots: AnyCbor,
  #[n(3)]
  pub non_myopic: AnyCbor,
}

#[derive(minicbor::Decode)]
pub struct AccountState {
  #[n(0)]
  pub treasury: AnyCbor,
  #[n(1)]
  pub reserves: AnyCbor,
}

#[derive(minicbor::Decode)]
pub struct LedgerState {
  #[n(0)]
  pub cert_state: CertState,
  #[n(1)]
  pub utxo_state: UTxOState,
}

#[derive(minicbor::Decode)]
pub struct CertState {
  #[n(0)]
  pub voting_state: VotingState,
  #[n(1)]
  pub pool_state: AnyCbor, //PoolState,
  #[n(2)]
  pub delegation_state: AnyCbor, //DelegationState,
}

#[derive(minicbor::Decode)]
pub struct VotingState {
  #[n(0)]
  pub drep_state: BTreeMap<StakeCredential, DRepState>,
  #[n(1)]
  pub cc_state: BTreeMap<StakeCredential, CCState>,
  #[n(2)]
  pub dormant_epoch: u64,
}

#[derive(minicbor::Decode)]
pub struct DRepState {
  #[n(0)]
  pub expiry: u64,
  #[n(1)]
  pub anchor: AnyCbor, // Option<Anchor>,
  #[n(2)]
  pub deposit: u64,
  #[n(3)]
  pub delegators: AnyCbor, // Set<StakeCredential>
}

#[derive(minicbor::Decode)]
pub enum CCState {
  #[n(0)]
  DelegatedToHotCredential(#[n(0)] AnyCbor),
  #[n(1)]
  Resigned(#[n(0)] Option<Anchor>),
}

#[derive(minicbor::Decode)]
struct PoolState {
  #[n(0)]
  pools: BTreeMap<PoolId, AnyCbor>,
  #[n(1)]
  updates: BTreeMap<PoolId, AnyCbor>,
  #[n(2)]
  retirements: BTreeMap<PoolId, Epoch>,
  #[n(3)]
  deposits: BTreeMap<PoolId, u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PoolParams {
  pub id: PoolId,
  pub vrf: VrfKeyhash,
  pub pledge: Coin,
  pub cost: Coin,
  pub margin: UnitInterval,
  pub reward_account: RewardAccount,
  pub owners: Set<AddrKeyhash>,
  pub relays: Vec<Relay>,
  pub metadata: Nullable<PoolMetadata>,
}

#[derive(minicbor::Decode)]
pub struct DelegationState {
  #[n(0)]
  unified: DelegationUnifiedState,
  #[n(1)]
  future_genisis_delegates: AnyCbor,
  #[n(2)]
  genisis_delegates: AnyCbor,
  #[n(3)]
  immediate_rewards: AnyCbor,
}
#[derive(minicbor::Decode)]
pub struct DelegationUnifiedState {
  #[n(0)]
  accounts: BTreeMap<StakeCredential, Account>,
  #[n(1)]
  pointers: BTreeMap<StakeCredential, u64>, // TODO
}
#[derive(Debug, minicbor::Decode)]
pub struct Account {
  #[n(0)]
  pub rewards_and_deposit: Option<(u64, u64)>,
  #[n(1)]
  pub pointers: Set<(u64, u64, u64)>,
  #[n(2)]
  pub pool: Option<PoolId>,
  #[n(3)]
  pub drep: Option<DRep>,
}

#[derive(minicbor::Decode)]
pub struct UTxOState {
  #[n(0)]
  pub utxo: BTreeMap<TransactionInput, AnyCbor>,
  #[n(1)]
  pub deposited: u64,
  #[n(2)]
  pub fees: i64,
  #[n(3)]
  pub governance: AnyCbor,
  #[n(4)]
  pub instant_stake_distribution: InstantStake,
  #[n(5)]
  pub pending_donations: AnyCbor,
}

#[derive(minicbor::Decode)]
pub struct InstantStake {
  #[n(0)]
  pub credential_stake: BTreeMap<StakeCredential, u64>,
  #[n(1)]
  pub pointer_stake: BTreeMap<AnyCbor, u64>,
}


#[cfg(test)]
mod tests {
  use std::fs;
  use flate2::read::GzDecoder;
  use tar::Archive;

  use super::*;
  #[test]
  fn can_parse_all() {
    let path = "data/v10/vectors.tar.gz";

    let tar_gz = fs::File::open(path).expect("must open tar.gz file");
    let tar = GzDecoder::new(tar_gz);
    let mut archive = Archive::new(tar);

    let mut failures = vec![];
    for entry in archive.entries().expect("must read archive entries") {
      let mut entry = entry.expect("must read entry");
      let entry_path = entry.path().expect("must get entry path").to_path_buf();

      // Skip directories
      if !entry.header().entry_type().is_file() {
        continue;
      }

      // Skip pparams-by-hash files
      if entry_path.ancestors().any(|p| p.ends_with("pparams-by-hash")) {
        continue;
      }

      let mut bytes = Vec::new();
      std::io::Read::read_to_end(&mut entry, &mut bytes).expect("must read entry");

      // TODO: Some test cases are no-ops, and the node state (at byte offset 1) gets serialized as an empty array
      // We should remove these from the test vectors, but for now we're just skipping them
      if bytes[1] == 0x80 {
        continue;
      }

      let case = minicbor::decode::<TestVector>(&bytes);
      if case.is_ok() {
        println!("Test case '{:?}' parses.", entry_path);
      } else {
        failures.push(entry_path.to_str().unwrap().to_string());
        println!("Test case '{:?}' fails to parse: {:?}", entry_path, case.err().unwrap());
      }
    }
    if failures.len() > 0 {
      println!("Recap:");
      for case in failures {
        println!("{:?} failed to parse.", case);
      }
      assert!(false);
    }
  }
}
