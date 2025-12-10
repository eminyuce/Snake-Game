import React, { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile, usePlayerLoggedIn, usePlayerLoggedOut } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import LoginButton from './components/LoginButton';
import ProfileSetup from './components/ProfileSetup';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import PlayerProfile from './components/PlayerProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Trophy, User, Gamepad2, Database } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetching: profileFetching, isFetched } = useGetCallerUserProfile();
  const playerLoggedIn = usePlayerLoggedIn();
  const playerLoggedOut = usePlayerLoggedOut();
  const [activeTab, setActiveTab] = useState('game');

  const isAuthenticated = !!identity;
  
  // Show profile setup if authenticated and either no profile exists OR profile exists but name is empty
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && (userProfile === null || (userProfile && (!userProfile.name || userProfile.name.trim() === '')));

  // Track online status
  useEffect(() => {
    if (isAuthenticated && userProfile && userProfile.name && userProfile.name.trim() !== '') {
      // Mark player as online when authenticated with valid profile
      playerLoggedIn.mutate();

      // Mark player as offline when leaving
      return () => {
        playerLoggedOut.mutate();
      };
    }
  }, [isAuthenticated, userProfile]);

  if (isInitializing || (isAuthenticated && profileLoading)) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-2">
              <p className="text-muted-foreground">Loading profile from persistent storage...</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Database className="w-4 h-4 animate-pulse" />
                <span>Fetching your data</span>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
          <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Snake ICP
                </h1>
              </div>
              <LoginButton />
            </div>
          </header>
          <main className="container mx-auto px-4 py-8 md:py-16">
            <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
              <div className="space-y-3 md:space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Play Snake, Earn ICP Rewards
                </h2>
                <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                  Control the snake, catch balls, and earn real ICP tokens as you progress through increasing difficulty levels.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12 px-4">
                <div className="p-4 md:p-6 rounded-xl bg-card border border-border/50 space-y-2 md:space-y-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                    <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg">Classic Gameplay</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Enjoy the timeless snake game with smooth controls and dynamic difficulty
                  </p>
                </div>
                <div className="p-4 md:p-6 rounded-xl bg-card border border-border/50 space-y-2 md:space-y-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto">
                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg">Earn ICP Rewards</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Progressive rewards system - catch more balls to earn more ICP tokens
                  </p>
                </div>
                <div className="p-4 md:p-6 rounded-xl bg-card border border-border/50 space-y-2 md:space-y-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                    <Database className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg">Persistent Stats</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Your progress is saved permanently in decentralized storage
                  </p>
                </div>
              </div>
              <div className="pt-6 md:pt-8">
                <LoginButton />
              </div>
            </div>
          </main>
          <footer className="border-t border-border/50 mt-12 md:mt-16 py-6 md:py-8">
            <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
              © 2025. Built with love using{' '}
              <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                caffeine.ai
              </a>
            </div>
          </footer>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  if (showProfileSetup) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ProfileSetup existingProfile={userProfile} />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Snake ICP
                </h1>
                {userProfile && (
                  <p className="text-[10px] md:text-xs text-muted-foreground">Welcome, {userProfile.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profileFetching && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Database className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
                  <span className="hidden md:inline">Syncing</span>
                </div>
              )}
              <LoginButton />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-2 md:px-4 py-4 md:py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="game" className="gap-1 md:gap-2 text-xs md:text-sm">
                <Gamepad2 className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Play</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1 md:gap-2 text-xs md:text-sm">
                <Trophy className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 md:gap-2 text-xs md:text-sm">
                <User className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="game" className="mt-0">
              <GameCanvas userProfile={userProfile ?? null} />
            </TabsContent>
            <TabsContent value="leaderboard" className="mt-0">
              <Leaderboard />
            </TabsContent>
            <TabsContent value="profile" className="mt-0">
              <PlayerProfile userProfile={userProfile ?? null} />
            </TabsContent>
          </Tabs>
        </main>
        <footer className="border-t border-border/50 mt-12 md:mt-16 py-6 md:py-8">
          <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
            © 2025. Built with love using{' '}
            <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              caffeine.ai
            </a>
          </div>
        </footer>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
