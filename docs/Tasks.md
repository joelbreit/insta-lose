# Tasks

- [ ] Refactor: Waiting room/game/recap could all be the same page
- [ ] Refactor: address linting issues
- [ ] Architecture: audit for abandonded AWS resources
- [ ] (Bug: theme is playing on winner's device) - may just be cached old version of the game
- [ ] Music: show/scroll lyrics on the recap page

2025-12-26

TODO:
- [ ] UX: sound effects for card actions?
- [ ] UI: better indicator of when it's your turn
- [ ] UI: give tracks names rather than numbers
- [ ] UI: color-code recent turns actions

DONE:
- [x] UI: make peek, must-play-panic, steel, and stolen-from events more obvious
- [x] UI: remove gray background from player circle
- [x] UI: add Credits page
- [x] UI: move deck stack to center of player circle, remove discard stack, and make player circle even larger
- [x] UI: keep cards grayed out when not playable even when not a player's turn
- [x] UI: group and number players actions into turns on recent actions display
- [x] UI: show everyone when an insta-lose card is drawn
- [x] UI: show who players steal from
- [x] UI: better wording for recent actions display
- [x] Bug: next turn is sometimes the wrong player after an insta-lose is played
- [x] Bug: show/check order of next cards
- [x] UX: show instructions on host waiting room page
- [x] Music: chiller music
- [x] Bug: peak/peek spelling
- [x] Bug: remove insta-lose cards from deck when they eliminate a player
- [x] Bug: fix player circle positioning

December 2025

- [x] UI: on the host game screen, show a visualization of the deck and discard pile as stacks of cards
- [x] UI: replace all emojis with icons
- [x] Bug: URLs are being cached by browsers, so when you try to join a game, it sometimes goes to old game pages
- [x] Music: music should not be included at all on non-host screens
- [x] Music: host should loop through in-game tracks when unmuted in waiting/game screens
- [x] Music: track should advance to next track when switching from waiting room to game
- [x] UI: Clean up choose icon/color
  - [x] Pick random to start
  - [x] Make one button that when selected, brings up other options
  - [x] Add more icons and colors to choose from
  - [x] Lucid React Icons
- [x] UI: on the host game screen, show a visualization of all the players
- [x] UI: fit entire dashboard onto one host screen
- [x] UI: make it more clear when it is/is not your turn
- [x] Game: Don't show what cards people drew on the host screen, lol
- [x] UX: make game codes 4 characters long
- [x] UI: remove dashed red border from unplayable cards
- [x] Music: automatically play the theme when the game ends
- [x] UI: add footer to all pages
- [x] Music: make sure song doesn't play on player devices