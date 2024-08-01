# ZiExtractor:
## About 
ZiExtractor is a personal music extractor built for extracting audio from various sources. It's currently under development and might not be entirely stable. Please use it with caution.  
ZiExtractor draws inspiration from the [discord-player-youtubei](https://github.com/retrouser955/discord-player-youtubei), providing a foundation for audio extraction.
## Getting Started
### Installation ZiExtractor
```bash
npm i github:zijipia/ZiExtractor
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
4. disable youtube
```js
player.extractors.loadDefault((ext) => ext !== 'YouTubeExtractor');
```
## Important Notes
* Exercise caution while using ZiExtractor as it's still under development.
* Ensure you have the necessary permissions to extract audio from the intended sources.
* Respect copyright laws and terms of service when using this library.
