import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  type OldSurpriseEffect = {
    #doubleSize;
    #halfSize;
    #colorChange;
    #slowMovement;
    #smallestSize;
    #removeWalls;
  };

  type OldActiveEffect = {
    effect : OldSurpriseEffect;
    expiration : Time.Time;
  };

  type OldUserProfile = {
    name : Text;
    gamesPlayed : Nat;
    ballsCaught : Nat;
    superballsCaught : Nat;
    surpriseBallsCaught : Nat;
    deathBallsEncountered : Nat;
    icpRewards : Nat;
    lastActive : Time.Time;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, OldUserProfile>;
    surpriseEffects : Map.Map<Principal, OldSurpriseEffect>;
    activeEffects : Map.Map<Principal, OldActiveEffect>;
  };

  type NewSurpriseEffect = {
    #doubleSize;
    #halfSize;
    #colorChange;
    #slowMovement;
    #smallestSize;
    #removeWalls;
    #wallEatingMode;
  };

  type NewActiveEffect = {
    effect : NewSurpriseEffect;
    expiration : Time.Time;
  };

  type NewUserProfile = {
    name : Text;
    gamesPlayed : Nat;
    ballsCaught : Nat;
    superballsCaught : Nat;
    surpriseBallsCaught : Nat;
    deathBallsEncountered : Nat;
    icpRewards : Nat;
    lastActive : Time.Time;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, NewUserProfile>;
    surpriseEffects : Map.Map<Principal, NewSurpriseEffect>;
    activeEffects : Map.Map<Principal, NewActiveEffect>;
  };

  func convertSurpriseEffect(oldEffect : OldSurpriseEffect) : NewSurpriseEffect {
    switch (oldEffect) {
      case (#doubleSize) { #doubleSize };
      case (#halfSize) { #halfSize };
      case (#colorChange) { #colorChange };
      case (#slowMovement) { #slowMovement };
      case (#smallestSize) { #smallestSize };
      case (#removeWalls) { #removeWalls };
    };
  };

  func convertActiveEffect(oldEffect : OldActiveEffect) : NewActiveEffect {
    {
      effect = convertSurpriseEffect(oldEffect.effect);
      expiration = oldEffect.expiration;
    };
  };

  public func run(old : OldActor) : NewActor {
    let newUserProfiles = old.userProfiles.map<Principal, OldUserProfile, NewUserProfile>(
      func(_principal, oldProfile) {
        oldProfile;
      }
    );

    let newSurpriseEffects = old.surpriseEffects.map<Principal, OldSurpriseEffect, NewSurpriseEffect>(
      func(_principal, oldEffect) {
        convertSurpriseEffect(oldEffect);
      }
    );

    let newActiveEffects = old.activeEffects.map<Principal, OldActiveEffect, NewActiveEffect>(
      func(_principal, oldEffect) {
        convertActiveEffect(oldEffect);
      }
    );

    {
      userProfiles = newUserProfiles;
      surpriseEffects = newSurpriseEffects;
      activeEffects = newActiveEffects;
    };
  };
};
