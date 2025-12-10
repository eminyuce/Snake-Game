import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trophy, Target, Coins, Send } from 'lucide-react';
import { toast } from 'sonner';

interface GameOverDialogProps {
  open: boolean;
  onClose: () => void;
  score: number;
  ballsCaught: number;
  icpEarned: number;
  onSaveStats?: () => Promise<void>;
}

export default function GameOverDialog({
  open,
  onClose,
  score,
  ballsCaught,
  icpEarned,
  onSaveStats,
}: GameOverDialogProps) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!recipientAddress.trim()) {
      toast.error('Please enter a recipient address');
      return;
    }

    setIsTransferring(true);
    try {
      // Simulate transfer - in real implementation, this would call backend
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(`Successfully transferred ${icpEarned} ICP!`);
      handleClose();
    } catch (error) {
      toast.error('Transfer failed. Please try again.');
      console.error(error);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleClose = () => {
    // Close dialog immediately
    setShowTransfer(false);
    setRecipientAddress('');
    setIsTransferring(false);
    onClose();

    // Save stats asynchronously in the background with non-blocking message
    if (onSaveStats && ballsCaught > 0) {
      toast.promise(
        onSaveStats(),
        {
          loading: 'Saving progress…',
          success: 'Game stats saved successfully!',
          error: 'Failed to save game stats',
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl text-center">Game Over!</DialogTitle>
          <DialogDescription className="text-center text-xs md:text-sm">
            Here's how you performed in this game
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="text-center space-y-1 md:space-y-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{score}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Score</p>
              </div>
            </div>
            <div className="text-center space-y-1 md:space-y-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{ballsCaught}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Balls</p>
              </div>
            </div>
            <div className="text-center space-y-1 md:space-y-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Coins className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{icpEarned}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">ICP</p>
              </div>
            </div>
          </div>

          {icpEarned > 0 && !showTransfer && (
            <Button
              onClick={() => setShowTransfer(true)}
              variant="outline"
              className="w-full gap-2 text-xs md:text-sm"
            >
              <Send className="w-3 h-3 md:w-4 md:h-4" />
              Transfer ICP to Another Address
            </Button>
          )}

          {showTransfer && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-xs md:text-sm">Recipient ICP Address</Label>
                <Input
                  id="recipient"
                  placeholder="Enter ICP address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="text-xs md:text-sm"
                />
              </div>
              <Button
                onClick={handleTransfer}
                disabled={isTransferring}
                className="w-full gap-2 text-xs md:text-sm"
              >
                {isTransferring ? (
                  <>
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 md:w-4 md:h-4" />
                    Transfer {icpEarned} ICP
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} variant="outline" className="w-full text-xs md:text-sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
