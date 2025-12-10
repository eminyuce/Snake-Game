# Snake Game with ICP Rewards

## Overview
A 2D game where players control a snake to catch balls and earn ICP token rewards based on their progress through increasing difficulty levels.

## Authentication
- Internet Identity integration required for login
- Users must be authenticated to play the game and claim rewards
- All game features require authentication
- Profile name requirement: if a logged-in user does not have a profile name, they must be prompted immediately to enter a name before gameplay begins
- Profile name is stored persistently and used in leaderboards instead of principal ID

## Game Mechanics
- Real-time snake movement with keyboard directional controls on desktop using both arrow keys (Up, Down, Left, Right) and WASD keys (W, A, S, D)
- Touch controls for mobile devices with on-screen directional buttons (up, down, left, right)
- Swipe gesture support for mobile movement controls
- Input method detection to automatically hide on-screen controls when keyboard input is active and show them for touch devices
- Proper keyboard event handling for physical arrow keys and WASD keys on laptops and desktop devices
- Snake grows when eating balls
- Superball feature: occasionally spawn special superballs (1 out of every 10 regular ball spawns)
- When snake catches a superball, it grows three times faster than with normal balls
- Superballs are visually differentiated with glowing color or distinct size
- Surprise ball feature: enhanced spawn frequency with at least one surprise ball appearing in every 5 regular ball spawns
- Surprise ball spawn tracking system ensures guaranteed minimum frequency while maintaining randomness in timing and location
- Surprise balls displayed as question marks with expanded random effects:
  1. Change the snake's color to randomized vibrant palette for 60 seconds
  2. Double the snake's size with immediate visual growth effect
  3. Halve the snake's size with immediate visual shrinking effect
  4. Slow snake movement for 60 seconds
  5. Make the snake the smallest possible form
  6. Remove all walls from the game area if any exist
  7. Wall-eating mode: snake can pass through and consume walls to grow larger without gaining points
- Enhanced visual indicators and animations for surprise balls to improve player recognition
- Surprise effects include visually distinctive feedback with temporary color or glow changes
- Effect timers automatically reset behavior after expiration to maintain gameplay balance for timed effects (color change, slow movement, and wall-eating mode)
- Snake size changes (doubling and halving) apply immediately when surprise ball effects trigger
- Wall-eating mode allows snake to pass through walls and consume them for growth without point rewards
- Death ball feature: special balls displayed as "X" symbols with distinct color
- Death balls cause instant game over when touched by snake
- Death balls automatically despawn after 15 seconds if not caught
- Only one death ball appears at a time during normal gameplay
- Collision detection with walls causes game over (unless wall-eating mode is active)
- Timer system for balls - if timer expires, ball relocates to new position
- Balanced difficulty with reduced default wall count and optimized wall spawn algorithm for fair gameplay across skill levels
- Game over occurs when snake hits walls (unless wall-eating mode active), its own tail, or death balls
- Game Over panel with close button that immediately closes the panel and shows non-blocking "Saving progress..." message while data persists asynchronously in background
- Play score analytics (games played, balls caught, etc.) persist after Game Over panel closes and only reset when starting a new game session

## ICP Reward System
- Progressive reward structure:
  - 1st reward: after catching 10 balls
  - 2nd reward: after catching 11 more balls
  - 3rd reward: after catching 12 more balls
  - Each subsequent reward requires +1 additional ball
- Superball catches count normally toward ball count for reward progression
- Surprise ball catches count normally toward ball count for reward progression
- Death ball catches do not count toward reward progression (game ends immediately)
- Configurable ICP reward amount per achievement
- ICP rewards automatically sent to authenticated user's wallet
- Game over resets reward progress to zero
- Post-game ICP transfer functionality to send earned tokens to other ICP addresses

## Game Interface
- Real-time display of current score and balls caught
- Progress indicator showing balls needed for next ICP reward (e.g., "7/10 balls caught")
- ICP wallet balance display
- Reward notifications when ICP is earned
- Game over screen with restart option and ICP transfer interface
- ICP address input field for post-game transfers (only shown if balance > 0)
- Real-time display of number of online players currently active
- Profile name input prompt for users without a stored name (blocks gameplay until completed)
- Responsive design with device-appropriate UI panel sizes for optimal playability and visibility
- Mobile-optimized touch controls with on-screen directional buttons that automatically hide when keyboard input is detected
- Desktop keyboard controls with proper input method switching and arrow key/WASD event handling
- Enhanced visual feedback for surprise effects across mobile and desktop layouts
- Improved UI indicators and animations for more frequent surprise balls
- All content displayed in English
- Loading states displayed while fetching persistent profile analytics from storage

## Backend Data Storage
- User profiles with authentication via Internet Identity stored in Caffeine blob storage
- User profiles include required name field for display purposes and leaderboard identification
- Game statistics per user persistently stored in blob storage: games played, total balls caught, total superballs caught, total surprise balls caught, total death balls encountered, total ICP rewards earned, last active timestamp
- Reward history and progress tracking stored in blob storage
- Leaderboard data with rankings by rewards earned and balls caught stored in blob storage
- ICP reward configuration settings
- User wallet balances and transaction history stored in blob storage
- Active user session tracking for online player count

## Backend Operations
- User authentication and session management
- Profile name validation and storage for new users
- ICP token transfer processing to user wallets
- Game progress updates and reward calculations with automatic persistence to blob storage
- Superball catch tracking and statistics updates
- Surprise ball catch tracking and statistics updates
- Death ball encounter tracking and statistics updates
- Leaderboard ranking calculations and updates with blob storage persistence
- User statistics aggregation and real-time updates after each game with blob storage writes
- Reward amount configuration management
- Active session monitoring for online player tracking
- Profile data persistence functions (saveCallerUserProfile, updateGameStats) that write to and read from Caffeine blob storage
- Automatic profile data persistence after game completion for authenticated users

## Community Features
- Leaderboards displaying top players by:
  - Total ICP rewards earned
  - Total balls caught
- Leaderboard displays player profile name (required for all authenticated users)
- Player profile pages showing individual statistics and achievements loaded from persistent storage
- Community analytics displaying aggregate game metrics
- Player comparison and competition tracking

## Analytics Dashboard
- Total games played across all users
- Total balls caught globally
- Total superballs caught globally
- Total surprise balls caught globally
- Total death balls encountered globally
- Total ICP rewards distributed
- Individual player performance metrics loaded from persistent storage
- Achievement tracking and display

## Data Persistence Requirements
- All user profile analytics must be stored in Caffeine blob storage for persistence across sessions
- Profile names must be stored persistently and required for all authenticated users
- Profile data must automatically synchronize with blob storage after each game completion
- Frontend components must handle loading states while fetching persistent data from storage
- Profile data must persist through page refreshes and session restarts
- Backend functions must ensure all profile updates are written to blob storage immediately
- Superball, surprise ball, and death ball statistics must be persisted in player profiles for analytics tracking
