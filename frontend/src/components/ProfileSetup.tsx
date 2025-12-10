import React, { useState, useEffect } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { User, Database } from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile } from '../backend';

interface ProfileSetupProps {
  existingProfile?: UserProfile | null;
}

export default function ProfileSetup({ existingProfile }: ProfileSetupProps) {
  const [name, setName] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  useEffect(() => {
    // If there's an existing profile with a name, pre-fill it
    if (existingProfile?.name) {
      setName(existingProfile.name);
    }
  }, [existingProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      const profileData: UserProfile = existingProfile
        ? {
            ...existingProfile,
            name: name.trim(),
            lastActive: BigInt(Date.now() * 1000000),
          }
        : {
            name: name.trim(),
            gamesPlayed: 0n,
            ballsCaught: 0n,
            superballsCaught: 0n,
            surpriseBallsCaught: 0n,
            deathBallsEncountered: 0n,
            icpRewards: 0n,
            lastActive: BigInt(Date.now() * 1000000),
          };

      await saveProfile.mutateAsync(profileData);
      toast.success('Profile saved to persistent storage!');
    } catch (error) {
      toast.error('Failed to save profile');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {existingProfile ? 'Complete Your Profile' : 'Welcome to Snake ICP!'}
          </CardTitle>
          <CardDescription className="space-y-1">
            <p>
              {existingProfile
                ? 'Please enter your name to continue playing'
                : "Let's set up your profile to get started"}
            </p>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-1">
              <Database className="w-3 h-3" />
              <span>Your data will be stored persistently</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                This name will be displayed on the leaderboard
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={saveProfile.isPending || !name.trim()}>
              {saveProfile.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Saving to Storage...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
