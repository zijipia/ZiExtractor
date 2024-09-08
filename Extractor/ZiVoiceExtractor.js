const { EventEmitter } = require('events');
const { Transform } = require('stream');
const prism = require('prism-media');
const axios = require('axios');

class PcmStream extends Transform {
  constructor(options) {
    super(options);
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const fittingChunkSize = Math.floor(this.buffer.length / 2) * 2;
    if (fittingChunkSize > 0) {
      this.push(this.buffer.slice(0, fittingChunkSize));
      this.buffer = this.buffer.slice(fittingChunkSize);
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }
    callback();
  }
}

class ZiVoiceExtractor extends EventEmitter {
  constructor(speechOptions = {}) {
    super();
    this.speechOptions = {
      ignoreBots: true,
      focusUser: '',
      minimalVoiceMessageDuration: 1,
      lang: 'vi-VN',
      ...speechOptions,
    };
  }

  debug(message) {
    this.emit('debug', message);
  }

  handleSpeakingEvent(client, connection, options) {
    this.debug('handle Speaking Event ');
    connection.receiver.speaking.on('start', userId => {
      this.debug(`User ${userId} is speaking`);
      const user = client.users.cache.get(userId);
      if (!user || (this.speechOptions.ignoreBots && user.bot)) {
        this.debug(`User ${userId} is a bot`);
        return;
      }
      if (this.speechOptions.focusUser && userId !== this.speechOptions.focusUser) {
        this.debug(`User ${userId} is not in focus`);
        return;
      }

      const opusStream = connection.receiver.subscribe(userId, {
        end: {
          /**
            * The stream will only end when manually destroyed.
            Manual: 0,
            * The stream will end after a given time period of silence/no audio packets.
            AfterSilence: 1,
            * The stream will end after a given time period of no audio packets.
            AfterInactivity: 2,
            */
          behavior: 1,
          duration: 300,
        },
      });

      const bufferData = [];
      opusStream
        .pipe(new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 }))
        .pipe(new PcmStream())
        .on('data', data => bufferData.push(data))
        .on('end', () => this.processVoiceCommand(client, bufferData, user, connection, options));
    });
  }

  async processVoiceCommand(client, bufferData, user, connection, options) {
    const pcmBuffer = Buffer.concat(bufferData);
    const duration = pcmBuffer.length / 48000 / 4;

    if (!this.checkAudioQuality(pcmBuffer)) {
      this.debug('Audio quality is too low');
      return;
    }

    try {
      const content = await this.resolveSpeechWithGoogleSpeechV2(pcmBuffer, options);
      if (!content) {
        this.debug('Unable to recognize speech or user is silent');
        return;
      }
      const channel = client.channels.cache.get(connection.joinConfig.channelId);
      if (!channel || !channel.isVoiceBased()) return;

      this.emit('voiceCreate', {
        content,
        user,
        channel,
        client,
      });
    } catch (error) {
      this.debug(`Error processing voice command: ${error.message}`);
    }
  }

  checkAudioQuality(pcmBuffer) {
    const int16Array = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
    const rms = Math.sqrt(int16Array.reduce((sum, sample) => sum + sample * sample, 0) / int16Array.length);
    this.debug(`Audio quality (RMS): ${rms}`);
    return rms > 500;
  }

  async resolveSpeechWithGoogleSpeechV2(audioBuffer, options) {
    const key = options.key || 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw';
    const lang = options.lang || 'vi-VN';
    const profanityFilter = options.profanityFilter ? '1' : '0';

    const monoBuffer = this.convertStereoToMono(audioBuffer);

    this.debug(`Audio information sent to API:
    - Size: ${monoBuffer.length}
    - First 10 values: ${monoBuffer.slice(0, 20).toString('hex')}`);

    try {
      const response = await axios({
        url: `https://www.google.com/speech-api/v2/recognize?output=json&lang=${lang}&key=${key}&pFilter=${profanityFilter}`,
        headers: { 'Content-Type': 'audio/l16; rate=48000; channels=1' },
        method: 'POST',
        data: monoBuffer,
        transformResponse: [
          data => {
            this.debug(`Raw data from API: ${data}`);
            if (!data || data.trim() === '') {
              throw new Error('Empty response from API');
            }
            const jsonObjects = data.split('\n').filter(line => line.trim() !== '');
            const lastJsonObject = jsonObjects[jsonObjects.length - 1];
            return JSON.parse(lastJsonObject);
          },
        ],
      });

      this.debug(`Processed response: ${JSON.stringify(response.data, null, 2)}`);

      if (!response.data || !response.data.result || response.data.result.length === 0) {
        this.debug(`No speech recognition results. Response data: ${JSON.stringify(response.data)}`);
        return '';
      }
      return response.data.result[0].alternative[0].transcript;
    } catch (error) {
      this.debug(`Error calling Google Speech API: ${error.message}`);
      if (error.response) {
        this.debug(`Error data: ${JSON.stringify(error.response.data)}
        Status: ${error.response.status}
        Headers: ${JSON.stringify(error.response.headers)}`);
      }
      return '';
    }
  }

  convertStereoToMono(stereoBuffer) {
    const stereoData = new Int16Array(stereoBuffer.buffer, stereoBuffer.byteOffset, stereoBuffer.length / 2);
    const monoData = new Int16Array(stereoData.length / 2);
    for (let i = 0; i < monoData.length; i++) {
      monoData[i] = Math.round((stereoData[i * 2] + stereoData[i * 2 + 1]) / 2);
    }
    return Buffer.from(monoData.buffer);
  }
}

// Create closure to store instance
const useZiVoiceExtractor = (() => {
  let instance = null;

  return speechOptions => {
    if (!instance) {
      if (speechOptions) {
        instance = new ZiVoiceExtractor(speechOptions);
      } else {
        throw new Error(
          'ZiVoiceExtractor has not been initialized. Please provide speechOptions when calling for the first time.'
        );
      }
    }
    return instance;
  };
})();

module.exports = { ZiVoiceExtractor, useZiVoiceExtractor };
