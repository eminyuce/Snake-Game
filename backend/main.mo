import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Text "mo:core/Text";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize blob storage
  let storage = Storage.new();
  include MixinStorage(storage);

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    gamesPlayed : Nat;
    ballsCaught : Nat;
    superballsCaught : Nat;
    surpriseBallsCaught : Nat;
    deathBallsEncountered : Nat;
    icpRewards : Nat;
    lastActive : Time.Time;
  };

  var userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type GameStats = {
    gamesPlayed : Nat;
    ballsCaught : Nat;
    superballsCaught : Nat;
    surpriseBallsCaught : Nat;
    deathBallsEncountered : Nat;
    icpRewards : Nat;
    lastActive : Time.Time;
  };

  public type LeaderboardEntry = {
    principal : Principal;
    displayName : Text;
    ballsCaught : Nat;
    superballsCaught : Nat;
    surpriseBallsCaught : Nat;
    deathBallsEncountered : Nat;
    icpRewards : Nat;
  };

  public shared ({ caller }) func updateGameStats(ballsCaught : Nat, superballsCaught : Nat, surpriseBallsCaught : Nat, deathBallsEncountered : Nat, icpRewards : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update stats");
    };

    let currentProfile = userProfiles.get(caller);
    
    let updatedProfile = switch (currentProfile) {
      case null {
        {
          name = "";
          gamesPlayed = 1;
          ballsCaught;
          superballsCaught;
          surpriseBallsCaught;
          deathBallsEncountered;
          icpRewards;
          lastActive = Time.now();
        };
      };
      case (?profile) {
        {
          name = profile.name; // Preserve existing name
          gamesPlayed = profile.gamesPlayed + 1;
          ballsCaught = profile.ballsCaught + ballsCaught;
          superballsCaught = profile.superballsCaught + superballsCaught;
          surpriseBallsCaught = profile.surpriseBallsCaught + surpriseBallsCaught;
          deathBallsEncountered = profile.deathBallsEncountered + deathBallsEncountered;
          icpRewards = profile.icpRewards + icpRewards;
          lastActive = Time.now();
        };
      };
    };

    userProfiles.add(caller, updatedProfile);
  };

  // Leaderboard is publicly viewable (no authentication required)
  public query func getLeaderboard() : async [LeaderboardEntry] {
    let entries = userProfiles.entries().toArray();
    entries.map(
      func((principal, profile)) : LeaderboardEntry {
        {
          principal;
          displayName = if (profile.name == "") { principal.toText() } else {
            profile.name;
          };
          ballsCaught = profile.ballsCaught;
          superballsCaught = profile.superballsCaught;
          surpriseBallsCaught = profile.surpriseBallsCaught;
          deathBallsEncountered = profile.deathBallsEncountered;
          icpRewards = profile.icpRewards;
        };
      }
    );
  };

  public type RewardConfig = {
    ballsRequired : Nat;
    icpAmount : Nat;
  };

  var rewardConfig : RewardConfig = {
    ballsRequired = 10;
    icpAmount = 1;
  };

  public shared ({ caller }) func setRewardConfig(config : RewardConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set reward config");
    };
    rewardConfig := config;
  };

  // Reward config is publicly viewable (no authentication required)
  public query func getRewardConfig() : async RewardConfig {
    rewardConfig;
  };

  // Track online players
  var onlinePlayers = Map.empty<Principal, Time.Time>();

  public shared ({ caller }) func playerLoggedIn() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can log in");
    };
    onlinePlayers.add(caller, Time.now());
  };

  public shared ({ caller }) func playerLoggedOut() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can log out");
    };
    onlinePlayers.remove(caller);
  };

  // Online player count is publicly viewable (no authentication required)
  public query func getOnlinePlayerCount() : async Nat {
    onlinePlayers.size();
  };

  // Online players list is publicly viewable (no authentication required)
  public query func getOnlinePlayers() : async [Principal] {
    let entries = onlinePlayers.entries().toArray();
    entries.map(func((principal, _)) : Principal { principal });
  };

  // New type for surprise ball effect
  public type SurpriseEffect = {
    #doubleSize;
    #halfSize;
    #colorChange;
    #slowMovement;
    #smallestSize;
    #removeWalls;
    #wallEatingMode;
  };

  // Track surprise ball effects per player
  var surpriseEffects = Map.empty<Principal, SurpriseEffect>();

  public shared ({ caller }) func applySurpriseEffect(effect : SurpriseEffect) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can apply effects");
    };
    surpriseEffects.add(caller, effect);
  };

  public query ({ caller }) func getSurpriseEffect() : async ?SurpriseEffect {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get effects");
    };
    surpriseEffects.get(caller);
  };

  public shared ({ caller }) func clearSurpriseEffect() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear effects");
    };
    surpriseEffects.remove(caller);
  };

  // Track death ball encounters per player
  var deathBallEncounters = Map.empty<Principal, Nat>();

  public shared ({ caller }) func recordDeathBallEncounter() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record death ball encounters");
    };

    let currentCount = switch (deathBallEncounters.get(caller)) {
      case null { 1 };
      case (?count) { count + 1 };
    };

    deathBallEncounters.add(caller, currentCount);
  };

  public query ({ caller }) func getDeathBallEncounters() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get death ball encounters");
    };
    switch (deathBallEncounters.get(caller)) {
      case null { 0 };
      case (?count) { count };
    };
  };

  // Track active effects with expiration times
  public type ActiveEffect = {
    effect : SurpriseEffect;
    expiration : Time.Time;
  };

  var activeEffects = Map.empty<Principal, ActiveEffect>();

  public shared ({ caller }) func applyActiveEffect(effect : SurpriseEffect, duration : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can apply active effects");
    };

    let expiration = Time.now() + (duration * 1_000_000_000);
    activeEffects.add(caller, { effect; expiration });
  };

  public query ({ caller }) func getActiveEffect() : async ?ActiveEffect {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get active effects");
    };
    activeEffects.get(caller);
  };

  public shared ({ caller }) func clearActiveEffect() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear active effects");
    };
    activeEffects.remove(caller);
  };

  // Track death ball state
  public type DeathBallState = {
    isActive : Bool;
    spawnTime : Time.Time;
  };

  var deathBallState : ?DeathBallState = null;

  public shared ({ caller }) func spawnDeathBall() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can spawn death balls");
    };

    deathBallState := ?{
      isActive = true;
      spawnTime = Time.now();
    };
  };

  public shared ({ caller }) func despawnDeathBall() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can despawn death balls");
    };
    deathBallState := null;
  };

  public query ({ caller }) func getDeathBallState() : async ?DeathBallState {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get death ball state");
    };
    deathBallState;
  };
};
