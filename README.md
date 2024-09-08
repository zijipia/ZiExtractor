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
const { ZiExtractor } = require('ziextractor');
```

3. Register ZiExtractor with your player:

```js
player.extractors.register(ZiExtractor, {});
```

4. Disable youtube

```js
player.extractors.loadDefault(ext => ext !== 'YouTubeExtractor');
```

## Important Notes

- Exercise caution while using ZiExtractor as it's still under development.
- Ensure you have the necessary permissions to extract audio from the intended sources.

---

---

# ZiVoiceExtractor:

## About

ZiVoiceExtractor is a powerful voice extraction and speech recognition tool designed for use with Discord bots. It allows you to capture voice input from users in voice channels and convert it to text using Google's Speech-to-Text API.

## Getting Started

### Initializing ZiVoiceExtractor

First, import the necessary components:

```js
const { ZiVoiceExtractor, useZiVoiceExtractor } = require('zivoiceextractor');
```

Then, initialize the extractor with your Discord player instance and speech options:

```js
const speechOptions = {
  ignoreBots: true,
  minimalVoiceMessageDuration: 1,
  lang: 'en-US', // Set your preferred language
  key: 'YOUR_GOOGLE_SPEECH_API_KEY', // Optional: Provide your own API key
  profanityFilter: false, // Optional: Enable/disable profanity filter
};
const voiceExtractor = useZiVoiceExtractor(speechOptions);
```

### Handling Voice Input

To start processing voice input, you need to call the `handleSpeakingEvent` method when a user joins a voice channel:

which discord-player:

```js
player.events.on('connection', async queue => {
  const { player, connection } = queue;
  const ziVoice = useZiVoiceExtractor();

  ziVoice.handleSpeakingEvent(player.client, connection);
});
```

which discord:
joinVoiceChannel command:

```js
const voiceChannel = interaction.member?.voice.channel;
if (voiceChannel) {
  joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });
}
```

voiceStateUpdate:

```js
client.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.channel && newState.channel.type === 'voice') {
    const ziVoice = useZiVoiceExtractor();
    ziVoice.handleSpeakingEvent(client, newState);
  }
});
```

### Handling Voice Output

To handle voice output, you can listen for the 'voiceCreate' event:

```js
voiceExtractor.on('voiceCreate', async ({ content, user, channel, client }) => {
  console.log(`User ${user.username} said: ${content}`);
  // Handle the recognized speech here
});
```

### Debugging

ZiVoiceExtractor provides debug information. You can listen to the 'debug' event for detailed logs:

```js
voiceExtractor.on('debug', message => {
  console.log(`[ZiVoiceExtractor Debug] ${message}`);
});
```

## Configuration Options

When initializing ZiVoiceExtractor, you can provide the following options:

- `ignoreBots`: (boolean) Whether to ignore voice input from bots.
- `minimalVoiceMessageDuration`: (number) Minimum duration of voice input to process (in seconds).
- `focusUser`: (string) The user ID to focus on.
- `lang`: (string) The language code for speech recognition (e.g., 'en-US', 'fr-FR').
- `key`: (string) Your Google Speech API key (optional).
- `profanityFilter`: (boolean) Whether to enable the profanity filter.

## Notes

- Ensure you have the necessary permissions to use voice features in your Discord bot.
- The Google Speech API key is optional but recommended for production use to avoid rate limiting.
- This extractor works best with clear audio input and may have difficulty with background noise or low-quality microphones.

# Support

For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/zijipia/ZiExtractor). [Discord](https://discord.gg/HPBWtDswfE)
