import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { User, Trophy, Target, Coins, Calendar, Database } from 'lucide-react';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import type { UserProfile } from '../backend';

interface PlayerProfileProps {
  userProfile: UserProfile | null;
}

export default function PlayerProfile({ userProfile: initialProfile }: PlayerProfileProps) {
  // Refetch profile to ensure we have latest data from persistent storage
  const { data: userProfile, isLoading, isFetching } = useGetCallerUserProfile();

  // Use the fetched profile or fall back to initial profile
  const profile = userProfile ?? initialProfile;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-2 md:px-0">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 md:gap-4">
              <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Profile not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastActive = new Date(Number(profile.lastActive) / 1000000);

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-2 md:px-0">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl">{profile.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1 text-xs md:text-sm">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                  Last active: {lastActive.toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
            {isFetching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="w-4 h-4 animate-pulse" />
                <span className="hidden md:inline">Syncing...</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-medium">Games Played</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{Number(profile.gamesPlayed)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-medium">Total Balls Caught</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{Number(profile.ballsCaught)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Coins className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-medium">Total ICP Earned</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{Number(profile.icpRewards)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl">Achievements</CardTitle>
              <CardDescription className="text-xs md:text-sm">Your gaming milestones</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1 text-xs">
              <Database className="w-3 h-3" />
              Persistent Storage
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {Number(profile.gamesPlayed) >= 1 && (
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-accent/10 border border-accent/20">
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-accent flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm md:text-base">First Game</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Played your first game</p>
                </div>
              </div>
            )}
            {Number(profile.ballsCaught) >= 10 && (
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Target className="w-6 h-6 md:w-8 md:h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm md:text-base">Ball Hunter</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Caught 10+ balls</p>
                </div>
              </div>
            )}
            {Number(profile.icpRewards) >= 1 && (
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-accent/10 border border-accent/20">
                <Coins className="w-6 h-6 md:w-8 md:h-8 text-accent flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm md:text-base">First Reward</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Earned your first ICP</p>
                </div>
              </div>
            )}
            {Number(profile.gamesPlayed) >= 10 && (
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm md:text-base">Dedicated Player</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Played 10+ games</p>
                </div>
              </div>
            )}
          </div>
          {Number(profile.gamesPlayed) === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">Play games to unlock achievements!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
