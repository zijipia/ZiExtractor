# ZiExtractor:
## About 
ZiExtractor is a personal music extractor built for extracting audio from various sources. It's currently under development and might not be entirely stable. Please use it with caution.  
ZiExtractor draws inspiration from the [@discord-player/extractor](https://www.npmjs.com/package/@discord-player/extractor), providing a foundation for audio extraction.
## Getting Started
### Installation ZiExtractor
```bash
npm i ziextractor
```
### Integration
1. Locate the main file where you initialize your discord-player (e.g., index.js).
2. Import ZiExtractor from the ziextractor package:
```js
const { ZiExtractor } = require("ziextractor");
```
3. Register ZiExtractor with your player:
```js
player.extractors.register(ZiExtractor, {});
```
4. Disable youtube
```js
player.extractors.loadDefault((ext) => ext !== 'YouTubeExtractor');
```
## Important Notes
* Exercise caution while using ZiExtractor as it's still under development.
* Ensure you have the necessary permissions to extract audio from the intended sources.
## Recommendation: 
* In my opinion it works with [discord-player-youtubei](https://github.com/retrouser955/discord-player-youtubei)
* Use together with discord-player-youtubei to improve performance: [Ziji-bot-discord](https://github.com/zijipia/Ziji-bot-discord/blob/main/index.js#L19)
* Debug log with 2 package:
```
Searching https://www.youtube.com/watch?v=JNUHJE**** (link youtube has been hidden)
Search engine set to auto, fallback search engine set to autoSearch
Protocol https detected in query
Protocol https is supported by com.Ziji.discord-player.youtube-Zijiext extractor!
Query type identified as autoSearch but might not be used due to the presence of protocol
Executing metadata query using com.Ziji.discord-player.youtube-Zijiext extractor...
[Lag Monitor] Event loop latency: 14.564699999988079ms
Metadata query was successful!
Adding data to cache...
[AsyncQueue] Acquiring an entry...
[AsyncQueue] Entry 1271442968347152407 was acquired successfully!
[AsyncQueue] Waiting for the queue to resolve...
[AsyncQueue] Entry 1271442968347152407 was resolved!
Executing extractor com.retrouser955.discord-player.discord-player-youtubei...
Extractor com.retrouser955.discord-player.discord-player-youtubei executed successfully!
[AsyncQueue] Releasing an entry from the queue...
```
