import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, LeaderboardEntry, RewardConfig } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // Fetching from persistent blob storage
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: 0, // Always fetch fresh data from storage
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      // Saving to persistent blob storage
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      // Invalidate to refetch from persistent storage
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useUpdateGameStats() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ballsCaught, 
      superballsCaught, 
      surpriseBallsCaught, 
      deathBallsEncountered, 
      icpRewards 
    }: { 
      ballsCaught: bigint; 
      superballsCaught: bigint; 
      surpriseBallsCaught: bigint; 
      deathBallsEncountered: bigint; 
      icpRewards: bigint 
    }) => {
      if (!actor) throw new Error('Actor not available');
      // Updating stats in persistent blob storage
      return actor.updateGameStats(ballsCaught, superballsCaught, surpriseBallsCaught, deathBallsEncountered, icpRewards);
    },
    onSuccess: () => {
      // Invalidate both profile and leaderboard to reflect updated stats from storage
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useGetUserProfile(principal: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', principal],
    queryFn: async () => {
      if (!actor || !principal) return null;
      // Fetching from persistent blob storage
      const principalObj = await import('@dfinity/principal').then(m => m.Principal.fromText(principal));
      return actor.getUserProfile(principalObj);
    },
    enabled: !!actor && !isFetching && !!principal,
    staleTime: 0, // Always fetch fresh data from storage
  });
}

export function useGetLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      if (!actor) return [];
      // Fetching from persistent blob storage
      return actor.getLeaderboard();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useGetRewardConfig() {
  const { actor, isFetching } = useActor();

  return useQuery<RewardConfig>({
    queryKey: ['rewardConfig'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getRewardConfig();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60000, // Cache for 1 minute
  });
}

export function usePlayerLoggedIn() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.playerLoggedIn();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlinePlayerCount'] });
    },
  });
}

export function usePlayerLoggedOut() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.playerLoggedOut();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlinePlayerCount'] });
    },
  });
}

export function useGetOnlinePlayerCount() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['onlinePlayerCount'],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getOnlinePlayerCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
