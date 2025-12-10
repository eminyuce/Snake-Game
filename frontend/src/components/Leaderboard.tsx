import React, { useState } from 'react';
import { useGetLeaderboard } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Trophy, Target, Coins, Medal, Sparkles } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();
  const [sortBy, setSortBy] = useState<'rewards' | 'balls'>('rewards');

  if (isLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedLeaderboard = [...(leaderboard || [])].sort((a, b) => {
    if (sortBy === 'rewards') {
      return Number(b.icpRewards - a.icpRewards);
    }
    return Number(b.ballsCaught - a.ballsCaught);
  });

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />;
    return null;
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          Leaderboard
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">Top players ranked by performance</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'rewards' | 'balls')}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4 md:mb-6">
            <TabsTrigger value="rewards" className="gap-1 md:gap-2 text-xs md:text-sm">
              <Coins className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">By</span> ICP
            </TabsTrigger>
            <TabsTrigger value="balls" className="gap-1 md:gap-2 text-xs md:text-sm">
              <Target className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">By</span> Balls
            </TabsTrigger>
          </TabsList>
          <TabsContent value={sortBy} className="mt-0">
            {sortedLeaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm md:text-base">No players yet. Be the first to play!</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 md:w-16 text-xs md:text-sm">Rank</TableHead>
                      <TableHead className="text-xs md:text-sm">Player</TableHead>
                      <TableHead className="text-right text-xs md:text-sm">Balls</TableHead>
                      <TableHead className="text-right text-xs md:text-sm">ICP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLeaderboard.map((entry, index) => (
                      <TableRow key={entry.principal.toString()}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1 md:gap-2">
                            {getMedalIcon(index + 1) || <span className="text-xs md:text-sm">#{index + 1}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-[10px] md:text-sm truncate max-w-[120px] md:max-w-xs">
                            {entry.displayName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Badge variant="outline" className="text-[10px] md:text-xs">{Number(entry.ballsCaught)}</Badge>
                            {entry.superballsCaught > 0n && (
                              <Badge variant="secondary" className="text-[10px] md:text-xs gap-1">
                                <Sparkles className="w-2 h-2" />
                                {Number(entry.superballsCaught)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="default" className="text-[10px] md:text-xs">{Number(entry.icpRewards)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
